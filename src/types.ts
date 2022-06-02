export interface KeyValueStore {
    [login: string]: string;
}

export interface ActionContext {
	owner: string;
    name: string;
    githubToken: string;
	slackToken: string;
	slackChannel: string;
	slackAccounts: KeyValueStore;
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

export interface SlackMessage {
    metadata: {
        event_type: string;
        event_payload: QueryVariables;
    };
    ts: string;
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

export interface Commit {
    messageBody: string | null;
    messageHeadline: string | null;
    sha: string;
}

export interface EventPayload {
    sender: GitHubUser;
    event: string; // GitHub Actions event & action
    action: string;
    number: number; // PR#
    reviewRequest?: ReviewRequest;
    review?: Review;
    sha?: string; // === gihub.context.sha === github.context.payload.pull_request.merge_commit_sha
}

export interface PullRequestList {
    pullRequests: {
        nodes: {
            number: number;
            mergeCommit: Commit;
        }[];
    }
}

export interface Connection<T> {
    totalCount: number;
    edges: { node: T }[];
}

export interface QueryResult {
    repository: {
        name: string;
        owner: GitHubUser;
        pullRequest: {
            author: GitHubUser;
            baseRefName: string;
            body: string | null;
            changedFiles: number;
            commits: {
                totalCount: number;
            };
            headRefName: string;
            mergeCommit: Commit | null;
            mergeable: string, // 'CONFLICTING' | 'MERGEABLE' | 'UNKNOWN';
            merged: boolean;
            number: number;
            reviewRequests: Connection<ReviewRequest>;
            reviews: Connection<Review>;
            state: string, // 'CLOSED' | 'MERGED' | 'OPEN';
            title: string;
            url: string;
        };
        url: string;
    }
}

export type RenderModel =
    Pick<ActionContext, 'owner' | 'slackAccounts' | 'pushMessage'> &
    Pick<EventPayload, 'sender' | 'event' | 'action' | 'reviewRequest' | 'review'> &
    QueryResult;
