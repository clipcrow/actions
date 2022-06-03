import { WebClient, ChatPostMessageResponse, ChatUpdateResponse } from '@slack/web-api';
import { JSXSlack } from 'jsx-slack';

import { PullRequest } from './renderer';
import type { ActionContext, QueryVariables, RenderModel, SlackResult, LogMessage } from './types';

const METADATA_EVENT_TYPE = 'pull-request-notify';

interface SlackMessage {
    metadata: {
        event_type: string;
        event_payload: QueryVariables;
    };
    ts: string;
}

export async function findPreviousSlackMessage(cx: ActionContext, vars: QueryVariables): Promise<string | null> {
    // Search for messages on the channel to get metadata.
    const client = new WebClient(cx.slackToken);
    const result = await client.conversations.history({
        channel: cx.slackChannel,
        include_all_metadata: true,
        limit: 100,
    });

    if (result.ok && result.messages) {
        for (const message of result.messages) {
            // Search for messages using the pull request number stored in the metadata as a clue.
            if ('metadata' in message) {
                const slackMessage = (message as SlackMessage);
                // check type of application
                if (slackMessage.metadata.event_type !== METADATA_EVENT_TYPE) break;
                // check the pull request
                const { event_payload } = slackMessage.metadata;
                const actual = slackMessage.metadata.event_payload;
                if (actual.owner === vars.owner && actual.name === vars.name && actual.number === vars.number) {
                    return slackMessage.ts;
                }
            }
        }
    }
    return null;
}

export function createSlackCallPayload(channel: string, model: RenderModel) {
    // sanitize dirty model
    const event_payload: QueryVariables = {
        owner: model.owner,
        name: model.repository.name,
        number: model.repository.pullRequest.number,
    };

    return {
        channel,
        blocks: JSXSlack(PullRequest(model)),
        metadata: {
            event_type: METADATA_EVENT_TYPE,
            event_payload,
        },
    }
}

function createSlackResult(result: ChatPostMessageResponse | ChatUpdateResponse, api: string): SlackResult {
    return { ok: !!result.ok, error: result.error || '', ts: result.ts || '', api };
}

export async function postPullRequestInfo(cx: ActionContext, model: RenderModel): Promise<SlackResult> {
    const client = new WebClient(cx.slackToken);
    const param = {
        ...createSlackCallPayload(cx.slackChannel, model),
        text: 'pull-request-notify posts',
    };
    console.log('postPullRequestInfo:');
    console.dir({ ...param, channel: 'privacy' }, { depth: null });

    return createSlackResult(await client.chat.postMessage(param), 'chat.postMessage');
}

export async function updatePullRequestInfo(cx: ActionContext, model: RenderModel, ts: string): Promise<SlackResult> {
    const client = new WebClient(cx.slackToken);
    const param = {
        ...createSlackCallPayload(cx.slackChannel, model),
        text: 'pull-request-notify updates',
        ts,
    };
    console.log('updatePullRequestInfo:');
    console.dir({ ...param, channel: 'privacy' }, { depth: null });

    return createSlackResult(await client.chat.update(param), 'chat.update');
}

export async function postChangeLog(
    cx: ActionContext, model: RenderModel, ts: string, logMessage: LogMessage,
): Promise<SlackResult | null> {
    const blocks = logMessage(model);
    if (blocks) {
        const client = new WebClient(cx.slackToken);
        const param = {
            channel: cx.slackChannel,
            text: 'pull-request-notify posted this change log.',
            blocks: JSXSlack(blocks),
            thread_ts: ts,
        };
        console.log('postChangeLog:');
        console.dir({ ...param, channel: 'privacy' }, { depth: null });

        return createSlackResult(await client.chat.postMessage(param), 'chat.postMessage');
    }
    return null;
}
