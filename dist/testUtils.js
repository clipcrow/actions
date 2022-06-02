"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sampleRenderModel = void 0;
exports.sampleRenderModel = {
    event: "pull_request_review",
    action: "submitted",
    number: 311,
    owner: 'someone',
    name: 'test',
    slackAccounts: {
        someone: "U1234567890",
        another: "U5678901234",
        nobody: "U8901234567",
    },
    mergeCommitlMessage: 'Deployment flow complete',
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
                "totalCount": 9
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
            title: "create SampleRenderModel object",
            url: "https://github.com/someone/test/pull/311"
        },
        url: "https://github.com/someone/test"
    }
};
//# sourceMappingURL=testUtils.js.map