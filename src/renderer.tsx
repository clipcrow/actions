import { Blocks, Context, Divider, Field, Fragment, Header, Section } from 'jsx-slack';
import type { Profile, Event } from './types';

const UserLink = (props: Profile) => (
	props.slack ? <a href={`@${props.slack}`} /> : <i>props.login</i>
);

const Commits = (props: Event) => {
	const text = props.pull_request.merged ? 'merged' : 'wants to merge';
	const commits = props.pull_request.commits < 2 ? 'commit' : 'commits';
	return (
		<Context>
			<span>
				<UserLink {...props.pull_request.user} />
				{` ${text} ${props.pull_request.commits} ${commits} into `}
				<code>{props.pull_request.base.ref}</code> from <code>{props.pull_request.head.ref}</code>
			</span>
		</Context>
	);
}

const StatusSection = (props: { ok: boolean, text: string }) => (
	<Section>{ props.ok ? ':large_green_circle:' : ':red_circle:' } <b>{props.text}</b></Section>
);

const Reviewers = (props: { reviewers: Profile[], text: string }) => {
	
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

const Approvals = (props: Event) => {
	if (props.pull_request.state == 'closed') {
		return null;
	}
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
			<Reviewers reviewers={approvals} text='approved'/>
			<Reviewers reviewers={pendings} text='pending'/>
		</Fragment>
	);
}

const Conflicts = (props: Event) => {
	if (props.pull_request.state == 'closed') {
		return null;
	}
	const no_conflicts = 'This branch has no conflicts with the base branch';
	const must_be_resolved = 'This branch has conflicts that must be resolved';
	const { mergeable } = props.pull_request;
	return <StatusSection ok={mergeable} text={mergeable ? no_conflicts : must_be_resolved}/>
}

const Merged = (props: Event) => {
	if (props.pull_request.state == 'closed') {
		const ok = props.pull_request.merged;
		const text = ok ? 'The merge has already been completed.' : 'This pull request have been closed without merge.';
		return (<StatusSection ok={ok} text={text}/>);
	}
	return null;
}

const PullRequestNumber = (props: { html_url: string, number: number }) => (
	<Fragment><a href={props.html_url}>#{props.number}</a></Fragment>
);

const Repository = (props: Event) => {
	const { name, html_url, owner } = props.repository;
	const repo_info = (
		<Fragment>
			<a href={owner.html_url}>{owner.login}</a> &gt; <a href={html_url}>{name}</a>
		</Fragment>
	);
	return (
		<Context>
			<span>See github.com &gt; {repo_info} &gt; pull &gt; <PullRequestNumber {...props.pull_request}/></span>
		</Context>
	);
}

export const PullRequest = (props: Event) => (
	<Blocks>
		<Commits {...props}/>
		<Header>{props.pull_request.title}</Header>
		<Section>{props.pull_request.body}</Section>
		<Section>
			<Field><b>Pull Request <PullRequestNumber {...props.pull_request}/>:</b> {props.pull_request.state}</Field>
			<Field><b>Change Files:</b> {props.pull_request.changed_files}</Field>
		</Section>
		<Approvals {...props}/>
		<Conflicts {...props}/>
		<Merged {...props}/>
		<Repository {...props}/>
		<Divider/>
	</Blocks>
);
