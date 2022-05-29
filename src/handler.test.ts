import * as core from '@actions/core';
import * as github from '@actions/github';

import { createContext, handleEvent } from './handler';

test('check files', () => {
    const submitted = require('./event/pull_request_review.submitted.json');
    const closed = require('./event/pull_request.closed.json');
    const removed = require('./event/pull_request.review_request_removed.json');
    const requested = require('./event/pull_request.review_requested.json');

    expect(submitted.pull_request.number).toBe(1);
    expect(closed.pull_request.number).toBe(1);
    expect(removed.pull_request.number).toBe(1);
    expect(requested.pull_request.number).toBe(1);
})


test('createContext', async () => {
    github.context.eventName = 'pull_request';
    github.context.payload = require('./event/pull_request.review_requested.json');
    const spy = jest.spyOn(core, 'getInput').mockImplementation((arg: string) => {
        return {
            slackToken: 'xoxb-123456789-1234',
            slackChannel: 'C56789X1234',
            slackAccounts: 'src/repository/accounts.json',
        }[arg] || 'n/a';
    });

    const cx = await createContext();

    expect(cx.slackToken).toEqual('xoxb-123456789-1234');
    expect(cx.slackChannel).toEqual('C56789X1234');
    expect(cx.slackAccounts['someone']).toEqual('U1234567890');
    expect(cx.slackAccounts['another']).toEqual('U5678901234');
    expect(cx.slackAccounts['nobody']).toEqual('U8901234567');

    spy.mockRestore();
});

test('handleEvent', async () => {
    github.context.eventName = 'push';
    const spy = jest.spyOn(core, 'info');

    await handleEvent();

    expect(spy.mock.calls.length).toBe(1);

    spy.mockRestore();
});
