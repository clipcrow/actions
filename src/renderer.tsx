import { Blocks, Context, Field, Fragment, Header, Section } from 'jsx-slack';
import type { Profile, ActionEvent } from './types';

const UserLink = (props: Profile) => (
	props.slack ? <a href={`@${props.slack}`} /> : <i>props.login</i>
);

const HeadlineInfo = (props: ActionEvent) => {
	const text = props.pull_request.merged ? 'merged' : 'wants to merge';
	const commits = props.pull_request.commits < 2 ? 'commit' : 'commits';
	return (
		<Section>
			<UserLink {...props.pull_request.user} />
			{` ${text} ${props.pull_request.commits} ${commits} into `}
			<code>{props.pull_request.base.ref}</code> from <code>{props.pull_request.head.ref}</code>
		</Section>
	);
}

const StatusSection = (props: { ok: boolean, text: string }) => (
	<Section>{ props.ok ? ':large_green_circle:' : ':red_circle:' } <b>{props.text}</b></Section>
);

const ReviewersInfo = (props: { reviewers: Profile[], text: string }) => {
	const count = props.reviewers.length;
	if (count == 0) {
		return null;
	}
	const postfix = count > 1 ? 'reviewers' : 'reviewer';
	return (
		<Context>
			<span>&gt; {`${count} ${props.text} ${postfix}`}</span>
			{
				props.reviewers.map((profile) => {
					return <span><UserLink {...profile}/></span>
				})
			}
		</Context>
	);
}

const ApprovalsInfo = (props: ActionEvent) => {
	const approved = 'Changes approved';
	const requested = 'Review requested';
	const no_review = 'No requested review';

	const count = props.pull_request.requested_reviewers.length;
	const approvals: Profile[] = [];  
	const pendings: Profile[] = [];

	for (const reviewer of props.pull_request.requested_reviewers) {
		if (reviewer.approved) {
			approvals.push(reviewer);
		} else {
			pendings.push(reviewer);
		}
	}
	const ok = pendings.length == 0 && count > 0;

	return (
		<Fragment>
			<StatusSection ok={ok} text={ok ? approved : (count > 0 ? requested : no_review)}/>
			<ReviewersInfo reviewers={approvals} text='approved'/>
			<ReviewersInfo reviewers={pendings} text='pending'/>
		</Fragment>
	);
}

const ConflictsInfo = (props: ActionEvent) => {
	const no_conflicts = 'This branch has no conflicts with the base branch';
	const must_be_resolved = 'This branch has conflicts that must be resolved';
	const { mergeable } = props.pull_request;
	return <StatusSection ok={mergeable} text={mergeable ? no_conflicts : must_be_resolved}/>
}

export const PullRequestInfo = (props: ActionEvent) => (
	<Blocks>
		<HeadlineInfo {...props}/>
		<Header>{props.pull_request.title}</Header>
		<Section>
			<Field><b>Pull Request:</b> <a href={props.pull_request.html_url}>#{props.pull_request.number}</a></Field>
			<Field><b>Status:</b> {props.pull_request.state}</Field>
		</Section>
		<Section>{props.pull_request.body}</Section>
		<ApprovalsInfo {...props}/>
		<ConflictsInfo {...props}/>
	</Blocks>
);

export const ActivityLog = (props: ActionEvent) => (
    //   追加ログ情報。PRのクローズ・再開、レビュワーの追加・削除、レビュー承認・却下についてBlock描画する。
    <p></p>
);
