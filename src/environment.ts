import * as core from '@actions/core';
import * as github from '@actions/github';
import * as dotenv from 'dotenv';
import { Octokit } from '@octokit/core';
import { WebClient } from '@slack/web-api';
import type { KeyValueStore, ActionContext } from './types';

const env = dotenv.config();

export function getEnv(name: string): string {
    const value = core.getInput(name);
    return value || (env.parsed ? env.parsed[name] : '');
}

export function getOctokit(): Octokit {
    return github.getOctokit(getEnv('githubToken'));
}

export function getWebClient(): WebClient {
    return new WebClient(getEnv('slackToken'));
}

export function createActionContext(owner: string, name: string): ActionContext {
    const githubToken = getEnv('githubToken');
    const slackToken = getEnv('slackToken');
    const slackChannel = getEnv('slackChannel');
    const emptyBodyWarning = getEnv('emptyBodyWarning');
    const pushMessage = getEnv('pushMessage');
    const slackAccounts: KeyValueStore<string> = JSON.parse(getEnv('slackAccounts'));

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
