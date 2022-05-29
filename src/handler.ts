import * as core from '@actions/core';
import * as github from '@actions/github';
import * as fs from 'fs/promises';
import { WebClient } from '@slack/web-api';

import { findMetadata, postPullRequestInfo, updatePullRequestInfo, postChangeLog } from './notifier';

import type { PullRequestEvent, PullRequestReviewEvent } from '@octokit/webhooks-definitions/schema';
import type { Profile, Context, Event } from './types';

export async function createContext(): Promise<Context> {
    const token = core.getInput('token');
    const channel = core.getInput('channel');

    const file = await fs.readFile(core.getInput('path'), 'utf8');
    const accounts: { [login: string]: string; } = JSON.parse(file);
    const profiles: Profile[] = [];
    for (const login in accounts) {
        profiles.push(Object.freeze({ login, slack: accounts[login] }));
    }
    const repo = github.context.repo.repo;
    const owner = github.context.repo.owner;
    return {
        client: new WebClient(token),
        repository: Object.freeze({
            name: repo,
            html_url: `https://github.com/${owner}/${repo}`,
            owner: {
                html_url: `https://github.com/${owner}`,
                login: github.context.repo.owner,
            },
        }),
        channel,
        profiles,
    };    
}

// return original object, not copy.
export function getProfile(dictionary: Profile[], login: string): Profile {
    for (const profile of dictionary) {
        if (profile.login === login) {
            return profile;
        }
    }
    return { login };
} 

export function mergePullRequestEvent(cx: Context, payload: PullRequestEvent, origin?: Event): Event {
    // pull_request / closed, reopened, review_requested, review_request_removed
    const requested_reviewers = [];
    for (const reviewer of payload.pull_request.requested_reviewers) {
        const login = 'login' in reviewer ? reviewer.login : reviewer.name; // User.login or Team.name
        const origin_reviewer = origin ? getProfile(origin.pull_request.requested_reviewers, login) : { approved: false };
        requested_reviewers.push({ ...getProfile(cx.profiles, login), approved: origin_reviewer.approved });
    }
    const user = getProfile(cx.profiles, payload.pull_request.user.login);
    const requested_reviewer = 'requested_reviewer' in payload ?
        getProfile(cx.profiles, payload.requested_reviewer.login) : undefined;
    return {
        action: payload.action,
        pull_request: {
            // payload.pull_request has too many properties so I can't use spread operator.
            // "{ ...payload.pull_request }"　is verbose to stack as metadata for Slack posts.
            base: {
                ref: payload.pull_request.base.ref,
            },
            body: payload.pull_request.body,
            changed_files: payload.pull_request.changed_files,
		    comments: payload.pull_request.comments,
            commits: payload.pull_request.commits,
            head: {
                ref: payload.pull_request.head.ref,
            },
            html_url: payload.pull_request.html_url,
            mergeable: payload.pull_request.mergeable || origin?.pull_request.mergeable || false,
            merged: payload.pull_request.merged || origin?.pull_request.merged || false,
            number: payload.pull_request.number,
            requested_reviewers,
            title: payload.pull_request.title,
            state: payload.pull_request.state,
            user,
        },
        repository: cx.repository,
        requested_reviewer,
    };
}

export function mergePullRequestReviewEvent(cx: Context, payload: PullRequestReviewEvent, origin: Event): Event {
    // pull_request_review / submitted
    const { body, html_url, state, user: { login } } = payload.review;
    const review = {
        body: body || '',
        html_url,
        state,
        user: getProfile(cx.profiles, login),
    };

    const requested_reviewers: Profile[] = [];
    for (const reviewer of origin.pull_request.requested_reviewers) {
        let approved = reviewer.approved;
        if (login === reviewer.login && state === 'approved') {
            approved = true;
        }
        requested_reviewers.push({ ...reviewer, approved });
    }

    return {
        action: payload.action,
        pull_request: {
            ...origin.pull_request,
            requested_reviewers,
        },
        repository: cx.repository,
        review
    };
}

export async function handlePullRequestEvent() {
    const payload = github.context.payload as PullRequestEvent;
    const { action, pull_request: { number} } = payload;
    if (['review_requested', 'review_request_removed', 'closed'].includes(action)) { 
        const cx = await createContext();
        const origin = await findMetadata(cx, number);
        const event = mergePullRequestEvent(cx, payload, origin);
        let ts;
        if (origin) {
            ts = await updatePullRequestInfo(cx, event);
        } else {
            ts = await postPullRequestInfo(cx, event);
        }
        if (ts) {
            await postChangeLog(cx, ts, () => {
                return action; // TODO IMPL
            });
        }
    }
}

export async function handlePullRequestReviewEvent() {
    const payload = github.context.payload as PullRequestReviewEvent;
    const { action, pull_request: { number }, review: { state } } = payload;
    if (action === 'submitted' && state === 'approved') {
        const cx = await createContext();
        const origin = await findMetadata(cx, number);
        if (origin) {
            const event = mergePullRequestReviewEvent(cx, payload, origin);
            const ts = await updatePullRequestInfo(cx, event);
            if (ts) {
                await postChangeLog(cx, ts, () => {
                    return 'approved'; // TODO IMPL
                });
            }
        }
    } 
}

export async function handleEvent () {
    const { eventName } = github.context;
    if (eventName === 'pull_request') {
        handlePullRequestEvent();
    } else if (eventName === 'pull_request_review') {
        handlePullRequestReviewEvent();
    } else {
        core.info(`Unsupported trigger type: "${eventName}"`);
    }
}
