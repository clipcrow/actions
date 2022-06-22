import { assertEquals } from 'https://deno.land/std@0.144.0/testing/asserts.ts';

import { arrangeReviewers, Commits, Contents, PullRequest, Repository } from './renderer.tsx';
import { closedModel, pullRequestReviewSubmited } from './test.utils.ts';

Deno.test('arrangeReviewers', () => {
    const { reviewRequests, reviews } = pullRequestReviewSubmited.repository.pullRequest;

    const { pendings, approvals } = arrangeReviewers(reviewRequests, reviews);

    assertEquals(pendings.includes('nobody'), true);
    assertEquals(approvals.includes('someone'), true);
});

Deno.test('Commits', () => {
    console.log(`{"blocks":[${JSON.stringify(<Commits {...closedModel} />)}]}`);
});

Deno.test('Contents', () => {
    console.log(`{"blocks":${JSON.stringify(<Contents {...closedModel} />)}}`);
});

Deno.test('Repository', () => {
    console.log(`{"blocks":[${JSON.stringify(<Repository {...closedModel} />)}]}`);
});

Deno.test('PullRequestInfo', () => {
    console.log(`{"blocks":${JSON.stringify(<PullRequest {...closedModel} />)}}`);
});
