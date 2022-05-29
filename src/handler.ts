import * as core from '@actions/core';
import * as github from '@actions/github';
import * as fs from 'fs/promises';

import { findMetadata, postPullRequestInfo, updatePullRequestInfo, postChangeLog } from './notifier';
import { ChangeLog } from './renderer';

import type { PullRequestReviewRequestedEvent, PullRequestReviewEvent } from '@octokit/webhooks-definitions/schema';
import type { ActionContext, Metadata, QueryResult, ActionEventPayload } from './types';

export async function createContext(): Promise<ActionContext> {
    const owner = github.context.repo.owner;
    const name = github.context.repo.repo;
    const githubToken = core.getInput('githubToken');
    const slackToken = core.getInput('slackToken');
    const slackChannel = core.getInput('slackChannel');

    const file = await fs.readFile(core.getInput('slackAccounts'), 'utf8');
    const slackAccounts: { [login: string]: string; } = JSON.parse(file);

    return {
        owner,
        name,
        githubToken,
        slackToken,
        slackChannel,
        slackAccounts,
    };    
}

export async function queryPullRequest(token: string, variables: Metadata): Promise<QueryResult> {
    const queryString = `
    query ($owner: String!, $name: String!, $number: Int!) {
        repository(owner: $owner, name: $name) {
            name
            owner {
                login
                url
            }
            pullRequest(number: $number) {
                author {
                    login
                    url
                }
                baseRefName
                body
                changedFiles
                commits {
                    totalCount
                }
                headRefName
                mergeable
                merged
                number
                reviewRequests(last: 100) {
                    totalCount
                    edges {
                        node {
                            requestedReviewer {
                                ... on User {
                                    login
                                    url
                                }
                            }
                        }
                    }
                }
                reviews(last: 100) {
                    totalCount
                    edges {
                        node {
                        author {
                            login
                            url
                        }
                        state
                        updatedAt
                        }
                    }
                }
                state
                title
                url
            }
            url
        }
    }
    `;
    const oktokit = github.getOctokit(token);
    return await oktokit.graphql<QueryResult>(queryString, { ...variables });
}

export async function handleAction (eventPayload: ActionEventPayload) {
    const { action, number } = eventPayload;
    if (['review_requested', 'review_request_removed', 'closed', 'submitted'].includes(action)) { 
        const cx = await createContext();
        const { owner, name, slackAccounts } = cx;
        const result = await queryPullRequest(cx.githubToken, { owner, name, number });
        const message = await findMetadata(cx, number);
        let ts = message?.ts;
        const renderModel = { ...result, ...eventPayload, ts, ...cx };
        if (message) {
            ts = await updatePullRequestInfo(cx, renderModel);
        } else {
            ts = await postPullRequestInfo(cx, renderModel);
        }
        if (ts) {
            await postChangeLog(cx, ts, () => ChangeLog(renderModel));
        }
    }else {
        core.info(`Unsupported trigger type: "${eventPayload.event}"`);
    }
}

export async function handleEvent () {
    const { eventName, action } = github.context;
    if (eventName === 'pull_request') {
        const payload = github.context.payload as PullRequestReviewRequestedEvent;
        const number = payload.pull_request.number;
        const reviewRequest = (payload.requested_reviewer) ? {
            requestedReviewer: {
                login: payload.requested_reviewer.login,
                url: payload.requested_reviewer.html_url,
            },
        } : undefined; // <- undefined when action is 'closed'
        handleAction({ event: 'pull_request', action, number, reviewRequest });
    } else if (eventName === 'pull_request_review') {
        const payload = github.context.payload as PullRequestReviewEvent;
        const number = payload.pull_request.number;
        const review = {
            author: {
                login: payload.review.user.login,
                url: payload.review.user.html_url,
            },
            state: (payload.review.state).toUpperCase(),
            updatedAt: payload.review.submitted_at,
        };
        handleAction({ event: 'pull_request_review', action, number, review });
    } else {
        core.info(`Unsupported trigger type: "${eventName}"`);
    }
}
