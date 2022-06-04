import * as core from '@actions/core';
import * as github from '@actions/github';
import { Octokit } from '@octokit/core';
import { WebClient } from '@slack/web-api';

import { extractEventPayload, processEvent } from './handler';
import type { KeyValueStore, ActionContext, SlackResult } from './types';

export function getOctokit(): Octokit {
    return github.getOctokit(core.getInput('githubToken'));
}

export function getWebClient(): WebClient {
    return new WebClient(core.getInput('slackToken'));
}

export function createActionContext(): ActionContext {
    const owner = github.context.repo.owner;
    const name = github.context.repo.repo;
    const githubToken = core.getInput('githubToken');
    const slackToken = core.getInput('slackToken');
    const slackChannel = core.getInput('slackChannel');
    const emptyBodyWarning = core.getInput('emptyBodyWarning');
    const pushMessage = core.getInput('pushMessage');
    const slackAccounts: KeyValueStore<string> = JSON.parse(core.getInput('slackAccounts'));

    return {
        owner,
        name,
        githubToken,
        slackToken,
        slackChannel,
        slackAccounts,
        emptyBodyWarning,
        pushMessage,
    };
}

export async function handleEvent (): Promise<SlackResult | null> {
    const event = github.context.eventName;
    console.log(`starting handle "${event}"...`);

    const { actor, sha } = github.context;
    const ev = extractEventPayload(
        {   login: actor, url: `https://github.com/${actor}` }, // sender
        event,
        sha,
        github.context.payload,
    );

    if (ev) {
        console.log('extracted payload -');
        console.dir(ev, { depth: null });
        try {
            const cx = await createActionContext();
            console.log('created context -');
            console.dir({ ...cx, githubToken: 'privacy', slackToken: 'privacy' }, { depth: null } );

            return await processEvent(cx, ev);
        } catch(err) {
            console.log('exception -');
            console.dir(err, { depth: null })
        }
    }
    return null;
}
