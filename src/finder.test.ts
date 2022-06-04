import * as dotenv from 'dotenv';

import * as workflow from './workflow';
import { listPullRequests, findPullRequestNumber, queryActualPullRequest, findActualPullRequest } from './finder';
import { getTestOctokit, getTestQueryVariables } from './test.utils';

const env = dotenv.config();

test('listPullRequests', async () => {
    const spy = jest.spyOn(workflow, 'getOctokit').mockImplementation(() => getTestOctokit());

    const vars = getTestQueryVariables(parseInt(env.parsed!.number));
    const result = await listPullRequests(vars);
    expect(result.repository.owner.login).toEqual(vars.owner);
    expect(result.repository.name).toEqual(vars.name);

    spy.mockRestore();
}, 1000 * 30);

test('findPullRequestNumber', async () => {
    const spy = jest.spyOn(workflow, 'getOctokit').mockImplementation(() => getTestOctokit());

    const vars = getTestQueryVariables(parseInt(env.parsed!.number));
    const result = await findPullRequestNumber({ ...vars, sha: 'dummy-sha' });
    expect(result).toBe(0);

    spy.mockRestore();
}, 1000 * 30);

test('queryActualPullRequest', async () => {
    const spy = jest.spyOn(workflow, 'getOctokit').mockImplementation(() => getTestOctokit());

    const vars = getTestQueryVariables(parseInt(env.parsed!.number));
    const result = await queryActualPullRequest(vars);
    expect(result.repository.owner.login).toEqual(vars.owner);
    expect(result.repository.name).toEqual(vars.name);
    expect(result.repository.pullRequest.number).toEqual(vars.number);

    console.dir(result, { depth: null });

    spy.mockRestore();
}, 1000 * 30)

test('findActualPullRequest', async () => {
    const spy = jest.spyOn(workflow, 'getOctokit').mockImplementation(() => getTestOctokit());

    const vars = getTestQueryVariables(parseInt(env.parsed!.number));
    const result1 = await findActualPullRequest({ ...vars, number: 0, sha: 'dummy-sha' });
    expect(result1).toBeNull();
    const result2 = await findActualPullRequest(vars);
    expect(result2).not.toBeNull();
    expect(result2!.repository.owner.login).toEqual(vars.owner);
    expect(result2!.repository.name).toEqual(vars.name);
    expect(result2!.repository.pullRequest.number).toEqual(vars.number);

    spy.mockRestore();
}, 1000 * 30);