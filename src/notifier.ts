import { WebClient } from '@slack/web-api';
import type { ActionContext } from './types';

export function findMetadata(client: WebClient, cx: ActionContext, pull_number: number): string {
    // チャンネルのメッセージを検索して、メタ情報を取得する。
    // メタ情報に保存しておいた、pull_number を手がかりに、関連するメッセージを確定。メタ情報を返す。
    return '';
}

// メタ情報から取得した元メッセージの情報に、handlerから渡されたイベント情報で状態を更新情報分を上書きする

// チャンネルに新規投稿もしくは更新投稿を行う
// ログ情報を、スレッド投稿する
