import * as dotenv from 'dotenv';

import { queryActualPullRequest } from './finder';
import type { QueryVariables } from './types';

jest.setTimeout(5000 * 30);
const env = dotenv.config();

test('queryActualPullRequest', async () => {
    const variables: QueryVariables = {
        owner: env.parsed!.owner,
        name: env.parsed!.name,
        number: parseInt(env.parsed!.number),
    };
    const result = await queryActualPullRequest(env.parsed!.githubToken, variables);
    expect(result!.repository.owner.login).toEqual(variables.owner);
    expect(result!.repository.name).toEqual(variables.name);
    expect(result!.repository.pullRequest.number).toEqual(variables.number);

    console.dir(result, { depth: null });
})
