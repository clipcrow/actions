import { arrangeReviewers } from './renderer';
import { PullRequest } from './renderer';
import { sampleRenderModel } from './testUtils';

test('arrangeReviewers', () => {
    const { reviewRequests, reviews } = sampleRenderModel.repository.pullRequest;

    const { pendings, approvals } = arrangeReviewers(reviewRequests, reviews);

    expect(pendings).toEqual(['nobody', 'another']);
    expect(approvals).toEqual(['someone']);
});

test('PullRequestInfo', () => {
    console.dir(<PullRequest {...sampleRenderModel} />, { depth: null });
});
