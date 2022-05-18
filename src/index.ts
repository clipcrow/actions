import * as core from '@actions/core';
import * as github from '@actions/github';
import { IssuesEvent } from '@octokit/webhooks-definitions/schema';

export function handleEvent(event: IssuesEvent): string {
    return '';
}

if (github.context.eventName === 'issues') {
    const event = github.context.payload as IssuesEvent;
    core.info(JSON.stringify(event));
    handleEvent(event);
}
