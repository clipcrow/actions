import * as core from '@actions/core';
import * as github from '@actions/github';
import * as fs from 'fs/promises';

import {
    findSlackMessage,
    postPullRequestInfo,
    updatePullRequestInfo,
    postChangeLog,
} from './notifier';
import {
    ClosedLog,
    ReviewRequestedLog,
    SubmittedLog,
} from './renderer';

import type {
    PullRequestReviewRequestedEvent,
    PullRequestReviewEvent,
} from '@octokit/webhooks-definitions/schema';
import type {
    SlackAccounts,
    ActionContext,
    QueryVariables,
    QueryResult,
    TriggerEventPayload,
} from './types';

export async function createActionContext(): Promise<ActionContext> {
    const owner = github.context.repo.owner;
    const name = github.context.repo.repo;
    const githubToken = core.getInput('githubToken');
    const slackToken = core.getInput('slackToken');
    const slackChannel = core.getInput('slackChannel');

    const file = await fs.readFile(core.getInput('slackAccounts'), 'utf8');
    const slackAccounts: SlackAccounts = JSON.parse(file);

    return {
        owner,
        name,
        githubToken,
        slackToken,
        slackChannel,
        slackAccounts,
    };
}

export async function queryActualPullRequest(token: string, vars: QueryVariables): Promise<QueryResult> {
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
                        body
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
    return await oktokit.graphql<QueryResult>(queryString, { ...vars });
}

export async function handleAction (ev: TriggerEventPayload) {
    const { action, number } = ev;
    if (['closed', 'review_request_removed', 'review_requested', 'submitted'].includes(action)) {
        const cx = await createActionContext();
        const { owner, name } = cx;
        const result = await queryActualPullRequest(cx.githubToken, { owner, name, number });
        const message = await findSlackMessage(cx, number);
        let ts = message?.ts; // So the message not found, ts is undefined.
        const model = { ...cx, ...ev, ...result, ts };
        if (message) {
            ts = await updatePullRequestInfo(cx, model);
        } else {
            ts = await postPullRequestInfo(cx, model);
        }
        if (ts) {
            if (action === 'closed') {
                await postChangeLog(cx, ts, () => ClosedLog(model));
            } else if (['review_requested', 'review_request_removed'].includes(action)) {
                await postChangeLog(cx, ts, () => ReviewRequestedLog(model));
            } else if (action === 'submitted') {
                await postChangeLog(cx, ts, () => SubmittedLog(model));
            }
        }
    }else {
        core.info(`Unsupported trigger action: ${ev.event} > "${action}"`);
    }
}

export async function handleEvent () {
    const { eventName, payload: { action } } = github.context;
    if (eventName === 'pull_request') {
        const payload = github.context.payload as PullRequestReviewRequestedEvent;
        const number = payload.pull_request.number;
        const reviewRequest = (payload.requested_reviewer) && {
            requestedReviewer: {
                login: payload.requested_reviewer.login,
                url: payload.requested_reviewer.html_url,
            },
        }; // <- undefined when action is 'closed'
        handleAction({ event: 'pull_request', action: action || '', number, reviewRequest });
    } else if (eventName === 'pull_request_review') {
        const payload = github.context.payload as PullRequestReviewEvent;
        const number = payload.pull_request.number;
        const review = {
            author: {
                login: payload.review.user.login,
                url: payload.review.user.html_url,
            },
            body: payload.review.body,
            // Since it is uppercase in the definition of GitHub GraphQL, align it
            state: (payload.review.state).toUpperCase(),
            updatedAt: payload.review.submitted_at,
        };
        handleAction({ event: 'pull_request_review', action: action || '', number, review });
    } else {
        core.info(`Unsupported trigger event: "${eventName}"`);
    }
}
