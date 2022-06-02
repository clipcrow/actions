import { WebClient } from '@slack/web-api';
import { JSXSlack } from 'jsx-slack';
import type { JSX } from 'jsx-slack/jsx-runtime';

import { PullRequest } from './renderer';
import type {
    ActionContext,
    QueryVariables,
    RenderModel,
    SlackMessage,
} from './types';

const METADATA_EVENT_TYPE = 'pull-request-notify';

function payloadEquals(
    payload: QueryVariables,
    vars: QueryVariables,
): boolean {
    return (
        payload.owner === vars.owner &&
        payload.name === vars.name &&
        payload.number === vars.number
    );
}

export async function findPreviousSlackMessage(
    cx: ActionContext,
    vars: QueryVariables,
): Promise<string | undefined> {
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
                if (payloadEquals(slackMessage.metadata.event_payload, vars)) {
                    return slackMessage.ts;
                }
            }
        }
    }
}

export async function postPullRequestInfo(
    cx: ActionContext,
    model: RenderModel,
    ts?: string,
): Promise<string | undefined> {
    const client = new WebClient(cx.slackToken);

    // sanitize because of dirty model
    const event_payload: QueryVariables = {
        owner: model.owner,
        name: model.repository.name,
        number: model.repository.pullRequest.number,
    };

    const param = {
        channel: cx.slackChannel,
        blocks: JSXSlack(PullRequest(model)),
        metadata: {
            event_type: METADATA_EVENT_TYPE,
            event_payload,
        },
    }
    let result;
    if (ts) {
        result = await client.chat.update({ ...param, text: 'pull-request-notify updates', ts });
    } else {
        result = await client.chat.postMessage({ ...param, text: 'pull-request-notify posts' });
    }

    if (result.ok) {
        return result.ts;
    }
    console.error(result.error);
}

export async function postChangeLog(
    cx: ActionContext,
    ts: string,
    logMessage: () => JSX.Element | null,
): Promise<string | undefined> {
    const blocks = logMessage();
    if (blocks) {
        const client = new WebClient(cx.slackToken);
        const result = await client.chat.postMessage({
            channel: cx.slackChannel,
            text: 'pull-request-notify posted this change log.',
            blocks: JSXSlack(blocks),
            thread_ts: ts,
        });
        if (result.ok) {
            return result.ts;
        }
        console.log(result.error);
    }
}
