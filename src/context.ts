import * as core from '@actions/core';
import * as fs from 'fs/promises';

interface SlackAccounts {
    [github: string]: string;
}

interface SlackContext {
    channel: string;
    accounts: SlackAccounts;
}

export async function createSlackContext(): Promise<SlackContext> {
    const file = await fs.readFile(core.getInput('path'), 'utf8');
    const accounts = JSON.parse(file);
    const channel = core.getInput('channel');
    return { channel, accounts };    
}

export type { SlackContext };