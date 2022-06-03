import { WebClient } from '@slack/web-api';
import { findPreviousSlackMessage, postPullRequestInfo, updatePullRequestInfo, postChangeLog } from './notifier';
import { SubmittedLog } from './renderer';
import { getTestQueryVariables, getTestActionContext, sampleRenderModel } from './utils.test';
import type { RenderModel } from './types';

test.skip('notifier', async () => {
    const cx = getTestActionContext({});

    const result1 = await postPullRequestInfo(cx, sampleRenderModel);
    expect(result1.ok).toBeTruthy();

    const ts = await findPreviousSlackMessage(cx, getTestQueryVariables());
    expect(ts).toEqual(result1.ts);


    const update: RenderModel = {
        ...sampleRenderModel,
        review: {
            author: {
                login: "nobody",
                url: "https://github.com/nobody",
            },
            body: '',
            state: 'APPROVED',
            updatedAt: '',
        },
    };

    const result2 = await updatePullRequestInfo(cx, update, result1.ts);
    expect(result2.ok).toBeTruthy();

    const result3 = await postChangeLog(cx, update, result2.ts, SubmittedLog);
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
