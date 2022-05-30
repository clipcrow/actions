import { WebClient } from '@slack/web-api';
import type { JSX } from 'jsx-slack/jsx-runtime';

import { PullRequest } from './renderer';
import type { ActionContext, QueryVariables, RenderModel, SlackMessage } from './types';

const METADATA_EVENT_TYPE = 'prnotifier';

export async function findSlackMessage(
    cx: ActionContext,
    number: number,
): Promise<SlackMessage | undefined> {
    // Search for messages on the channel to get metadata.
    const client = new WebClient(cx.slackToken);
    const result = await client.conversations.history({
        channel: cx.slackChannel,
        include_all_metadata: true,
    });
    if (result.messages) {
        for (const message of result.messages) {
            // Search for messages using the pull request number stored in the metadata as a clue.
            if ('metadata' in message) {
                const slackMessage = (message as SlackMessage);
                // check type of application
                if (slackMessage.metadata.event_type !== METADATA_EVENT_TYPE) break;
                // check the pull request
                const { event_payload } = slackMessage.metadata;
                if (event_payload.owner !== cx.owner) break;
                if (event_payload.name !== cx.name) break;
                if (event_payload.number === number) {
                    return slackMessage;
                }
            }
        }
    }
    return undefined;
}

export async function postPullRequestInfo(
    cx: ActionContext,
    model: RenderModel,
): Promise<string | undefined> {
    const client = new WebClient(cx.slackToken);
    const event_payload: QueryVariables = {
        owner: model.owner,
        name: model.name,
        number: model.number,
    };
    const result = await client.chat.postMessage({
        channel: cx.slackChannel,
        text: 'PRNotifier posted this message.',
        blocks: PullRequest(model) as any,
        metadata: {
            event_type: METADATA_EVENT_TYPE,
            event_payload,
        }
    });
    if (result.ok) {
        return result.ts;
    }
    console.error(result.error);
}

export async function updatePullRequestInfo(
    cx: ActionContext,
    model: RenderModel,
): Promise<string | undefined> {
    if (model.ts) {
        const client = new WebClient(cx.slackToken);
        const event_payload: QueryVariables = {
            owner: model.owner,
            name: model.name,
            number: model.number,
        };
        const result = await client.chat.update({
            channel: cx.slackChannel,
            text: 'PRNotifier updated this message.',
            blocks: PullRequest(model) as any,
            metadata: {
                event_type: METADATA_EVENT_TYPE,
                event_payload,
            },
            ts: model.ts,
        });
        if (result.ok) {
            return result.ts;
        }
        console.error(result.error);
    }
    return await postPullRequestInfo(cx, model);
}

export async function postChangeLog(
    cx: ActionContext,
    ts: string,
    log: () => JSX.Element | null,
): Promise<string | undefined> {
    const blocks = log();
    if (blocks) {
        const client = new WebClient(cx.slackToken);
        const result = await client.chat.postMessage({
            channel: cx.slackChannel,
            text: 'PRNotifier posted this change log.',
            blocks: blocks as any,
            thread_ts: ts,
        });
        if (result.ok) {
            return result.ts;
        }
        console.log(result.error);
    }
}
