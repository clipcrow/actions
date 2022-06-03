import * as core from '@actions/core';
import * as github from '@actions/github';

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
    RenderModel,
    SlackResult,
} from './types';

import type {
    WebhookPayload
} from '@actions/github/lib/interfaces';

export function readSlackAccounts(input: string): KeyValueStore {
    try {
        return JSON.parse(input);
    } catch(err) {
        core.info('' + err);
    }
    return {};
}

export function createActionContext(): ActionContext {
    const owner = github.context.repo.owner;
    const name = github.context.repo.repo;
    const githubToken = core.getInput('githubToken');
    const slackToken = core.getInput('slackToken');
    const slackChannel = core.getInput('slackChannel');
    const pushMessage = core.getInput('pushMessage');

    const slackAccounts = readSlackAccounts(core.getInput('slackAccounts'));

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
        core.info(`    - github: ${login}, slack: {privacy}`);
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
                number
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
            for (const pullRequest of list.repository.pullRequests.nodes) {
                if (pullRequest.mergeCommit && pullRequest.mergeCommit.sha === vars.sha) {
                    core.info(`Hit! #${pullRequest.number}, sha: ${vars.sha}`);
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

export function createRenderModel(
    cx: ActionContext,
    ev: EventPayload,
    result: QueryResult,
): RenderModel {
    const { owner, slackAccounts, pushMessage } = cx;
    const { sender, event, action, reviewRequest, review, sha } = ev;
    return {
        owner, slackAccounts, pushMessage,
        sender, event, action, reviewRequest, review, sha,
        ...result,
    };
}

export async function processEvent (
    cx: ActionContext,
    ev: EventPayload,
): Promise<SlackResult | null> {
    core.info('processing...');
    const vars1: QueryVariables = { owner: cx.owner, name: cx.name, number: ev.number, sha: ev.sha };
    core.info('finding actual pull-request...');
    core.info(JSON.stringify(vars1, null, '\t'));
    const result = await findActualPullRequest(cx.githubToken, vars1);

    if (!result) {
        core.info('Related pull-request not found!');
        return null;
    }

    // number of vars1 is 0 when "push"
    const vars2 = { ...vars1, number: result.repository.pullRequest.number };
    core.info('finding slack message...');
    core.info(JSON.stringify(vars2, null, '\t'));
    try {
        const previousTS = await findPreviousSlackMessage(cx, vars2);
        core.info(`previous ts: ${previousTS}`);
        const model = createRenderModel(cx, ev, result);
        core.info('posting slack message...');
        core.info(JSON.stringify(model, null, '\t'));
        const currentResult = await postPullRequestInfo(cx, model, previousTS);
        if (currentResult.ok) {
            core.info('success!');
            if (ev.action === 'closed') {
                core.info('posting log for "closed"...');
                return await postChangeLog(cx, currentResult.ts, () => ClosedLog(model));
            }
            if (['review_requested', 'review_request_removed'].includes(ev.action)) {
                core.info(`posting log for "${ev.action}"...`);
                return await postChangeLog(cx, currentResult.ts, () => ReviewRequestedLog(model));
            }
            if (ev.action === 'submitted') {
                core.info('posting log for "submitted"...');
                return await postChangeLog(cx, currentResult.ts, () => SubmittedLog(model));
            }
            if (ev.event === 'push') {
                core.info('posting log for "push"...');
                return await postChangeLog(cx, currentResult.ts, () => DeployCompleteLog(model));
            }
        } else {
            core.info(`Slack Error: ${currentResult.error}`);
        }
        return currentResult;
    } catch(err) {
        core.info(JSON.stringify(err, null, '\t'));
        return null;
    }
}

export function extractPayload(
    sender: GitHubUser,
    event: string,
    payload: WebhookPayload,
    sha: string,
): EventPayload | null {
    if (event === 'push') {
        core.info('extract "push" event...');
        return { sender, event, action: '', number: 0, sha };
    }
    const action = payload.action;
    if (event === 'pull_request') {
        core.info('extract "pull_request" event...');
        if (action === 'closed') {
            core.info('extract "closed"...');
            const closedEvent = payload as PullRequestClosedEvent;
            const number = closedEvent.pull_request.number;
            const sha = github.context.sha;
            return { sender, event, action, number, sha };
        }
        if (action === 'review_requested' || action === 'review_request_removed') {
            core.info(`extract "${action}" action...`);
            const reviewerEvent = payload as
                (PullRequestReviewRequestedEvent | PullRequestReviewRequestRemovedEvent);
            const number = reviewerEvent.pull_request.number;
            const { login, html_url: url} = reviewerEvent.requested_reviewer;
            const reviewRequest = { requestedReviewer: { login, url} };
            return { sender, event, action, number, reviewRequest };
        }
    }
    if (event === 'pull_request_review') {
        core.info('extract "pull_request_review" event...');
        const reviewEvent = payload as PullRequestReviewEvent;
        const action = reviewEvent.action;
        core.info(`extract "${action}" action...`);
        const number = reviewEvent.pull_request.number;
        const { user: { login, html_url: url} , body, submitted_at: updatedAt } = reviewEvent.review;
        // Since it is uppercase in the definition of GitHub GraphQL, align it
        const state = (reviewEvent.review.state).toUpperCase();
        const review = { author: { login, url }, body, state, updatedAt };
        return { sender, event, action, number, review };
    }
    const caption = action ? ` > "${action}"` : ''
    core.info(`Unsupported trigger type: "${event}"${caption}`);
    return null;
}

export async function handleEvent (): Promise<SlackResult | null> {
    const event = github.context.eventName;
    core.info(`starting handle "${event}"...`);
    const { actor, sha } = github.context;
    const ev = extractPayload(
        { login: actor, url: `https://github.com/${actor}` },
        event,
        github.context.payload,
        sha,
    );
    if (ev) {
        core.info('extracted payload is');
        core.info(JSON.stringify(ev, null , '\t'));
        core.info('context creating...');
        const cx = await createActionContext();
        dumpSlackAccounts(cx);
        return await processEvent(cx, ev);
    }
    core.info(`...ending handle "${event}"`);
    return null;
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
