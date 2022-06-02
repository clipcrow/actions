"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeployCompleteLog = exports.SubmittedLog = exports.ReviewRequestedLog = exports.ClosedLog = exports.PullRequest = exports.arrangeReviewers = void 0;
const jsx_runtime_1 = require("jsx-slack/jsx-runtime");
const jsx_slack_1 = require("jsx-slack");
const UserLink = (props) => (props.slack ? (0, jsx_runtime_1.jsx)("a", { href: `@${props.slack}` }) : (0, jsx_runtime_1.jsx)("i", { children: props.login }));
const BranchLink = (props) => {
    if (props.static) {
        return (0, jsx_runtime_1.jsx)("code", { children: props.ref });
    }
    return ((0, jsx_runtime_1.jsx)("code", { children: (0, jsx_runtime_1.jsx)("a", { href: `${props.url}/tree/${props.ref}`, children: props.ref }) }));
};
const Commits = (props) => {
    const { url, pullRequest: { merged, state, commits: { totalCount }, changedFiles, author: { login }, baseRefName: base, headRefName: head, } } = props.repository;
    const text = merged ? ' merged' : ' wants to merge';
    const commitUnit = totalCount < 2 ? 'commit' : 'commits';
    const changeUnit = changedFiles < 2 ? 'change' : 'changes';
    return ((0, jsx_runtime_1.jsx)(jsx_slack_1.Context, { children: (0, jsx_runtime_1.jsxs)("span", { children: ["[", (0, jsx_runtime_1.jsx)("b", { children: state }), "] ", (0, jsx_runtime_1.jsx)(UserLink, { login: login, slack: props.slackAccounts[login] }), ` ${text} ${totalCount} ${commitUnit} (${changedFiles} file ${changeUnit}) into `, (0, jsx_runtime_1.jsx)(BranchLink, { url: url, ref: base }), " from ", (0, jsx_runtime_1.jsx)(BranchLink, { url: url, ref: head, static: merged })] }) }));
};
const StatusSection = (props) => ((0, jsx_runtime_1.jsxs)(jsx_slack_1.Section, { children: [props.test ? ':large_green_circle:' : ':red_circle:', " ", (0, jsx_runtime_1.jsx)("b", { children: props.text })] }));
const Reviewers = (props) => {
    const count = props.reviewers.length;
    if (count == 0) {
        return null;
    }
    return ((0, jsx_runtime_1.jsxs)(jsx_slack_1.Context, { children: [(0, jsx_runtime_1.jsxs)("span", { children: ["> ", `${count} ${props.text}`] }), props.reviewers.map((login) => {
                return (0, jsx_runtime_1.jsx)("span", { children: (0, jsx_runtime_1.jsx)(UserLink, { login: login, slack: props.slackAccounts[login] }) });
            })] }));
};
function arrangeReviewers(req, rv) {
    const requestedReviewer = req.edges.reduce((previous, current) => {
        return { ...previous, [current.node.requestedReviewer.login]: 'PENDING' };
    }, {});
    // Caution! here is "reduceRight"
    const reviewDetails = rv.edges.reduceRight((previous, current) => {
        const { author: { login }, state } = current.node;
        // Prohibit excessive overwriting
        if (previous[login]) {
            return previous;
        }
        return { ...previous, [login]: state };
    }, requestedReviewer);
    return Object.keys(reviewDetails).reduce((previous, current) => {
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
exports.arrangeReviewers = arrangeReviewers;
const pr_approved = 'Changes approved';
const no_review = 'No requested review';
const ch_requested = 'Changes requested';
const rv_requested = 'Review requested';
const Approvals = (props) => {
    const { state, reviewRequests, reviews } = props.repository.pullRequest;
    if (state !== 'OPEN') {
        return null;
    }
    const { approvals, changeRequesteds, pendings } = arrangeReviewers(reviewRequests, reviews);
    const everybodyApproved = approvals.length > 0 && changeRequesteds.length == 0 && pendings.length == 0;
    let text = '';
    if (approvals.length > 0 && changeRequesteds.length == 0 && pendings.length == 0) {
        text = pr_approved;
    }
    else {
        if (approvals.length + changeRequesteds.length + pendings.length == 0) {
            text = no_review;
        }
        else if (changeRequesteds.length > 0) {
            text = ch_requested;
        }
        else {
            text = rv_requested;
        }
    }
    const unit = (list) => (list.length > 1 ? 's' : '');
    return ((0, jsx_runtime_1.jsxs)(jsx_slack_1.Fragment, { children: [(0, jsx_runtime_1.jsx)(StatusSection, { test: everybodyApproved, text: text }), (0, jsx_runtime_1.jsx)(Reviewers, { slackAccounts: props.slackAccounts, reviewers: approvals, text: `approval${unit(approvals)}` }), (0, jsx_runtime_1.jsx)(Reviewers, { slackAccounts: props.slackAccounts, reviewers: changeRequesteds, text: `review${unit(approvals)} requesting changes` }), (0, jsx_runtime_1.jsx)(Reviewers, { slackAccounts: props.slackAccounts, reviewers: pendings, text: `pending reviewer${unit(approvals)}` })] }));
};
const no_conflicts = 'This branch has no conflicts with the base branch';
const must_be_resolved = 'This branch has conflicts that must be resolved';
const merge_completed = 'The merge is complete';
const closed_without_merge = 'This pull request have been closed without merge.';
const Conflicts = (props) => {
    const { state, mergeable, merged } = props.repository.pullRequest;
    if (state !== 'OPEN') {
        const text = merged ? merge_completed : closed_without_merge;
        return ((0, jsx_runtime_1.jsx)(StatusSection, { test: merged, text: text }));
    }
    const test = mergeable === 'MERGEABLE';
    return (0, jsx_runtime_1.jsx)(StatusSection, { test: test, text: test ? no_conflicts : must_be_resolved });
};
const PullNumber = (props) => ((0, jsx_runtime_1.jsx)(jsx_slack_1.Fragment, { children: (0, jsx_runtime_1.jsxs)("a", { href: props.url, children: ["#", props.number] }) }));
const Repository = (props) => {
    const { name, url, owner, pullRequest } = props.repository;
    const repo = ((0, jsx_runtime_1.jsxs)(jsx_slack_1.Fragment, { children: ["See github.com > ", (0, jsx_runtime_1.jsx)("a", { href: owner.url, children: owner.login }), " > ", (0, jsx_runtime_1.jsx)("a", { href: url, children: name })] }));
    return ((0, jsx_runtime_1.jsx)(jsx_slack_1.Context, { children: (0, jsx_runtime_1.jsxs)("span", { children: [repo, " > pull > ", (0, jsx_runtime_1.jsx)(PullNumber, { url: pullRequest.url, number: pullRequest.number })] }) }));
};
const Description = (props) => (props.text ? (0, jsx_runtime_1.jsx)(jsx_slack_1.Section, { children: (0, jsx_runtime_1.jsx)("pre", { children: props.text }) }) : null);
const PullRequest = (props) => {
    const { url, number, body } = props.repository.pullRequest;
    // TODO pushイベントへのリアクション
    return ((0, jsx_runtime_1.jsxs)(jsx_slack_1.Blocks, { children: [(0, jsx_runtime_1.jsx)(Commits, { ...props }), (0, jsx_runtime_1.jsx)(jsx_slack_1.Header, { children: props.repository.pullRequest.title }), (0, jsx_runtime_1.jsx)(jsx_slack_1.Context, { children: (0, jsx_runtime_1.jsx)(PullNumber, { url: url, number: number }) }), (0, jsx_runtime_1.jsx)(Description, { text: body }), (0, jsx_runtime_1.jsx)(Approvals, { ...props }), (0, jsx_runtime_1.jsx)(Conflicts, { ...props }), (0, jsx_runtime_1.jsx)(Repository, { ...props }), (0, jsx_runtime_1.jsx)(jsx_slack_1.Divider, {})] }));
};
exports.PullRequest = PullRequest;
const ClosedLog = (props) => {
    const { merged } = props.repository.pullRequest;
    if (!merged) {
        return null;
    }
    return ((0, jsx_runtime_1.jsx)(jsx_slack_1.Blocks, { children: (0, jsx_runtime_1.jsx)(jsx_slack_1.Context, { children: (0, jsx_runtime_1.jsxs)("b", { children: ["This pull request has been closed ", merged ? 'and the merge is complete' : 'without merge'] }) }) }));
};
exports.ClosedLog = ClosedLog;
const ReviewRequestedLog = (props) => {
    const { login } = props.reviewRequest.requestedReviewer;
    const slack = props.slackAccounts[login];
    const msg = props.action === 'review_requested' ? 'Awaiting' : 'Removed';
    return ((0, jsx_runtime_1.jsx)(jsx_slack_1.Blocks, { children: (0, jsx_runtime_1.jsx)(jsx_slack_1.Context, { children: (0, jsx_runtime_1.jsxs)("b", { children: [msg, " requested review from ", (0, jsx_runtime_1.jsx)(UserLink, { login: login, slack: slack })] }) }) }));
};
exports.ReviewRequestedLog = ReviewRequestedLog;
const SubmittedLog = (props) => {
    const { state, author: { login }, body } = props.review;
    const slack = props.slackAccounts[login];
    if (state === 'APPROVED') {
        const authorLogin = props.repository.pullRequest.author.login;
        const authorSlack = props.slackAccounts[authorLogin];
        return ((0, jsx_runtime_1.jsxs)(jsx_slack_1.Blocks, { children: [(0, jsx_runtime_1.jsx)(jsx_slack_1.Context, { children: (0, jsx_runtime_1.jsxs)("b", { children: [" ", (0, jsx_runtime_1.jsx)(UserLink, { login: login, slack: slack }), " approved ", (0, jsx_runtime_1.jsx)(UserLink, { login: authorLogin, slack: authorSlack }), "'s changes."] }) }), (0, jsx_runtime_1.jsx)(Description, { text: body })] }));
    }
    if (body) {
        return ((0, jsx_runtime_1.jsxs)(jsx_slack_1.Blocks, { children: [(0, jsx_runtime_1.jsx)(jsx_slack_1.Context, { children: (0, jsx_runtime_1.jsxs)("b", { children: [" ", (0, jsx_runtime_1.jsx)(UserLink, { login: login, slack: slack }), " commented."] }) }), (0, jsx_runtime_1.jsx)(Description, { text: body })] }));
    }
    return null;
};
exports.SubmittedLog = SubmittedLog;
const DeployCompleteLog = (props) => {
    // TODO 実装
    return null;
};
exports.DeployCompleteLog = DeployCompleteLog;
//# sourceMappingURL=renderer.js.map