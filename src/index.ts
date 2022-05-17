import * as core from '@actions/core';
import * as github from '@actions/github';
import { PushEvent } from '@octokit/webhooks-definitions/schema';

if (github.context.eventName === 'push') {
    const pushPayload = github.context.payload as PushEvent;
    core.info(`The head commit is: ${pushPayload.head_commit?.message}`);
}