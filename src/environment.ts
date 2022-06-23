import * as core from '@actions/core';
import * as dotenv from 'dotenv';
import { graphql } from '@octokit/graphql';
import { WebClient } from '@slack/web-api';
import type { KeyValueStore, ActionContext } from './types';

const env = dotenv.config();

export function getEnv(name: string): string {
    const value = core.getInput(name);
    return value || (env.parsed ? env.parsed[name] : '');
}

export function getGraphQL(): typeof graphql {
    return graphql.defaults({
        headers: {
            authorization: `token ${getEnv('githubToken')}`,
        },
    });
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
