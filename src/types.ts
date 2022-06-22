import type { JSX } from 'https://esm.sh/jsx-slack@5.0.0/jsx-runtime';

export type Connection<T> = {
    totalCount: number;
    edges: { node: T }[];
};

export type KeyValueStore<T> = {
    [key: string]: T;
};

export type ActionContext = {
    owner: string;
    name: string;
    githubToken: string;
    slackToken: string;
    slackChannel: string;
    slackAccounts: KeyValueStore<string>;
    emptyBodyWarning: string;
    pushMessage: string;
};

export type QueryVariables = {
    owner: string;
    name: string;
    number: number;
    sha?: string;
};

export type GitHubUser = {
    login: string;
    url: string;
};

export type SlackResult = {
    ok: boolean;
    error: string;
    ts: string;
    api: string;
};

export type ReviewRequest = {
    requestedReviewer: GitHubUser;
};

export type Review = {
    author: GitHubUser;
    body: string | null;
    state: string; // 'APPROVED' | 'CHANGES_REQUESTED' | 'COMMENTED' | 'DISMISSED' | 'PENDING';
    updatedAt: string;
};

export type CheckRun = {
    name: string;
    conclusion: string;
};

export type Commit = {
    messageBody: string | null;
    messageHeadline: string | null;
    sha: string;
    checkSuites: Connection<CheckRun>;
};

export type LogMessage = {
    (props: RenderModel): JSX.Element | null;
};

export type EventPayload = {
    sender: GitHubUser;
    event: string; // GitHub Actions event & action
    action: string;
    number: number; // PR#
    upsert: boolean; // true: chat.update with ts & chat.postMessage without ts / false: chat.update with ts only
    reviewRequest?: ReviewRequest;
    review?: Review;
    sha?: string; // === gihub.context.sha === github.context.payload.pull_request.merge_commit_sha
    logMessage?: LogMessage;
};

export type PullRequest<C extends Partial<Commit>> = {
    author: GitHubUser;
    baseRefName: string;
    body: string | null;
    changedFiles: number;
    commits: Connection<C>;
    headRefName: string;
    mergeCommit: C | null;
    mergeable: string; // 'CONFLICTING' | 'MERGEABLE' | 'UNKNOWN';
    merged: boolean;
    number: number;
    reviewRequests: Connection<ReviewRequest>;
    reviews: Connection<Review>;
    state: string; // 'CLOSED' | 'MERGED' | 'OPEN';
    title: string;
    url: string;
};

export type QueryResult = {
    repository: {
        name: string;
        owner: GitHubUser;
        pullRequest: PullRequest<Commit>;
        url: string;
    };
};

export type RenderModel =
    & Omit<ActionContext, 'name' | 'githubToken' | 'slackToken' | 'slackChannel'>
    & Omit<EventPayload, 'number' | 'upsert'>
    & QueryResult;
