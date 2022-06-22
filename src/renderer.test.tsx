import { arrangeReviewers, Commits, Contents, Repository, PullRequest } from './renderer.tsx';
import { pullRequestReviewSubmited, closedModel } from './test.utils.ts';

Deno.test('arrangeReviewers', () => {
    const { reviewRequests, reviews } = pullRequestReviewSubmited.repository.pullRequest;

    const { pendings, approvals } = arrangeReviewers(reviewRequests, reviews);

    expect(pendings.includes('nobody')).toBeTruthy();
    expect(approvals.includes('someone')).toBeTruthy();
});

Deno.test('Commits', () => {
    console.log(`{"blocks":[${JSON.stringify(<Commits {...closedModel}/>)}]}`);
});

Deno.test('Contents', () => {
    console.log(`{"blocks":${JSON.stringify(<Contents {...closedModel}/>)}}`);
});

Deno.test('Repository', () => {
    console.log(`{"blocks":[${JSON.stringify(<Repository {...closedModel}/>)}]}`);
});

Deno.test('PullRequestInfo', () => {
    console.log(`{"blocks":${JSON.stringify(<PullRequest {...closedModel}/>)}}`);
});
