import { arrangeReviewers } from './renderer';

const pullRequest = {
    "reviewRequests": {
        "totalCount": 1,
        "edges": [
            {
                "node": {
                    "requestedReviewer": {
                        "login": "nobody",
                        "url": "https://github.com/nobody"
                    }
                }
            }
        ]
    },
    "reviews": {
        "totalCount": 3,
        "edges": [
            {
                "node": {
                    "author": {
                        "login": "someone",
                        "url": "https://github.com/someone"
                    },
                    "state": "CHANGES_REQUESTED",
                    "updatedAt": "2022-05-27T07:00:51Z"
                }
            },
            {
                "node": {
                    "author": {
                        "login": "another",
                        "url": "https://github.com/another"
                    },
                    "state": "CHANGES_REQUESTED",
                    "updatedAt": "2022-05-27T09:23:28Z"
                }
            },
            {
                "node": {
                    "author": {
                        "login": "someone",
                        "url": "https://github.com/someone"
                    },
                    "state": "APPROVED",
                    "updatedAt": "2022-05-29T10:07:44Z"
                }
            }
        ]
    }
};

test('arrangeReviewers', () => {
    const { reviewRequests, reviews } = pullRequest;

    const { pendings, approvals } = arrangeReviewers(reviewRequests, reviews);

    expect(pendings).toEqual(['nobody', 'another']);
    expect(approvals).toEqual(['someone']);
})