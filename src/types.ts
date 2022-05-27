interface Profile {
    login: string;
	slack: string;
	approved?: boolean;
}

interface ActionContext {
    token: string;
    channel: string;
    profiles: Profile[];
}

interface ActionEvent {
	action: string;
	pull_request: {
		base: { ref: string };
		body: string;
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
    requested_reviewer?: Profile;
    review?: {
        body:string;
        html_url: string;
        state: string;
        user: Profile;
    };
}

export const EmptyEvent: ActionEvent = {
	action: '',
	pull_request: {
		base: { ref: '' },
		body: '',
		commits: 0,
		head: { ref: '' },
		html_url: '',
		mergeable: false,
		merged: false,
		number: 0,
		requested_reviewers: [],
		title: '',
		state: '',
		user: {
			login: '',
			slack: '',
		},
	},
};

export type { Profile, ActionContext, ActionEvent };
