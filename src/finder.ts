import * as core from '@actions/core';
import * as github from '@actions/github';

import type { QueryVariables, PullRequestList, QueryResult } from './types';

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
export async function listPullRequests(token: string, vars: QueryVariables): Promise<PullRequestList> {
    const oktokit = github.getOctokit(token);
    return await oktokit.graphql<PullRequestList>(pull_request_list_string, { ...vars });
}

export async function findPullRequestNumber(token: string, vars: QueryVariables): Promise<number> {
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
export async function queryActualPullRequest(token: string, vars: QueryVariables): Promise<QueryResult> {
    const oktokit = github.getOctokit(token);
    return await oktokit.graphql<QueryResult>(pull_request_query_string, { ...vars });
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
