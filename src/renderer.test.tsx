import { arrangeReviewers, Commits, Contents, Repository, PullRequest } from './renderer';
import { pullRequestReviewSubmited, closedModel } from './test.utils';

test('arrangeReviewers', () => {
    const { reviewRequests, reviews } = pullRequestReviewSubmited.repository.pullRequest;

    const { pendings, approvals } = arrangeReviewers(reviewRequests, reviews);

    expect(pendings.includes('nobody')).toBeTruthy();
    expect(approvals.includes('someone')).toBeTruthy();
});

test('Commits', () => {
    console.log(`{"blocks":[${JSON.stringify(<Commits {...closedModel} />)}]}`);
});

test('Contents', () => {
    console.log(`{"blocks":${JSON.stringify(<Contents {...closedModel} />)}}`);
});

test('Repository', () => {
    console.log(`{"blocks":[${JSON.stringify(<Repository {...closedModel} />)}]}`);
});

test('PullRequestInfo', () => {
    console.log(`{"blocks":${JSON.stringify(<PullRequest {...closedModel} />)}}`);
});
