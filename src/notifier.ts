import { WebClient } from '@slack/web-api';
import { JSXSlack } from 'jsx-slack';
import { JSX } from 'jsx-slack/jsx-runtime';

import { PullRequest } from './renderer';
import type { Context, Message, RenderModel } from './types';

const METADATA_EVENT_TYPE = 'prnotifier';

export async function findMetadata(cx: Context, pull_number: number): Promise<Message | undefined> {
    // Search for messages on the channel to get metadata.
    const client = new WebClient(cx.slackToken);
    const result = await client.conversations.history({
        channel: cx.slackChannel,
        include_all_metadata: true,
    });
    if (result.messages) {
        for (const message of result.messages) {
            // Search for messages using the pull_number stored in the metadata as a clue.
            if ('metadata' in message) {
                const { metadata } = (message as Message);
                if ('owner' in metadata && 'name' in metadata && 'number' in metadata) {
                    // check type of application
                    if (metadata.event_type !== METADATA_EVENT_TYPE) break;
                    
                    // check owner && repository
                    if (metadata.event_payload.owner !== cx.owner) break;
                    if (metadata.event_payload.name !== cx.name) break;
                    
                    // check the pull request number
                    if (metadata.event_payload.number == pull_number) {
                        return (message as Message);
                    }
                }
            }
        }
    }
    return undefined;
}

export async function postPullRequestInfo(cx: Context, model: RenderModel): Promise<string | undefined> {
    const client = new WebClient(cx.slackToken);
    const result = await client.chat.postMessage({
        channel: cx.slackChannel,
        text: 'PRNotifier posted this message.',
        blocks: JSXSlack(PullRequest(model)),
        metadata: {
            event_type: METADATA_EVENT_TYPE,
            event_payload: model,
        }
    });
    if (result.ok) {
        return result.ts;
    }
    console.log(result.error);
}

export async function updatePullRequestInfo(cx: Context, model: RenderModel): Promise<string | undefined> {
    if (model.ts) {
        const client = new WebClient(cx.slackToken);
        const result = await client.chat.update({
            channel: cx.slackChannel,
            text: 'PRNotifier updated this message.',
            blocks: JSXSlack(PullRequest(model)),
            metadata: {
                event_type: METADATA_EVENT_TYPE,
                event_payload: model,
            },
            ts: model.ts,
        });
        if (result.ok) {
            return result.ts;
        }
        console.log(result.error);
    }
    return await postPullRequestInfo(cx, model);
}


export async function postChangeLog(cx: Context, ts: string, log: () => JSX.Element): Promise<string | undefined> {
    const client = new WebClient(cx.slackToken);
    const result = await client.chat.postMessage({
        channel: cx.slackChannel,
        text: 'PRNotifier posted this change log.',
        blocks: JSXSlack(log()),
        thread_ts: ts,
    });
    if (result.ok) {
        return result.ts;
    }
    console.log(result.error);
}
