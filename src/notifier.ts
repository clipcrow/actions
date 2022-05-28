import { WebClient } from '@slack/web-api';

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
    const client = new WebClient(cx.token);
    const result = await client.conversations.history({
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
                
                // check owner / repository
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

// メタ情報から取得した元メッセージの情報に、handlerから渡されたイベント情報で状態を更新情報分を上書きする

// チャンネルに新規投稿もしくは更新投稿を行う
// ログ情報を、スレッド投稿する
