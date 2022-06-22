import * as core from 'https://esm.sh/@actions/core@1.9.0';
import * as github from 'https://esm.sh/@actions/github@5.0.3';
import * as dotenv from 'https://esm.sh/dotenv@16.0.1';
import { assertEquals } from 'https://deno.land/std@0.144.0/testing/asserts.ts';

import { createActionContext } from './workflow.ts';

const env = dotenv.config();
/*
Deno.test('createActionContext', async () => {
    github.context.eventName = 'pull_request';
//    github.context.payload = require('./pull_request.review_requested.test.json');
    const slackAccounts = await Deno.readFile('src/slackAccounts.test.json');
    const spy = jest.spyOn(core, 'getInput').mockImplementation((arg: string) => {
        return {
            githubToken: 'ghp_abcdefghijklmnopqrstuvwxyz0123456789',
            slackToken: 'xoxb-123456789-1234',
            slackChannel: 'C56789X1234',
            slackAccounts,
        }[arg] || 'n/a';
    });

    const cx = createActionContext();

    assertEquals(cx.githubToken, 'ghp_abcdefghijklmnopqrstuvwxyz0123456789');
    assertEquals(cx.slackToken, 'xoxb-123456789-1234');
    assertEquals(cx.slackChannel, 'C56789X1234');
    assertEquals(cx.slackAccounts['someone'], 'U1234567890');
    assertEquals(cx.slackAccounts['another'], 'U5678901234');
    assertEquals(cx.slackAccounts['nobody'], 'U8901234567');

    spy.mockRestore();
});
*/
