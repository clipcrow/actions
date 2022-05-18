import * as core from '@actions/core'
import * as github from '@actions/github'
import { IssuesEvent } from '@octokit/webhooks-definitions/schema'

export function handleEvent () {
    if (github.context.eventName === 'issues') {
        const event = github.context.payload as IssuesEvent;
        core.info(event.action);
    }
}

handleEvent();
