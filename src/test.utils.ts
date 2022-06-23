import { getEnv } from './environment';
import type { RenderModel, QueryVariables } from './types';

export function getTestQueryVariables(): QueryVariables {
    return {
        owner: getEnv('owner'),
        name: getEnv('name'),
        number: parseInt(getEnv('number')),
    };
}

export const pullRequestReviewSubmited: RenderModel = {
    // Omit<ActionContext, 'name' | 'githubToken' | 'slackToken' | 'slackChannel'> &
    owner: 'someone',
    slackAccounts: {
        someone: "U1234567890",
        another: "U5678901234",
        nobody: "U8901234567",
    },
    emptyBodyWarning: 'Caution, body of this pull request is empty.',
    pushMessage: 'Deployment flow complete',
    // Omit<EventPayload, 'number' | 'upsert'> &
    sender: {
        login: 'someone',
        url: "https://github.com/someone",
    },
    event: "pull_request_review",
    action: "submitted",
    review: {
        author: {
            login: "someone",
            url: "https://github.com/someone"
        },
        body: '',
        state: "APPROVED",
        updatedAt: "2022-05-29T10:07:44Z"
    },
    // QueryResult;
    repository: {
        name: "test",
        owner: {
            login: "someone",
            url: "https://github.com/someone"
        },
        pullRequest: {
            author: {
                login: "impl123",
                url: "https://github.com/impl123"
            },
            baseRefName: "develop",
            body: "## Related issue number\r\n\r\n- https://github.com/someone/test/issues/269\r\n",
            changedFiles: 13,
            commits: {
                totalCount: 9,
                edges: []
            },
            headRefName: "feature-269",
            mergeCommit: null,
            mergeable: "MERGEABLE",
            merged: false,
            number: 311,
            reviewRequests: {
                totalCount: 1,
                edges: [
                    {
                        node: {
                            requestedReviewer: {
                                login: "nobody",
                                url: "https://github.com/nobody"
                            }
                        }
                    }
                ]
            },
            reviews: {
                totalCount: 3,
                edges: [
                    {
                        node: {
                            author: {
                                login: "someone",
                                url: "https://github.com/someone"
                            },
                            body: 'LGTM',
                            state: "CHANGES_REQUESTED",
                            updatedAt: "2022-05-27T07:00:51Z"
                        }
                    },
                    {
                        node: {
                            author: {
                                login: "another",
                                url: "https://github.com/another"
                            },
                            body: '',
                            state: "COMMENTED",
                            updatedAt: "2022-05-27T09:23:28Z"
                        }
                    },
                    {
                        node: {
                            author: {
                                login: "someone",
                                url: "https://github.com/someone"
                            },
                            body: '',
                            state: "APPROVED",
                            updatedAt: "2022-05-29T10:07:44Z"
                        }
                    }
                ]
            },
            state: "OPEN",
            title: "Sample RenderModel Object",
            url: "https://github.com/someone/test/pull/311"
        },
        url: "https://github.com/someone/test"
    },
};

export const closedModel: RenderModel = {
    owner: 'someone',
    slackAccounts: {
        someone: "U1234567890",
        another: "U5678901234",
        nobody: "U8901234567",
    },
    emptyBodyWarning: 'Caution, body of this pull request is empty.',
    pushMessage: 'Deployment flow complete',
    sender: {
        login: 'someone',
        url: "https://github.com/someone",
    },
    event: "push",
    action: "",
    sha: '6789abcdefghijklmnopqrstuvwxyz0123456789',
    repository: {
        name: "test",
        owner: {
            login: "someone",
            url: "https://github.com/someone"
        },
        pullRequest: {
            author: {
                login: "impl123",
                url: "https://github.com/impl123"
            },
            baseRefName: "develop",
            body: "## Related issue number\r\n\r\n- https://github.com/someone/test/issues/269\r\n",
            changedFiles: 13,
            commits: {
                totalCount: 9,
                edges: []
            },
            headRefName: "feature-269",
            mergeCommit: {
                messageBody: 'create SampleRenderModel object',
                messageHeadline: 'Merge pull request #311 from test/feature-269',
                sha: '6789abcdefghijklmnopqrstuvwxyz0123456789',
                checkSuites: {
                    totalCount: 0,
                    edges: [],
                },
            },
            mergeable: "MERGEABLE",
            merged: true,
            number: 311,
            reviewRequests: {
                totalCount: 0,
                edges: []
            },
            reviews: {
                totalCount: 3,
                edges: [
                    {
                        node: {
                            author: {
                                login: "someone",
                                url: "https://github.com/someone"
                            },
                            body: 'LGTM',
                            state: "CHANGES_REQUESTED",
                            updatedAt: "2022-05-27T07:00:51Z"
                        }
                    },
                    {
                        node: {
                            author: {
                                login: "another",
                                url: "https://github.com/another"
                            },
                            body: '',
                            state: "COMMENTED",
                            updatedAt: "2022-05-27T09:23:28Z"
                        }
                    },
                    {
                        node: {
                            author: {
                                login: "someone",
                                url: "https://github.com/someone"
                            },
                            body: '',
                            state: "APPROVED",
                            updatedAt: "2022-05-29T10:07:44Z"
                        }
                    }
                ]
            },
            state: "MERGED",
            title: "create SampleRenderModel object",
            url: "https://github.com/someone/test/pull/311"
        },
        url: "https://github.com/someone/test"
    },
};
