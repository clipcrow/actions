import {
	Blocks,
	Context,
	Divider,
	Fragment,
	Header,
	Section,
} from 'jsx-slack';

import type {
	KeyValueStore,
	Connection,
	ReviewRequest,
	Review,
	RenderModel
} from './types';

const UserLink = (
	props: {
		login: string,
		slack?: string,
	},
) => (
	props.slack ? <a href={`@${props.slack}`} /> : <i>{props.login}</i>
);

const BranchLink = (
	props: {
		url: string,
		ref: string,
		static?: boolean,
	},
) => {
	if (props.static) {
		return <code>{props.ref}</code>
	}
	return (
		<code>
			<a href={`${props.url}/tree/${props.ref}`}>{props.ref}</a>
		</code>
	);
};

const Commits = (props: RenderModel) => {
	const {
		url,
		pullRequest: {
			merged,
			state,
			commits: { totalCount },
			changedFiles,
			author: { login },
			baseRefName: base,
			headRefName: head,
		}
	} = props.repository;
	const text = merged ? ' merged' : ' wants to merge';
	const commitUnit = totalCount < 2 ? 'commit' : 'commits';
	const changeUnit = changedFiles < 2 ? 'change' : 'changes';
	return (
		<Context>
			<span>
				[<b>{state}</b>] <UserLink login={login} slack={props.slackAccounts[login]} />
				{` ${text} ${totalCount} ${commitUnit} (${changedFiles} file ${changeUnit}) into `}
				<BranchLink url={url} ref={base}/> from <BranchLink url={url} ref={head} static={merged}/>
			</span>
		</Context>
	);
}

const StatusSection = (
	props: {
		test: boolean,
		text: string,
	},
) => (
	<Section>{ props.test ? ':large_green_circle:' : ':red_circle:' } <b>{props.text}</b></Section>
);

const Reviewers = (
	props: {
		slackAccounts: KeyValueStore,
		reviewers: string[],
		text: string,
	},
) => {
	const count = props.reviewers.length;
	if (count == 0) {
		return null;
	}
	return (
		<Context>
			<span>&gt; {`${count} ${props.text}`}</span>
			{
				props.reviewers.map((login) => {
					return <span><UserLink login={login} slack={props.slackAccounts[login]}/></span>
				})
			}
		</Context>
	);
}

interface ArrangeResult {
	approvals: string[];
	changeRequesteds: string[];
	pendings: string[];
}

export function arrangeReviewers(
	req: Connection<ReviewRequest>,
	rv: Connection<Review>,
): ArrangeResult {
	const requestedReviewer: KeyValueStore = req.edges.reduce<KeyValueStore>((previous, current) => {
		return { ...previous, [current.node.requestedReviewer.login]: 'PENDING' };
	}, {});
	// Caution! here is "reduceRight"
	const reviewDetails = rv.edges.reduceRight<KeyValueStore>((previous, current) => {
        const { author: { login }, state } = current.node;
		// Prohibit excessive overwriting
        if (previous[login]) {
            return previous;
        }
        return { ...previous, [login]: state };
	}, requestedReviewer);
	return Object.keys(reviewDetails).reduce<ArrangeResult>((previous, current) => {
		const state = reviewDetails[current];
		if (state === 'APPROVED') {
			return { ...previous, approvals: [...previous.pendings, current] };
		}
		if (state === 'CHANGES_REQUESTED') {
			return { ...previous, changeRequesteds: [...previous.pendings, current] };
		}
		if (state === 'PENDING') {
			return { ...previous, pendings: [...previous.pendings, current] };
		}
		return previous;
	}, { approvals: [], changeRequesteds: [], pendings: [] });
}

const pr_approved = 'Changes approved';
const no_review = 'No requested reviewer';
const ch_requested = 'Changes requested'
const rv_requested = 'Review requested';

const Approvals = (props: RenderModel,) => {
	const { state, reviewRequests, reviews } = props.repository.pullRequest;
	if (state !== 'OPEN') {
		return null;
	}

	const { approvals, changeRequesteds, pendings } = arrangeReviewers(reviewRequests, reviews);
	const everybodyApproved = approvals.length > 0 && changeRequesteds.length == 0 && pendings.length == 0;
	let text = '';
	if (approvals.length > 0 && changeRequesteds.length == 0 && pendings.length == 0) {
		text = pr_approved;
	} else {
		if (approvals.length + changeRequesteds.length + pendings.length == 0) {
			text = no_review;
		} else if (changeRequesteds.length > 0) {
			text = ch_requested;
		} else {
			text = rv_requested;
		}
	}
	const unit = (list: string[]) => (list.length > 1 ? 's' : '');
	return (
		<Fragment>
			<StatusSection test={everybodyApproved} text={text}/>
			<Reviewers slackAccounts={props.slackAccounts}
				reviewers={approvals} text={`approval${unit(approvals)}`}/>
			<Reviewers slackAccounts={props.slackAccounts}
				 reviewers={changeRequesteds} text={`reviewer${unit(approvals)} requested changes`}/>
			<Reviewers slackAccounts={props.slackAccounts}
				reviewers={pendings} text={`pending reviewer${unit(approvals)}`}/>
		</Fragment>
	);
}

const no_conflicts = 'This branch has no conflicts with the base branch';
const must_be_resolved = 'This branch has conflicts that must be resolved';
const merge_completed = 'The merge is complete'
const closed_without_merge = 'This pull request have been closed without merge.';

const Conflicts = (props: RenderModel) => {
	const { state, mergeable, merged } = props.repository.pullRequest;
	if (state !== 'OPEN') {
		const text = merged ? merge_completed  : closed_without_merge;
		return (<StatusSection test={merged} text={text}/>);
	}
	const test = mergeable === 'MERGEABLE';
	return <StatusSection test={test} text={test ? no_conflicts : must_be_resolved}/>
}

const PullNumber = (
	props: {
		url: string,
		number: number,
	},
) => (
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

const Title = (
	props: {
		text: string | null,
	},
) => (
	props.text ? <Header>{props.text}</Header> : null
);

const Description = (
	props: {
		text: string | null,
	},
) => (
	props.text ? <Section><pre>{props.text}</pre></Section> : null
);

export const PullRequest = (props: RenderModel) => {
	const { url, number, body } = props.repository.pullRequest;

	return (
		<Blocks>
			<Commits {...props}/>
			<Title text={props.repository.pullRequest.title}/>
			<Context><PullNumber url={url} number={number}/></Context>
			<Description text={body}/>
			<Approvals {...props}/>
			<Conflicts {...props}/>
			<Repository {...props}/>
			<Title text={props.event === 'push' ? props.pushMessage : null}/>
			<Divider/>
		</Blocks>
	);
};

export const ClosedLog = (props: RenderModel) => {
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
};

export const ReviewRequestedLog = (props: RenderModel) => {
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
};

export const SubmittedLog = (props: RenderModel) => {
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
};

export const DeployCompleteLog = (props: RenderModel) => {
	const { login } = props.sender;
	const slack = props.slackAccounts[login];
	return (
		<Blocks>
			<Context>
				<b>The workflow launched by <UserLink login={login} slack={slack}/> 's merge commit is complete.</b>
			</Context>
			<Context>sha: {props.sha}</Context>
		</Blocks>
	);
}