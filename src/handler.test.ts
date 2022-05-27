import * as core from '@actions/core';
import * as github from '@actions/github';

import { createActionContext, handleEvent } from './handler';

test('event PoC', () => {
    const submitted = require('./event/pull_request_review.submitted.json');
    const closed = require('./event/pull_request.closed.json');
    const opened = require('./event/pull_request.opened.json');
    const removed = require('./event/pull_request.review_request_removed.json');
    const requested = require('./event/pull_request.review_requested.json');

    // pull_number
    expect(submitted.pull_request.number).toBe(1);
    expect(closed.pull_request.number).toBe(1);
    expect(opened.pull_request.number).toBe(1);
    expect(removed.pull_request.number).toBe(1);
    expect(requested.pull_request.number).toBe(1);
})


test('createContext', async () => {
    github.context.eventName = 'pull_request';
    github.context.payload = require('./event/pull_request.opened.json');
    const spy = jest.spyOn(core, 'getInput').mockImplementation((arg: string) => {
        return {
            token: 'xoxb-123456789-1234',
            channel: 'C56789X1234',
            path: 'src/repository/accounts.json',
        }[arg] || 'n/a';
    });

    const cx = await createActionContext();

    expect(cx.token).toEqual('xoxb-123456789-1234');
    expect(cx.channel).toEqual('C56789X1234');
    expect(cx.profiles[0]).toEqual({ login:'someone', slack: 'U1234567890' });
    expect(cx.profiles[1]).toEqual({ login: 'another', slack: 'U5678901234' });
    expect(cx.profiles[2]).toEqual({ login: 'nobody', slack: 'U8901234567' });

    spy.mockRestore();
});

test('handleEvent', async () => {
    github.context.eventName = 'push';
    const spy = jest.spyOn(core, 'info');

    await handleEvent();

    expect(spy.mock.calls.length).toBe(1);

    spy.mockRestore();
});

