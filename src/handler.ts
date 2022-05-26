import * as core from '@actions/core';
import * as github from '@actions/github';
import type { PullRequestEvent } from '@octokit/webhooks-definitions/schema';

export function handleEvent () {
    if (github.context.eventName === 'pull_request') {
        const event = github.context.payload as PullRequestEvent;
        core.info(event.action);
    }
}
