import { Blocks, Context, Divider, Field, Fragment, Header, Section } from 'jsx-slack';
import type { SlackAccounts, Connection, ReviewRequest, Review, RenderModel } from './types';

const UserLink = (props: { login: string, slack?: string }) => (
	props.slack ? <a href={`@${props.slack}`} /> : <i>{props.login}</i>
);

const Commits = (props: RenderModel) => {
	const {
		merged,
		commits: { totalCount },
		author: { login },
		baseRefName,
		headRefName,
	} = props.repository.pullRequest;
	const text = merged ? 'merged' : 'wants to merge';
	const unit = totalCount < 2 ? 'commit' : 'commits';
	return (
		<Context>
			<span>
				<UserLink login={login} slack={props.slackAccounts[login]} />
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
					return <span><UserLink login={login} slack={props.slackAccounts[login]}/></span>
				})
			}
		</Context>
	);
}

export function arrangeReviewers(req: Connection<ReviewRequest>, rv: Connection<Review>):
	{ pendings: string[], approvals: string[] }
{
	const pendings: string[] = req.edges.map((edge) => {
		return edge.node.requestedReviewer.login;
	});
	const submitters = rv.edges.reduce<{ [login: string]: string }>((previous, current) => {
        const { author: { login }, state } = current.node;
        if (pendings.includes(login)) {
            return previous;
        }
        return { ...previous, [login]: state };
	}, {});
    const approvals: string[] = [];
    for (const login in submitters) {
        if (submitters[login] === 'APPROVED') {
            approvals.push(login);
        } else {
            pendings.push(login);
        }
    }
	return { pendings, approvals };
}

const pr_approved = 'Changes approved';
const rv_requested = 'Review requested';
const no_review = 'No requested review';

const Approvals = (props: RenderModel) => {
	const { state, reviewRequests, reviews } = props.repository.pullRequest;
	if (state !== 'OPEN') {
		return null;
	}

	const { pendings, approvals } = arrangeReviewers(reviewRequests, reviews);
	const test = pendings.length == 0 && approvals.length > 0;
	const totalCount = pendings.length + approvals.length;

	return (
		<Fragment>
			<StatusSection test={test} text={test ? pr_approved : (totalCount > 0 ? rv_requested : no_review)}/>
			<Reviewers reviewers={approvals} text='approved' slackAccounts={props.slackAccounts}/>
			<Reviewers reviewers={pendings} text='pending' slackAccounts={props.slackAccounts}/>
		</Fragment>
	);
}

const no_conflicts = 'This branch has no conflicts with the base branch';
const must_be_resolved = 'This branch has conflicts that must be resolved';
const already_merged = 'The merge has already been completed.'
const closed_without_merge = 'This pull request have been closed without merge.';

const Conflicts = (props: RenderModel) => {
	const { state, mergeable, merged } = props.repository.pullRequest;
	if (state !== 'OPEN') {
		const text = merged ? already_merged  : closed_without_merge;
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
	// TODO: display workflow status.
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

export const ClosedLog = (props: RenderModel) => (
	<Blocks>
		<Context>{props.action}</Context>
	</Blocks>
);

export const ReviewRequestedLog = (props: RenderModel) => (
	<Blocks>
		<Context>{props.action}</Context>
	</Blocks>
);

export const SubmittedLog = (props: RenderModel) => (
	<Blocks>
		<Context>{props.action}</Context>
	</Blocks>
);
