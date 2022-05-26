import * as core from '@actions/core';
import * as github from '@actions/github';
import * as fs from 'fs/promises';

import type {
    PullRequestEvent,
    PullRequestReviewEvent
} from '@octokit/webhooks-definitions/schema';

interface Accounts {
    [github: string]: string;
}

interface ActionContext {
    token: string;
    channel: string;
    accounts: Accounts;
}

export async function createContext(): Promise<ActionContext> {
    const token = core.getInput('token');
    const channel = core.getInput('channel');
    const file = await fs.readFile(core.getInput('path'), 'utf8');
    const accounts = JSON.parse(file);

    return { token, channel, accounts };    
}

export function handlePullRequestEvent() {
    const { action, pull_request } = github.context.payload as PullRequestEvent;
    if (action === 'review_requested') {
        // レビュワーが追加された
        // 初めてのレビュワーだったらメッセージ投稿、そうでなければレビュワー描画を更新＋ログ
        // レビュワーへ特別なメンション
    } else if (action === 'review_request_removed') {
        // レビュワーが削除された
        // レビュワー描画を更新＋ログ
    } else if (action === 'closed') { 
        // PRがクローズした
        if (pull_request.merged) {
            // PRがマージされたためにクローズした
            // PR描画を更新＋ログ
        } else {
            // PRをマージせずにクローズした
            // PR描画を更新＋ログ
        }
    } else if (action === 'reopened') {
        // 一旦クローズされたPRが再度オープンになった。
        // PR描画を更新＋ログ。レビュワーには既にメンションされているはずなので、ログで通知が飛ぶ。 
    }
    core.info(action!);
}

export function handlePullRequestReviewEvent() {
    const { action, review } = github.context.payload as PullRequestReviewEvent;
    if (action === 'submitted') {
        if (review.state === 'approved') {
            // 承認された。
            // レビュワー描画を更新＋ログ
            // 全員が承認していたら、プルリク作成者へ特別なメンション
        }
    } 
    core.info(action!);
}

export async function handleEvent () {
    const { eventName } = github.context;
    if (eventName === 'pull_request') {
        handlePullRequestEvent();
    } else if (eventName === 'pull_request_review') {
        handlePullRequestReviewEvent();
    } else {
        core.info(`Unsupported trigger type: "${eventName}"`);
    }
}

export type { ActionContext };