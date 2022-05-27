import { PullRequestInfo } from './renderer';
import type { ActionEvent } from './types';

const blockSample = {
	"blocks": [
		{
			"type": "section",
			"text": {
				"type": "mrkdwn",
				"text": "<@U1234567890> wants to merge 8 commits into `develop` from `feature`"
			}
		},
		{
			"type": "header",
			"text": {
				"type": "plain_text",
				"text": "PULL REQUEST SAMPLE"
			}
		},
		{
			"type": "section",
			"fields": [
				{
					"type": "mrkdwn",
					"text": "*Pull Request:* <https://github.com/somepne/test/pull/987|#987>"
				},
				{
					"type": "mrkdwn",
					"text": "*Status:* open"
				}
			]
		},
		{
			"type": "section",
			"text": {
				"type": "mrkdwn",
				"text": "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book."
			}
		},
		{
			"type": "section",
			"text": {
				"type": "mrkdwn",
				"text": ":red_circle: *Awaiting requested review*"
			}
		},
		{
			"type": "context",
			"elements": [
				{
					"type": "mrkdwn",
					"text": "> 2 pending reviewer"
				},
				{
					"type": "mrkdwn",
					"text": "<@U5678901234>"
				},
				{
					"type": "mrkdwn",
					"text": "<@U8901234567>"
				}
			]
		},
		{
			"type": "section",
			"text": {
				"type": "mrkdwn",
				"text": ":large_green_circle: *This branch has no conflicts with the base branch*"
			}
		}
	]
};

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
        requested_reviewers: [{ login: 'another', slack: 'U5678901234', approved: false }, { login: 'nobody', slack: 'U8901234567', approved: false }],
		title: 'PULL REQUEST SAMPLE',
        state: 'open',
		user: { login: 'someone', slack: 'U1234567890' },
	}
};

test('PullRequestInfo', () => {
    console.dir(<PullRequestInfo {...eventSample} />, { depth: null });
});
