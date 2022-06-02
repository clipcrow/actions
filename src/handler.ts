import * as core from '@actions/core';
import * as github from '@actions/github';
import * as fs from 'fs/promises';

import {
    findPreviousSlackMessage,
    postPullRequestInfo,
    postChangeLog,
} from './notifier';
import {
    ClosedLog,
    ReviewRequestedLog,
    SubmittedLog,
    DeployCompleteLog
} from './renderer';

import type {
    PullRequestClosedEvent,
    PullRequestReviewRequestedEvent,
    PullRequestReviewRequestRemovedEvent,
    PullRequestReviewEvent,
} from '@octokit/webhooks-definitions/schema';
import type {
    KeyValueStore,
    GitHubUser,
    ActionContext,
    QueryVariables,
    PullRequestList,
    QueryResult,
    EventPayload,
} from './types';
import type {
    WebhookPayload
} from '@actions/github/lib/interfaces';

export async function createActionContext(): Promise<ActionContext> {
    const owner = github.context.repo.owner;
    const name = github.context.repo.repo;
    const githubToken = core.getInput('githubToken');
    const slackToken = core.getInput('slackToken');
    const slackChannel = core.getInput('slackChannel');
    const pushMessage = core.getInput('pushMessage');

    const file = await fs.readFile(core.getInput('slackAccounts'), 'utf8');
    const slackAccounts: KeyValueStore = JSON.parse(file);

    return {
        owner,
        name,
        githubToken,
        slackToken,
        slackChannel,
        slackAccounts,
        pushMessage,
    };
}

export function dumpSlackAccounts(
    cx: ActionContext
) {
    core.info('- cx.slackAccounts')
    let count = 0;
    for (const login in cx.slackAccounts) {
        core.info(`    - ${login}: ${cx.slackAccounts[login]}`);
        count += 1;
    }
    core.info(`    - (total ${count} accounts)`);
}

const pull_request_list_string = `
query ($owner: String!, $name: String!) {
    repository(owner: $owner, name: $name) {
        pullRequests(last: 100) {
            nodes {
                mergeCommit {
                    messageBody
                    messageHeadline
                    sha: oid
                }
            }
        }
    }
}
`;
export async function listPullRequests(
    token: string,
    vars: QueryVariables,
): Promise<PullRequestList | null> {
    const oktokit = github.getOctokit(token);
    try {
        return await oktokit.graphql<PullRequestList>(pull_request_list_string, { ...vars });
    } catch(err) {
        core.info('' + err);
    }
    return null;
}

export async function findPullRequestNumber(
    token: string,
    vars: QueryVariables,
): Promise<number> {
    if (vars.sha) {
        const list = await listPullRequests(token, vars);
        if (list) {
            for (const pullRequest of list.pullRequests.nodes) {
                if (pullRequest.mergeCommit.sha === vars.sha) {
                    return pullRequest.number;
                }
            }
        }
    }
    return 0;
}

const pull_request_query_string = `
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
            mergeCommit {
                messageBody
                messageHeadline
                sha: oid
            }
            mergeable
            merged
            number
            reviewRequests(last: 100) {
                totalCount
                edges {
                    node {
                        requestedReviewer {
                            ... on Team {
                                __typename
                                login: name
                                url
                            }
                            ... on User {
                                __typename
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
export async function queryActualPullRequest(
    token: string,
    vars: QueryVariables,
): Promise<QueryResult | null> {
    const oktokit = github.getOctokit(token);
    try {
        return await oktokit.graphql<QueryResult>(pull_request_query_string, { ...vars });
    } catch(err) {
        core.info('' + err);
        return null;
    }
}

export async function findActualPullRequest(
    token: string,
    vars: QueryVariables,
): Promise<QueryResult | null> {
    let number = vars.number;
    if (number == 0) {
        number = await findPullRequestNumber(token, vars);
    }
    if (number == 0) {
        // PullRequest Not Found
        return null;
    }
    return await queryActualPullRequest(token, { ...vars, number });
}

export async function processEvent (
    cx: ActionContext,
    ev: EventPayload,
) {
    const vars1: QueryVariables = { owner: cx.owner, name: cx.name, number: ev.number, sha: ev.sha };
    const result = await findActualPullRequest(cx.githubToken, vars1);

    if (!result) {
        // PullRequest Not Found
        return;
    }

    // number of vars1 is 0 when "push"
    const vars2 = { ...vars1, number: result.repository.pullRequest.number };
    const previousTS = await findPreviousSlackMessage(cx, vars2);
    const model = { ...cx, ...ev, ...result };
    const currentTS = await postPullRequestInfo(cx, model, previousTS);
    if (currentTS) {
        if (ev.action === 'closed') {
            return await postChangeLog(cx, currentTS, () => ClosedLog(model));
        }
        if (['review_requested', 'review_request_removed'].includes(ev.action)) {
            return await postChangeLog(cx, currentTS, () => ReviewRequestedLog(model));
        }
        if (ev.action === 'submitted') {
            return await postChangeLog(cx, currentTS, () => SubmittedLog(model));
        }
        if (ev.event === 'push') {
            return await postChangeLog(cx, currentTS, () => DeployCompleteLog(model));
        }
    }
    return currentTS;
}

export function extractPayload(
    sender: GitHubUser,
    event: string,
    action: string,
    payload: WebhookPayload,
    sha: string,
): EventPayload | undefined {
    if (event === 'push') {
        return { sender, event, action, number: 0, sha };
    }
    if (event === 'pull_request') {
        if (action === 'closed') {
            const closedEvent = payload as PullRequestClosedEvent;
            const number = closedEvent.pull_request.number;
            const sha = github.context.sha;
            return { sender, event, action, number, sha };
        }
        if (['review_requested', 'review_request_removed'].includes(action)) {
            const reviewerEvent = payload as
                (PullRequestReviewRequestedEvent | PullRequestReviewRequestRemovedEvent);
            const number = reviewerEvent.pull_request.number;
            const { login, html_url: url} = reviewerEvent.requested_reviewer;
            const reviewRequest = { requestedReviewer: { login, url} };
            return { sender, event, action, number, reviewRequest };
        }
    }
    if (event === 'pull_request_review') {
        const reviewEvent = payload as PullRequestReviewEvent;
        const number = reviewEvent.pull_request.number;
        const { user: { login, html_url: url} , body, submitted_at: updatedAt } = reviewEvent.review;
        // Since it is uppercase in the definition of GitHub GraphQL, align it
        const state = (reviewEvent.review.state).toUpperCase();
        const review = { author: { login, url }, body, state, updatedAt };
        return { sender, event, action, number, review };
    }
}

export async function handleEvent () {
    const event = github.context.eventName;
    const action = github.context.action || '';
    const { actor, sha } = github.context;
    const ev = extractPayload(
        { login: actor, url: `https://github.com/${actor}` },
        event,
        action,
        github.context.payload,
        sha,
    );
    if (ev) {
        const cx = await createActionContext();
        dumpSlackAccounts(cx);
        processEvent(cx, ev);
    } else {
        const caption = action ? ` > "${action}"` : '';
        core.info(`Unsupported trigger type: "${event}"${caption}`);
    }
}

/*
query ($owner: String!, $name: String!, $branch: String!) {
    repository(owner: $owner, name: $name) {
        ref(qualifiedName: $branch) {
            target {
                ... on Commit {
                    history(first: 10) {
                        edges {
                            node {
                                messageBody
                                messageHeadline
                                sha: oid
                            }
                        }
                    }
                }
            }
        }
    }
}
*/
