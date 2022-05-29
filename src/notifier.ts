import { JSXSlack } from 'jsx-slack';

import { PullRequestInfo } from './renderer';
import type { Context, Event } from './types';

const METADATA_EVENT_TYPE = 'prnotifier';

interface MessageWithMetadata {
    metadata: {
        event_type: string;
        event_payload: Event;
    };
    ts: string;
}

export async function findMetadata(cx: Context, pull_number: number): Promise<Event | undefined> {
    // Search for messages on the channel to get metadata.
    const result = await cx.client.conversations.history({
        channel: cx.channel,
        include_all_metadata: true,
    });
    if (result.messages) {
        for (const message of result.messages) {
            // Search for messages using the pull_number stored in the metadata as a clue.
            if ('metadata' in message) {
                const { metadata, ts } = (message as MessageWithMetadata);
                // check type of application
                if (metadata.event_type !== METADATA_EVENT_TYPE) break;
                
                // check owner && repository
                if (metadata.event_payload.repository.owner.login !== cx.repository.owner.login) break;
                if (metadata.event_payload.repository.name !== cx.repository.name) break;
                
                // check the pull request number
                if (metadata.event_payload.pull_request.number == pull_number) {
                    return { ... metadata.event_payload, ts }
                }
            }
        }
    }
    return undefined;
}

function hiddenText(url: string, post: boolean): string {
    return `PRNotifier ${post ? 'posted' : 'updated'} this message. ${url}`;
}

export async function postPullRequestInfo(cx: Context, event: Event): Promise<string | undefined> {
    const result = await cx.client.chat.postMessage({
        channel: cx.channel,
        text: hiddenText(event.pull_request.html_url, true),
        blocks: JSXSlack(PullRequestInfo(event)),
        metadata: {
            event_type: METADATA_EVENT_TYPE,
            event_payload: event,
        }
    });
    if (result.ok) {
        return result.ts;
    }
    console.log(result.error);
}

export async function updatePullRequestInfo(cx: Context, event: Event): Promise<string | undefined> {
    if (event.ts) {
        const result = await cx.client.chat.update({
            channel: cx.channel,
            text: hiddenText(event.pull_request.html_url, false),
            blocks: JSXSlack(PullRequestInfo(event)),
            metadata: {
                event_type: METADATA_EVENT_TYPE,
                event_payload: event,
            },
            ts: event.ts,
        });
        if (result.ok) {
            return result.ts;
        }
        console.log(result.error);
    }
    return await postPullRequestInfo(cx, event);
}


export async function postLogInfo(cx: Context, ts: string, log: () => string): Promise<string | undefined> {
    const result = await cx.client.chat.postMessage({
        channel: cx.channel,
        mrkdwn: true,
        text: log(),
        thread_ts: ts,
    });
    if (result.ok) {
        return result.ts;
    }
    console.log(result.error);
}
