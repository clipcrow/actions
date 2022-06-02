import { arrangeReviewers } from './renderer';
import { PullRequest } from './renderer';
import { sampleRenderModel } from './testUtils';

test('arrangeReviewers', () => {
    const { reviewRequests, reviews } = sampleRenderModel.repository.pullRequest;

    const { pendings, approvals } = arrangeReviewers(reviewRequests, reviews);

    expect(pendings.includes('nobody')).toBeTruthy();
    expect(approvals.includes('someone')).toBeTruthy();
});

test('PullRequestInfo', () => {
    console.log(`{"blocks":${JSON.stringify(<PullRequest {...sampleRenderModel} event='push' />)}}`);
});
