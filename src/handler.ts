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
} from './renderer';

import type {
    PullRequestClosedEvent,
    PullRequestReviewRequestedEvent,
    PullRequestReviewRequestRemovedEvent,
    PullRequestReviewEvent,
} from '@octokit/webhooks-definitions/schema';
import type {
    SlackAccounts,
    ActionContext,
    QueryVariables,
    PullRequestList,
    QueryResult,
    TriggerEventPayload,
} from './types';

export async function createActionContext(): Promise<ActionContext> {
    const owner = github.context.repo.owner;
    const name = github.context.repo.repo;
    const githubToken = core.getInput('githubToken');
    const slackToken = core.getInput('slackToken');
    const slackChannel = core.getInput('slackChannel');
    const mergeCommitlMessage = core.getInput('mergeCommitlMessage');

    const file = await fs.readFile(core.getInput('slackAccounts'), 'utf8');
    const slackAccounts: SlackAccounts = JSON.parse(file);

    return {
        owner,
        name,
        githubToken,
        slackToken,
        slackChannel,
        slackAccounts,
        mergeCommitlMessage,
    };
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
export async function listPullRequests(token: string, vars: QueryVariables): Promise<PullRequestList | null> {
    const oktokit = github.getOctokit(token);
    try {
        return await oktokit.graphql<PullRequestList>(pull_request_list_string, { ...vars });
    } catch(err) {
        core.info('' + err);
    }
    return null;
}

export async function findPullRequestNumber(token: string, vars: QueryVariables): Promise<number> {
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
export async function queryActualPullRequest(token: string, vars: QueryVariables): Promise<QueryResult | null> {
    const oktokit = github.getOctokit(token);
    try {
        return await oktokit.graphql<QueryResult>(pull_request_query_string, { ...vars });
    } catch(err) {
        core.info('' + err);
        return null;
    }
}

export async function findActualPullRequest(token: string, vars: QueryVariables): Promise<QueryResult | null> {
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

function dumpSlackAccounts(cx: ActionContext) {
    core.info('- cx.slackAccounts')
    let count = 0;
    for (const login in cx.slackAccounts) {
        core.info(`    - ${login}: ${cx.slackAccounts[login]}`);
        count += 1;
    }
    core.info(`    - (total ${count} accounts)`);
}

export async function handleAction (ev: TriggerEventPayload) {
    const cx = await createActionContext();
    dumpSlackAccounts(cx);

    const vars1: QueryVariables = { owner: cx.owner, name: cx.name, ...ev }
    const result = await findActualPullRequest(cx.githubToken, vars1);

    if (!result) {
        // PullRequest Not Found
        return;
    }

    // number of vars1 is 0 when "push"
    const vars2 = { ...vars1, number: result.repository.pullRequest.number };
    const previous = await findPreviousSlackMessage(cx, vars2);
    const model = { ...cx, ...ev, ...result, ts: previous };
    const current = await postPullRequestInfo(cx, model);
    if (current) {
        if (ev.action === 'closed') {
            await postChangeLog(cx, current, () => ClosedLog(model));
        } else if (['review_requested', 'review_request_removed'].includes(ev.action)) {
            await postChangeLog(cx, current, () => ReviewRequestedLog(model));
        } else if (ev.action === 'submitted') {
            await postChangeLog(cx, current, () => SubmittedLog(model));
        }
    }
}

export async function handleEvent () {
    const event = github.context.eventName;
    const action = github.context.action || '';;

    let ev: TriggerEventPayload | undefined;
    if (event === 'pull_request') {
        if (action === 'closed') {
            const payload = github.context.payload as PullRequestClosedEvent;
            const number = payload.pull_request.number;
            const sha = github.context.sha;
            ev = { event, action, number, sha };
        } else if (['review_requested', 'review_request_removed'].includes(action)) {
            const payload = github.context.payload as
                PullRequestReviewRequestedEvent | PullRequestReviewRequestRemovedEvent;
            const number = payload.pull_request.number;
            const { login, html_url: url} = payload.requested_reviewer;
            const reviewRequest = { requestedReviewer: { login, url} };
            ev = { event, action, number, reviewRequest };
        }
    } else if (event === 'pull_request_review') {
        const payload = github.context.payload as PullRequestReviewEvent;
        const number = payload.pull_request.number;
        const { user: { login, html_url: url} , body, submitted_at: updatedAt } = payload.review;
        // Since it is uppercase in the definition of GitHub GraphQL, align it
        const state = (payload.review.state).toUpperCase();
        const review = { author: { login, url }, body, state, updatedAt };
        ev = { event, action, number, review };
    } else if (event === 'push') {
        ev = { event, action, number: 0, sha: github.context.sha };
    }

    if (ev) {
        handleAction(ev);
    } else {
        core.info(`Unsupported trigger action: "${event}" > "${action}"`);
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
