export interface SlackAccounts {
    [login: string]: string;
}

export interface ActionContext {
	owner: string;
    name: string;
    githubToken: string;
	slackToken: string;
	slackChannel: string;
	slackAccounts: SlackAccounts;
}

export interface QueryVariables {
	owner: string;
	name: string;
	number: number;
}

export interface SlackMessage {
    metadata: {
        event_type: string;
        event_payload: QueryVariables;
    };
    ts: string;
}

export interface ReviewRequest {
    requestedReviewer: {
        login: string;
        url: string;
    };
}

export interface Review {
    author: {
        login: string;
        url: string;
    };
    body: string | null;
    state: string, // 'APPROVED' | 'CHANGES_REQUESTED' | 'COMMENTED' | 'DISMISSED' | 'PENDING';
    updatedAt: string;
}

export interface TriggerEventPayload {
    event: string; // GitHub Actions event & action
    action: string;
    number: number; // PR#
    reviewRequest?: ReviewRequest;
    review?: Review;
}

export interface Connection<T> {
    totalCount: number;
    edges: { node: T }[];
}

export interface QueryResult {
    repository: {
        name: string;
        owner: {
            login: string;
            url: string;
        };
        pullRequest: {
            author: {
                login: string;
                url: string;
            };
            baseRefName: string;
            body: string;
            changedFiles: number;
            commits: {
                totalCount: number;
            };
            headRefName: string;
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

export type RenderModel = Omit<ActionContext, 'githubToken' | 'slackToken' | 'slackChannel'> &
    TriggerEventPayload & QueryResult & { ts?: string };
