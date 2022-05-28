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
	repository: Repository;
    token: string;
    channel: string;
    profiles: Profile[];
}

interface Event {
	action: string;
	pull_request: {
		base: { ref: string };
		body: string;
		changed_files: number;
		comments: number;
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
}

export type { Profile, Context, Event };
