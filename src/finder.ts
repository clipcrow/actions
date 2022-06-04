import { getOctokit } from './workflow';
import type { Commit, QueryVariables, QueryResult } from './types';

interface PullRequestList {
    repository: {
        owner: {
            login: string;
        };
        name: string;
        pullRequests: {
            nodes: {
                number: number;
                mergeCommit: Commit;
            }[];
        }
    }
}

const pull_request_list_string = `
query ($owner: String!, $name: String!) {
    repository(owner: $owner, name: $name) {
        owner {
            login
        }
        name
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
export async function listPullRequests(vars: QueryVariables): Promise<PullRequestList> {
    const octokit = getOctokit();
    return await octokit.graphql<PullRequestList>(pull_request_list_string, { ...vars });
}

export async function findPullRequestNumber(vars: QueryVariables): Promise<number> {
    const octokit = getOctokit();
    if (vars.sha) {
        const list = await listPullRequests(vars);
        if (list) {
            for (const pullRequest of list.repository.pullRequests.nodes) {
                if (pullRequest.mergeCommit && pullRequest.mergeCommit.sha === vars.sha) {
                    console.log(`Hit! #${pullRequest.number}, sha: ${vars.sha}`);
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
export async function queryActualPullRequest(vars: QueryVariables): Promise<QueryResult> {
    const octokit = getOctokit();
    return await octokit.graphql<QueryResult>(pull_request_query_string, { ...vars });
}

export async function findActualPullRequest(vars: QueryVariables): Promise<QueryResult | null> {
    let number = vars.number;
    if (number == 0) {
        number = await findPullRequestNumber(vars);
    }
    if (number == 0) {
        // PullRequest Not Found
        return null;
    }
    return await queryActualPullRequest({ ...vars, number });
}
