import * as core from '@actions/core';
import * as github from '@actions/github';
import * as dotenv from 'dotenv';
import * as fs from 'fs/promises';

import { createActionContext } from './handler';

jest.setTimeout(5000 * 30);
const env = dotenv.config();

test('createActionContext', async () => {
    github.context.eventName = 'pull_request';
    github.context.payload = require('./event/pull_request.review_requested.json');
    const slackAccounts = await fs.readFile('src/repository/accounts.json', 'utf-8');
    const spy = jest.spyOn(core, 'getInput').mockImplementation((arg: string) => {
        return {
            githubToken: 'ghp_abcdefghijklmnopqrstuvwxyz0123456789',
            slackToken: 'xoxb-123456789-1234',
            slackChannel: 'C56789X1234',
            slackAccounts,
        }[arg] || 'n/a';
    });

    const cx = createActionContext();

    expect(cx.githubToken).toEqual('ghp_abcdefghijklmnopqrstuvwxyz0123456789');
    expect(cx.slackToken).toEqual('xoxb-123456789-1234');
    expect(cx.slackChannel).toEqual('C56789X1234');
    expect(cx.slackAccounts['someone']).toEqual('U1234567890');
    expect(cx.slackAccounts['another']).toEqual('U5678901234');
    expect(cx.slackAccounts['nobody']).toEqual('U8901234567');

    spy.mockRestore();
});
