import * as core from '@actions/core';
import * as github from '@actions/github';

import { handleEvent } from './handler';

test('handleEvent', () => {
    github.context.eventName = 'pull_request';
    github.context.payload = require('./event/pull_request.opened.json');
    const spy = jest.spyOn(core, 'info');

    handleEvent();

    expect(spy.mock.calls[0].at(0)).toEqual('opened');
    spy.mockRestore();
});
