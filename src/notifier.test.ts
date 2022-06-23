import { getWebClient, getEnv } from './environment';
import { findPreviousSlackMessage, postPullRequestInfo, updatePullRequestInfo, postChangeLog } from './notifier';
import { SubmittedLog } from './logger';
import { pullRequestReviewSubmited } from './test.utils';
import type { QueryVariables } from './types';

test('notifier', async () => {
    if (!Boolean(getEnv('slackTest'))) {
        console.log('.env.slackTest is empty')
        return;
    }

    const channel = getEnv('slackChannel');
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

    const client = getWebClient();
    if (result3) {
        await client.chat.delete({ channel, ts: result3.ts });
    }
    if (result2.ok) {
        await client.chat.delete({ channel, ts: result2.ts });
    } else {
        await client.chat.delete({ channel, ts: result1.ts });
    }
}, 1000 * 60);
