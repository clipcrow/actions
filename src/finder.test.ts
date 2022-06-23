import { listPullRequests, findPullRequestNumber, queryActualPullRequest, findActualPullRequest } from './finder';
import { getTestQueryVariables } from './test.utils';

test('listPullRequests', async () => {
    const vars = getTestQueryVariables();
    const result = await listPullRequests(vars);
    expect(result.repository.owner.login).toEqual(vars.owner);
    expect(result.repository.name).toEqual(vars.name);
}, 1000 * 30);

test('findPullRequestNumber', async () => {
    const vars = getTestQueryVariables();
    const result = await findPullRequestNumber({ ...vars, sha: 'dummy-sha' });
    expect(result).toBe(0);
}, 1000 * 30);

test('queryActualPullRequest', async () => {
    const vars = getTestQueryVariables();
    const result = await queryActualPullRequest(vars);
    expect(result.repository.owner.login).toEqual(vars.owner);
    expect(result.repository.name).toEqual(vars.name);
    expect(result.repository.pullRequest.number).toEqual(vars.number);

    console.dir(result, { depth: null });
}, 1000 * 30)

test('findActualPullRequest', async () => {
    const vars = getTestQueryVariables();
    const result1 = await findActualPullRequest({ ...vars, number: 0, sha: 'dummy-sha' });
    expect(result1).toBeNull();
    const result2 = await findActualPullRequest(vars);
    expect(result2).not.toBeNull();
    expect(result2!.repository.owner.login).toEqual(vars.owner);
    expect(result2!.repository.name).toEqual(vars.name);
    expect(result2!.repository.pullRequest.number).toEqual(vars.number);
}, 1000 * 30);