import { Blocks, Context, Divider, Field, Fragment, Header, Section } from 'jsx-slack';
import type { SlackAccounts, RenderModel } from './types';

const UserLink = (props: { login: string, slackAccount?: string }) => (
	props.slackAccount ? <a href={`@${props.slackAccount}`} /> : <i>props.login</i>
);

const Commits = (props: RenderModel) => {
	const { merged, commits: { totalCount }, author: { login }, baseRefName, headRefName } = props.repository.pullRequest;
	const text = merged ? 'merged' : 'wants to merge';
	const unit = totalCount < 2 ? 'commit' : 'commits';
	return (
		<Context>
			<span>
				<UserLink login={login} slackAccount={props.slackAccounts[login]} />
				{` ${text} ${totalCount} ${unit} into `}
				<code>{baseRefName}</code> from <code>{headRefName}</code>
			</span>
		</Context>
	);
}

const StatusSection = (props: { test: boolean, text: string }) => (
	<Section>{ props.test ? ':large_green_circle:' : ':red_circle:' } <b>{props.text}</b></Section>
);

const Reviewers = (props: { reviewers: string[], text: string, slackAccounts: SlackAccounts }) => {
	const count = props.reviewers.length;
	if (count == 0) {
		return null;
	}
	const unit = count > 1 ? 'reviewers' : 'reviewer';
	return (
		<Context>
			<span>&gt; {`${count} ${props.text} ${unit}`}</span>
			{
				props.reviewers.map((login) => {
					return <span><UserLink login={login} slackAccount={props.slackAccounts[login]}/></span>
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

	const test = pendings.length == 0 && approvals.length > 0;
	const totalCount = pendings.length + approvals.length;

	return (
		<Fragment>
			<StatusSection test={test} text={test ? approved : (totalCount > 0 ? requested : no_review)}/>
			<Reviewers reviewers={approvals} text='approved' slackAccounts={props.slackAccounts}/>
			<Reviewers reviewers={pendings} text='pending' slackAccounts={props.slackAccounts}/>
		</Fragment>
	);
}

const no_conflicts = 'This branch has no conflicts with the base branch';
const must_be_resolved = 'This branch has conflicts that must be resolved';

const Conflicts = (props: RenderModel) => {
	const { state, mergeable, merged } = props.repository.pullRequest;
	if (state !== 'OPEN') {
		const text = merged ? 'The merge has already been completed.' : 'This pull request have been closed without merge.';
		return (<StatusSection test={merged} text={text}/>);
	}
	const test = mergeable === 'MERGEABLE';
	return <StatusSection test={test} text={test ? no_conflicts : must_be_resolved}/>
}

const PullNumber = (props: { url: string, number: number }) => (
	<Fragment><a href={props.url}>#{props.number}</a></Fragment>
);

const Repository = (props: RenderModel) => {
	const { name, url, owner, pullRequest } = props.repository;
	const repo = (
		<Fragment>See github.com &gt; <a href={owner.url}>{owner.login}</a> &gt; <a href={url}>{name}</a></Fragment>
	);
	return (
		<Context>
			<span>{repo} &gt; pull &gt; <PullNumber url={pullRequest.url} number={pullRequest.number}/></span>
		</Context>
	);
}

export const PullRequest = (props: RenderModel) => {
	const { url, number, state, changedFiles } = props.repository.pullRequest;
	return (
		<Blocks>
			<Commits {...props}/>
			<Header>{props.repository.pullRequest.title}</Header>
			<Section>{props.repository.pullRequest.body}</Section>
			<Section>
				<Field><b>Pull Request <PullNumber url={url} number={number}/>:</b> {state}</Field>
				<Field><b>Change Files:</b> {changedFiles}</Field>
			</Section>
			<Approvals {...props}/>
			<Conflicts {...props}/>
			<Repository {...props}/>
			<Divider/>
		</Blocks>
	);
};

export const ChangeLog = (props: RenderModel) => (
	<Blocks>
		<Context>{props.action}</Context>
	</Blocks>
);