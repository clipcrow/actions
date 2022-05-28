import * as core from '@actions/core';
import * as github from '@actions/github';
import * as fs from 'fs/promises';

import type { PullRequestEvent, PullRequestReviewEvent } from '@octokit/webhooks-definitions/schema';
import type { Profile, ActionContext, ActionEvent } from './types';

export async function createActionContext(): Promise<ActionContext> {
    const token = core.getInput('token');
    const channel = core.getInput('channel');

    const file = await fs.readFile(core.getInput('path'), 'utf8');
    const accounts: { [login: string]: string; } = JSON.parse(file);
    const profiles: Profile[] = [];
    for (const login in accounts) {
        profiles.push({ login, slack: accounts[login] });
    }

    return { token, channel, profiles };    
}

export function getProfile(dictionary: Profile[], login: string): Profile {
    for (const profile of dictionary) {
        if (profile.login === login) {
            return profile;
        }
    }
    return { login };
} 

export function mergePullRequestEvent(cx: ActionContext, payload: PullRequestEvent, origin: ActionEvent): ActionEvent {
    // pull_request / closed, reopened, review_requested, review_request_removed
    const requested_reviewers = [];
    for (const reviewer of payload.pull_request.requested_reviewers) {
        const login = 'login' in reviewer ? reviewer.login : reviewer.name; // User.login or Team.name
        requested_reviewers.push(getProfile(cx.profiles, login));
    }
    const user = getProfile(cx.profiles, payload.pull_request.user.login);
    const requested_reviewer = 'requested_reviewer' in payload ?
        getProfile(cx.profiles, payload.requested_reviewer.login) : undefined;
    return {
        action: payload.action,
        pull_request: {
            base: {
                ref: payload.pull_request.base.ref,
            },
            body: payload.pull_request.body,
            commits: payload.pull_request.commits,
            head: {
                ref: payload.pull_request.head.ref,
            },
            html_url: payload.pull_request.html_url,
            mergeable: payload.pull_request.mergeable || origin.pull_request.mergeable,
            merged: payload.pull_request.merged || origin.pull_request.merged,
            number: payload.pull_request.number,
            requested_reviewers,
            title: payload.pull_request.title,
            state: payload.pull_request.state,
            user,
        },
        requested_reviewer,
    };
}

export function mergePullRequestReviewEvent(cx: ActionContext, payload: PullRequestReviewEvent, origin: ActionEvent): ActionEvent {
    // pull_request_review / submitted
    const { body, html_url, state, user: { login } } = payload.review;
    const review = {
        body: body || '',
        html_url,
        state,
        user: getProfile(cx.profiles, login),
    };
    return {
        action: payload.action,
        pull_request: origin.pull_request,
        review
    };
}

export function handlePullRequestEvent() {
    const { action, pull_request } = github.context.payload as PullRequestEvent;
    if (action === 'review_requested') {
        // レビュワーが追加された
        // 初めてのレビュワーだったらメッセージ投稿、そうでなければレビュワー描画を更新＋ログ
        // レビュワーへ特別なメンション
    } else if (action === 'review_request_removed') {
        // レビュワーが削除された
        // レビュワー描画を更新＋ログ
    } else if (action === 'closed') { 
        // PRがクローズした
        if (pull_request.merged) {
            // PRがマージされたためにクローズした
            // PR描画を更新＋ログ
        } else {
            // PRをマージせずにクローズした
            // PR描画を更新＋ログ
        }
    } else if (action === 'reopened') {
        // 一旦クローズされたPRが再度オープンになった。
        // PR描画を更新＋ログ。レビュワーには既にメンションされているはずなので、ログで通知が飛ぶ。 
    }
}

export function handlePullRequestReviewEvent() {
    const { action, review } = github.context.payload as PullRequestReviewEvent;
    if (action === 'submitted') {
        if (review.state === 'approved') {
            // 承認された。
            // レビュワー描画を更新＋ログ
            // 全員が承認していたら、プルリク作成者へ特別なメンション
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
