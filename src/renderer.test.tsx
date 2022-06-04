import { arrangeReviewers, Commits, PullRequest } from './renderer';
import { pullRequestReviewSubmited, closedModel } from './test.utils';

test('arrangeReviewers', () => {
    const { reviewRequests, reviews } = pullRequestReviewSubmited.repository.pullRequest;

    const { pendings, approvals } = arrangeReviewers(reviewRequests, reviews);

    expect(pendings.includes('nobody')).toBeTruthy();
    expect(approvals.includes('someone')).toBeTruthy();
});

test('Commits', () => {
    console.log(`{"blocks":[${JSON.stringify(<Commits {...closedModel}/>)}]}`);
});

test('PullRequestInfo', () => {
    console.log(`{"blocks":${JSON.stringify(<PullRequest {...closedModel}/>)}}`);
});
