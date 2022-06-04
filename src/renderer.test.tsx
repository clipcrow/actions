import { arrangeReviewers, PullRequest } from './renderer';
import { pullRequestReviewSubmited, closedModel } from './test.utils';

test('arrangeReviewers', () => {
    const { reviewRequests, reviews } = pullRequestReviewSubmited.repository.pullRequest;

    const { pendings, approvals } = arrangeReviewers(reviewRequests, reviews);

    expect(pendings.includes('nobody')).toBeTruthy();
    expect(approvals.includes('someone')).toBeTruthy();
});

test('PullRequestInfo', () => {
    console.log(`{"blocks":${JSON.stringify(<PullRequest {...closedModel}/>)}}`);
});
