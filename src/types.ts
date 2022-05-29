import { WebClient } from '@slack/web-api';

interface Profile {
	login: string;
	slack?: string;
	approved?: boolean;
}

interface Repository {
	name: string;
	html_url: string;
	owner: {
		login: string;
		html_url: string;
	};
}

interface Context {
	client: WebClient;
	repository: Repository;
	channel: string;
	profiles: Profile[];
}

interface Event {
	action: string;
	pull_request: {
		base: { ref: string };
		body: string;
		changed_files: number;
		commits: number;
		head: { ref: string };
		html_url: string;
		mergeable: boolean;
		merged: boolean;
		number: number;
		requested_reviewers: Profile[];
		title: string;
		state: string;
		user: Profile;
	};
	repository: Repository;
	requested_reviewer?: Profile;
	review?: {
		body: string;
		html_url: string;
		state: string;
		user: Profile;
	};
	ts?: string;
}

interface QueryVariables {
	owner: string;
	name: string;
	number: number;
}

interface QueryResult {
    repository: {
        name: string;
        owner: {
            login: string;
        };
        pullRequest: {
            author: {
                login: string;
            };
            baseRefName: string;
            body: string;
            changedFiles: number;
            commits: {
                totalCount: number;
            };
            headRefName: string;
            mergeable: 'CONFLICTING' | 'MERGEABLE' | 'UNKNOWN';
            merged: boolean;
            number: number;
            reviewRequests: {
                totalCount: number;
                edges: {
                    node: {
                        requestedReviewer: {
                            login: string;
                        };
                    }
                }[];
            };
            reviews: {
                totalCount: number;
                edges: {
                    node: {
                        author: {
                            login: string;
                        };
                        state: 'APPROVED' | 'CHANGES_REQUESTED' | 'COMMENTED' | 'DISMISSED' | 'PENDING';
                        updatedAt: string;
                    };
                }[];
            };
            state: 'CLOSED' | 'MERGED' | 'OPEN';
            title: string;
            url: string;
        };
        url: string;
    }
}

export type { Profile, Repository, Context, Event, QueryVariables, QueryResult };
