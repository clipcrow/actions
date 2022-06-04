import * as dotenv from 'dotenv';
import { WebClient } from '@slack/web-api';

import { findPreviousSlackMessage, postPullRequestInfo, updatePullRequestInfo, postChangeLog } from './notifier';
import { SubmittedLog } from './renderer';
import { getTestActionContext, pullRequestReviewSubmited } from './test.utils';
import type { QueryVariables } from './types';

const env = dotenv.config();

test('notifier', async () => {
    if (!Boolean(env.parsed!.slackTest)) {
        console.log('.env.slackTest is empty')
        return;
    }

    const cx = getTestActionContext({});
    const model = pullRequestReviewSubmited;

    const result1 = await postPullRequestInfo(cx, model);
    expect(result1.ok).toBeTruthy();

    const vars: QueryVariables = {
        owner: model.owner,
        name: model.repository.name,
        number: model.repository.pullRequest.number,
    };

    const ts = await findPreviousSlackMessage(cx, vars);
    expect(ts).toEqual(result1.ts);

    const result2 = await updatePullRequestInfo(cx, model, result1.ts);
    expect(result2.ok).toBeTruthy();

    const result3 = await postChangeLog(cx, model, result2.ts, SubmittedLog);
    expect(result3?.ok).toBeTruthy();

    const client = new WebClient(cx.slackToken);
    if (result3) {
        await client.chat.delete({ token: cx.slackToken, channel: cx.slackChannel, ts: result3.ts });
    }
    if (result2.ok) {
        await client.chat.delete({ token: cx.slackToken, channel: cx.slackChannel, ts: result2.ts });
    } else {
        await client.chat.delete({ token: cx.slackToken, channel: cx.slackChannel, ts: result1.ts });
    }
}, 1000 * 60);
