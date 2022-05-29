import { Blocks, Context, Divider, Field, Fragment, Header, Section } from 'jsx-slack';
import type { RenderModel } from './types';

const UserLink = (props: { login: string, slack?: string }) => (
	props.slack ? <a href={`@${props.slack}`} /> : <i>props.login</i>
);

const Commits = (props: RenderModel) => {
	const text = props.repository.pullRequest.merged ? 'merged' : 'wants to merge';
	const commits = props.repository.pullRequest.commits.totalCount < 2 ? 'commit' : 'commits';
	return (
		<Context>
			<span>
				<UserLink {...props.repository.pullRequest.author} /> // slackアカウントを取得する
				{` ${text} ${props.repository.pullRequest.commits} ${commits} into `}
				<code>{props.repository.pullRequest.baseRefName}</code> from <code>{props.repository.pullRequest.headRefName}</code>
			</span>
		</Context>
	);
}

const StatusSection = (props: { ok: boolean, text: string }) => (
	<Section>{ props.ok ? ':large_green_circle:' : ':red_circle:' } <b>{props.text}</b></Section>
);

const Reviewers = (props: { reviewers: string[], text: string, slackAccounts: { [login: string]: string } }) => {
	const count = props.reviewers.length;
	if (count == 0) {
		return null;
	}
	const postfix = count > 1 ? 'reviewers' : 'reviewer';
	return (
		<Context>
			<span>&gt; {`${count} ${props.text} ${postfix}`}</span>
			{
				props.reviewers.map((reviewer) => {
					return <span><UserLink login={reviewer} slack={props.slackAccounts[reviewer]}/></span>
				})
			}
		</Context>
	);
}

const Approvals = (props: RenderModel) => {
	const { state } = props.repository.pullRequest;
	if (state == 'CLOSED' || state == 'MERGED') {
		return null;
	}
	const approved = 'Changes approved';
	const requested = 'Review requested';
	const no_review = 'No requested review';

	const approvals: string[] = [];  
	const pendings: string[] = [];

/*



	// TODO: レビュワーの集約をおこなう。reviewsとrequestedReviewersを計算する。

	

	for (const reviewer of props.repository.pullRequest.requested_reviewers) {
		if (reviewer.approved) {
			approvals.push(reviewer);
		} else {
			pendings.push(reviewer);
		}
	}
*/

	const ok = pendings.length == 0 && approvals.length > 0;
	const totalCount = pendings.length + approvals.length;

	return (
		<Fragment>
			<StatusSection ok={ok} text={ok ? approved : (totalCount > 0 ? requested : no_review)}/>
			<Reviewers reviewers={approvals} text='approved' slackAccounts={props.slackAccounts}/>
			<Reviewers reviewers={pendings} text='pending' slackAccounts={props.slackAccounts}/>
		</Fragment>
	);
}

const Conflicts = (props: RenderModel) => {
	if (props.repository.pullRequest.state == 'closed') {
		return null;
	}
	const no_conflicts = 'This branch has no conflicts with the base branch';
	const must_be_resolved = 'This branch has conflicts that must be resolved';
	const mergeable = props.repository.pullRequest.mergeable == 'MERGEABLE';
	return <StatusSection ok={mergeable} text={mergeable ? no_conflicts : must_be_resolved}/>
}

const Merged = (props: RenderModel) => {
	if (props.repository.pullRequest.state == 'closed') {
		const ok = props.repository.pullRequest.merged;
		const text = ok ? 'The merge has already been completed.' : 'This pull request have been closed without merge.';
		return (<StatusSection ok={ok} text={text}/>);
	}
	return null;
}

const PullRequestNumber = (props: { url: string, number: number }) => (
	<Fragment><a href={props.url}>#{props.number}</a></Fragment>
);

const Repository = (props: RenderModel) => {
	const { name, url, owner } = props.repository;
	const repo_info = (
		<Fragment>
			<a href={owner.url}>{owner.login}</a> &gt; <a href={url}>{name}</a>
		</Fragment>
	);
	return (
		<Context>
			<span>See github.com &gt; {repo_info} &gt; pull &gt; <PullRequestNumber {...props.repository.pullRequest}/></span>
		</Context>
	);
}

export const PullRequest = (props: RenderModel) => (
	<Blocks>
		<Commits {...props}/>
		<Header>{props.repository.pullRequest.title}</Header>
		<Section>{props.repository.pullRequest.body}</Section>
		<Section>
			<Field><b>Pull Request <PullRequestNumber {...props.repository.pullRequest}/>:</b> {props.repository.pullRequest.state}</Field>
			<Field><b>Change Files:</b> {props.repository.pullRequest.changedFiles}</Field>
		</Section>
		<Approvals {...props}/>
		<Conflicts {...props}/>
		<Merged {...props}/>
		<Repository {...props}/>
		<Divider/>
	</Blocks>
);

export const ChangeLog = (props: RenderModel) => (
	<Blocks>
		<Context>{props.action}</Context>
	</Blocks>
);