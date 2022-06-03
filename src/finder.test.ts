import * as dotenv from 'dotenv';

import { listPullRequests, findPullRequestNumber, queryActualPullRequest, findActualPullRequest } from './finder';
import { getTestGitHubToken, getTestQueryVariables } from './utils.test';

jest.setTimeout(5000 * 30);
const env = dotenv.config();

test('listPullRequests', async () => {
    const vars = getTestQueryVariables();
    const result = await listPullRequests(getTestGitHubToken(), vars);
    expect(result.repository.owner.login).toEqual(vars.owner);
    expect(result.repository.name).toEqual(vars.name);
});

test('findPullRequestNumber', async () => {
    const vars = getTestQueryVariables();
    const result = await findPullRequestNumber(getTestGitHubToken(), { ...vars, sha: 'dummy-sha' });
    expect(result).toBe(0);
});

test('queryActualPullRequest', async () => {
    const vars = getTestQueryVariables();
    const result = await queryActualPullRequest(getTestGitHubToken(), vars);
    expect(result.repository.owner.login).toEqual(vars.owner);
    expect(result.repository.name).toEqual(vars.name);
    expect(result.repository.pullRequest.number).toEqual(vars.number);

    console.dir(result, { depth: null });
})

test('findActualPullRequest', async () => {
    const vars = getTestQueryVariables();
    const result1 = await findActualPullRequest(getTestGitHubToken(), { ...vars, number: 0, sha: 'dummy-sha' });
    expect(result1).toBeNull();
    const result2 = await findActualPullRequest(getTestGitHubToken(), vars);
    expect(result2).not.toBeNull();
    expect(result2!.repository.owner.login).toEqual(vars.owner);
    expect(result2!.repository.name).toEqual(vars.name);
    expect(result2!.repository.pullRequest.number).toEqual(vars.number);
});