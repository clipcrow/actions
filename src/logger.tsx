import { Blocks, Context, Section } from 'jsx-slack';
import { UserLink, Description } from './renderer';
import type { RenderModel } from './types';

export function EditedLog(props: RenderModel) {
	const { login } = props.sender;
	const slack = props.slackAccounts[login];
	return (
		<Blocks>
			<Context>
					<b><UserLink login={login} slack={slack}/> edited this body text </b>
			</Context>
		</Blocks>
	);
}

export function ClosedLog(props: RenderModel) {
	const { merged } = props.repository.pullRequest;
	if (!merged) {
		return null;
	}
	return (
		<Blocks>
			<Context>
					<b>This pull request has been closed {merged ? 'and the merge is complete' : 'without merge'}</b>
			</Context>
		</Blocks>
	);
}

export function DeployCompleteLog(props: RenderModel) {
	const { login } = props.sender;
	const slack = props.slackAccounts[login];
	const message = props.pushMessage.trim();
	return (
		<Blocks>
			<Context>
				<span>
					<b>
						The workflow launched by <UserLink login={login} slack={slack}/>
						's merge commit is complete.
					</b>
				</span>
				<span>&gt; sha: {props.sha}</span>
			</Context>
			{ message ? <Section><b>{message}</b></Section> : null }
		</Blocks>
	);
}

export function ReviewRequestedLog(props: RenderModel) {
	const { login } = props.reviewRequest!.requestedReviewer;
	const slack = props.slackAccounts[login];
	const msg = props.action === 'review_requested' ? 'Awaiting' : 'Removed';
	return (
		<Blocks>
			<Context>
				<b>{msg} requested review from <UserLink login={login} slack={slack}/></b>
			</Context>
		</Blocks>
	);
}

export function SubmittedLog(props: RenderModel) {
	const { state, author: { login }, body } = props.review!;
	const slack = props.slackAccounts[login];
	if (state === 'APPROVED') {
		const authorLogin = props.repository.pullRequest.author.login;
		const authorSlack = props.slackAccounts[authorLogin];
		return (
			<Blocks>
				<Context>
					<b><UserLink login={login} slack={slack}/> approved <UserLink
						login={authorLogin} slack={authorSlack}/>'s changes.</b>
				</Context>
				<Description text={body}/>
			</Blocks>
		);
	}
	if (body) {
		return (
			<Blocks>
				<Context>
					<b><UserLink login={login} slack={slack}/> commented.</b>
				</Context>
				<Description text={body}/>
			</Blocks>
		);
	}
	return null;
}
