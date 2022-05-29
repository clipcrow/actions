export interface ActionContext {
	owner: string;
    name: string;
    githubToken: string;
	slackToken: string;
	slackChannel: string;
	slackAccounts: { [login: string]: string; };
}

export interface Metadata {
	owner: string;
	name: string;
	number: number;
}

export interface Message {
    metadata: {
        event_type: string;
        event_payload: Metadata;
    };
    ts: string;
}

export interface ActionEventPayload {
    // GitHub Actions event & action
    event: string;
    action: string;
    // PR#
    number: number;
    reviewRequest?: ReviewRequest;
    review?: Review;
}

interface Connection<T> {
    totalCount: number;
    edges: { node: T }[];
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
    state: string, // 'APPROVED' | 'CHANGES_REQUESTED' | 'COMMENTED' | 'DISMISSED' | 'PENDING';
    updatedAt: string;
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

export type RenderModel = Omit<ActionContext, 'githubToken' | 'slackToken'> & ActionEventPayload & QueryResult & { ts?: string };
