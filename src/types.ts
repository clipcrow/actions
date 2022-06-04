import type { JSX } from 'jsx-slack/jsx-runtime';

export interface Connection<T> {
    totalCount: number;
    edges: { node: T }[];
}

export interface KeyValueStore<T> {
    [key: string]: T;
}

export interface ActionContext {
	owner: string;
    name: string;
    githubToken: string;
	slackToken: string;
	slackChannel: string;
	slackAccounts: KeyValueStore<string>;
    emptyBodyWarning: string;
    pushMessage: string;
}

export interface QueryVariables {
	owner: string;
	name: string;
	number: number;
    sha?: string;
}

export interface GitHubUser {
    login: string;
    url: string;
}

export interface SlackResult {
    ok: boolean;
    error: string;
    ts: string;
    api: string;
}

export interface ReviewRequest {
    requestedReviewer: GitHubUser;
}

export interface Review {
    author: GitHubUser;
    body: string | null;
    state: string, // 'APPROVED' | 'CHANGES_REQUESTED' | 'COMMENTED' | 'DISMISSED' | 'PENDING';
    updatedAt: string;
}

export interface CheckRun {
    name: string;
    conclusion: string;
}

export interface Commit {
    messageBody: string | null;
    messageHeadline: string | null;
    sha: string;
    checkSuites: Connection<CheckRun>;
}

export interface LogMessage {
    (props: RenderModel): JSX.Element | null;
}

export interface EventPayload {
    sender: GitHubUser;
    event: string; // GitHub Actions event & action
    action: string;
    number: number; // PR#
    upsert: boolean; // true: chat.update with ts & chat.postMessage without ts / false: chat.update with ts only
    reviewRequest?: ReviewRequest;
    review?: Review;
    sha?: string; // === gihub.context.sha === github.context.payload.pull_request.merge_commit_sha
    logMessage?: LogMessage;
}

export interface PullRequest<T> {
    author: GitHubUser;
    baseRefName: string;
    body: string | null;
    changedFiles: number;
    commits: Connection<T>;
    headRefName: string;
    mergeCommit: T | null;
    mergeable: string, // 'CONFLICTING' | 'MERGEABLE' | 'UNKNOWN';
    merged: boolean;
    number: number;
    reviewRequests: Connection<ReviewRequest>;
    reviews: Connection<Review>;
    state: string, // 'CLOSED' | 'MERGED' | 'OPEN';
    title: string;
    url: string;
}

export interface QueryResult {
    repository: {
        name: string;
        owner: GitHubUser;
        pullRequest: PullRequest<Commit>;
        url: string;
    }
}

export type RenderModel =
    Omit<ActionContext, 'name' | 'githubToken' | 'slackToken' | 'slackChannel'> &
    Omit<EventPayload, 'number' | 'upsert'> &
    QueryResult;
