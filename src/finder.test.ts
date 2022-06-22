import * as dotenv from 'https://esm.sh/dotenv@16.0.1';
import { assertEquals, assertNotEquals } from 'https://deno.land/std@0.144.0/testing/asserts.ts';

import { findActualPullRequest, findPullRequestNumber, listPullRequests, queryActualPullRequest } from './finder.ts';
import { getTestQueryVariables } from './test.utils.ts';

const env = dotenv.config();

Deno.test('listPullRequests', async () => {
    const vars = getTestQueryVariables(parseInt(env.parsed!.number));
    const result = await listPullRequests(vars);
    assertEquals(result.repository.owner.login, vars.owner);
    assertEquals(result.repository.name, vars.name);
});

Deno.test('findPullRequestNumber', async () => {
    const vars = getTestQueryVariables(parseInt(env.parsed!.number));
    const result = await findPullRequestNumber({ ...vars, sha: 'dummy-sha' });
    assertEquals(result, 0);
});

Deno.test('queryActualPullRequest', async () => {
    const vars = getTestQueryVariables(parseInt(env.parsed!.number));
    const result = await queryActualPullRequest(vars);
    assertEquals(result.repository.owner.login, vars.owner);
    assertEquals(result.repository.name, vars.name);
    assertEquals(result.repository.pullRequest.number, vars.number);

    console.dir(result, { depth: null });
});

Deno.test('findActualPullRequest', async () => {
    const vars = getTestQueryVariables(parseInt(env.parsed!.number));
    const result1 = await findActualPullRequest({ ...vars, number: 0, sha: 'dummy-sha' });
    assertEquals(result1, null);
    const result2 = await findActualPullRequest(vars);
    assertNotEquals(result2, null);
    assertEquals(result2!.repository.owner.login, vars.owner);
    assertEquals(result2!.repository.name, vars.name);
    assertEquals(result2!.repository.pullRequest.number, vars.number);
});
