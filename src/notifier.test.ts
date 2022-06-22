import * as dotenv from 'https://esm.sh/dotenv@16.0.1';
import { assertEquals } from 'https://deno.land/std@0.144.0/testing/asserts.ts';

import { findPreviousSlackMessage, postChangeLog, postPullRequestInfo, updatePullRequestInfo } from './notifier.ts';
import { SubmittedLog } from './logger.tsx';
import { getTestWebClient, pullRequestReviewSubmited } from './test.utils.ts';
import type { QueryVariables } from './types.ts';

const env = dotenv.config();

Deno.test('notifier', async () => {
    if (!Boolean(env.parsed!.slackTest)) {
        console.log('.env.slackTest is empty');
        return;
    }

    const channel = env.parsed!.slackChannel;
    const model = pullRequestReviewSubmited;

    const result1 = await postPullRequestInfo(channel, model);
    assertEquals(result1.ok, true);

    const vars: QueryVariables = {
        owner: model.owner,
        name: model.repository.name,
        number: model.repository.pullRequest.number,
    };

    const ts = await findPreviousSlackMessage(channel, vars);
    assertEquals(ts, result1.ts);

    const result2 = await updatePullRequestInfo(channel, model, result1.ts);
    assertEquals(result2.ok, true);

    const result3 = await postChangeLog(channel, model, result2.ts, SubmittedLog);
    assertEquals(result3?.ok, true);

    const client = getTestWebClient();
    if (result3) {
        await client.chat.delete({ channel, ts: result3.ts });
    }
    if (result2.ok) {
        await client.chat.delete({ channel, ts: result2.ts });
    } else {
        await client.chat.delete({ channel, ts: result1.ts });
    }
});
