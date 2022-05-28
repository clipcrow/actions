import { PullRequestInfo } from './renderer';
import type { ActionEvent } from './types';

const eventSample: ActionEvent = {
    action: 'submitted',
	pull_request: {
		base: { ref: 'develop' },
		body: `Lorem Ipsum is simply dummy text of the printing and typesetting industry.
            Lorem Ipsum has been the industry's standard dummy text ever since the 1500s,
            when an unknown printer took a galley of type and scrambled it to make a type specimen book.`,
        commits: 8,
		head: { ref: 'feature' },
        html_url: 'https://github.com/someone/test/pull/987',
        mergeable: true,
        merged: false,
        number: 987,
        requested_reviewers: [{ login: 'another', slack: 'U5678901234', approved: true }, { login: 'nobody', slack: 'U8901234567', approved: true }],
		title: 'PULL REQUEST SAMPLE',
        state: 'open',
		user: { login: 'someone', slack: 'U1234567890' },
	}
};

test('PullRequestInfo', () => {
    console.dir(<PullRequestInfo {...eventSample} />, { depth: null });
});
