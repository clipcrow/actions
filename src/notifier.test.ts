import * as dotenv from 'dotenv';

import * as workflow from './workflow';
import { findPreviousSlackMessage, postPullRequestInfo, updatePullRequestInfo, postChangeLog } from './notifier';
import { SubmittedLog } from './renderer';
import { getTestWebClient, pullRequestReviewSubmited } from './test.utils';
import type { QueryVariables } from './types';

const env = dotenv.config();

test('notifier', async () => {
    if (!Boolean(env.parsed!.slackTest)) {
        console.log('.env.slackTest is empty')
        return;
    }

    const spy = jest.spyOn(workflow, 'getWebClient').mockImplementation(() => getTestWebClient());

    const channel = env.parsed!.slackChannel;
    const model = pullRequestReviewSubmited;

    const result1 = await postPullRequestInfo(channel, model);
    expect(result1.ok).toBeTruthy();

    const vars: QueryVariables = {
        owner: model.owner,
        name: model.repository.name,
        number: model.repository.pullRequest.number,
    };

    const ts = await findPreviousSlackMessage(channel, vars);
    expect(ts).toEqual(result1.ts);

    const result2 = await updatePullRequestInfo(channel, model, result1.ts);
    expect(result2.ok).toBeTruthy();

    const result3 = await postChangeLog(channel, model, result2.ts, SubmittedLog);
    expect(result3?.ok).toBeTruthy();

    const client = getTestWebClient();
    if (result3) {
        await client.chat.delete({ channel, ts: result3.ts });
    }
    if (result2.ok) {
        await client.chat.delete({ channel, ts: result2.ts });
    } else {
        await client.chat.delete({ channel, ts: result1.ts });
    }

    spy.mockRestore();
}, 1000 * 60);
