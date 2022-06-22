import { getOctokit } from './workflow.ts';
import type { GitHubUser, Connection, PullRequest, QueryVariables, QueryResult, Commit } from './types.ts';

type PullRequestList = {
    repository: {
        owner: GitHubUser;
        name: string;
        pullRequests: Connection<Pick<PullRequest<Pick<Commit, 'sha'>>, 'mergeCommit' | 'number'>>;
    }
};

const pull_request_list_string = `
query ($owner: String!, $name: String!) {
    repository(owner: $owner, name: $name) {
        owner {
            login
            url
        }
        name
        pullRequests(last: 100) {
            edges {
                node {
                    mergeCommit {
                        sha: oid
                    }
                    number
                }
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
            for (const edge of list.repository.pullRequests.edges) {
                if (edge.node.mergeCommit && edge.node.mergeCommit.sha === vars.sha) {
                    console.log(`Hit! #${edge.node.number}, sha: ${vars.sha}`);
                    return edge.node.number;
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
            commits(last: 1) {
                totalCount
                edges {
                    node {
                        commit {
                            messageBody
                            messageHeadline
                            sha: oid
                            checkSuites(first: 100) {
                                totalCount
                                edges {
                                    node {
                                        checkRuns(first: 100) {
                                            totalCount
                                            edges {
                                                node {
                                                    name
                                                    conclusion
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
            headRefName
            mergeCommit {
                messageBody
                messageHeadline
                sha: oid
                checkSuites(first: 100) {
                    totalCount
                    edges {
                        node {
                            checkRuns(first: 100) {
                                totalCount
                                edges {
                                    node {
                                        name
                                        conclusion
                                    }
                                }
                            }
                        }
                    }
                }
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
