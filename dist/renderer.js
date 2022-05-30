"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubmittedLog = exports.ReviewRequestedLog = exports.ClosedLog = exports.PullRequest = exports.arrangeReviewers = void 0;
const jsx_runtime_1 = require("jsx-slack/jsx-runtime");
const jsx_slack_1 = require("jsx-slack");
const UserLink = (props) => (props.slack ? (0, jsx_runtime_1.jsx)("a", { href: `@${props.slack}` }) : (0, jsx_runtime_1.jsx)("i", { children: props.login }));
const Commits = (props) => {
    const { merged, commits: { totalCount }, author: { login }, baseRefName, headRefName, } = props.repository.pullRequest;
    const text = merged ? 'merged' : 'wants to merge';
    const unit = totalCount < 2 ? 'commit' : 'commits';
    return ((0, jsx_runtime_1.jsx)(jsx_slack_1.Context, { children: (0, jsx_runtime_1.jsxs)("span", { children: [(0, jsx_runtime_1.jsx)(UserLink, { login: login, slack: props.slackAccounts[login] }), ` ${text} ${totalCount} ${unit} into `, (0, jsx_runtime_1.jsx)("code", { children: baseRefName }), " from ", (0, jsx_runtime_1.jsx)("code", { children: headRefName })] }) }));
};
const StatusSection = (props) => ((0, jsx_runtime_1.jsxs)(jsx_slack_1.Section, { children: [props.test ? ':large_green_circle:' : ':red_circle:', " ", (0, jsx_runtime_1.jsx)("b", { children: props.text })] }));
const Reviewers = (props) => {
    const count = props.reviewers.length;
    if (count == 0) {
        return null;
    }
    const unit = count > 1 ? 'reviewers' : 'reviewer';
    return ((0, jsx_runtime_1.jsxs)(jsx_slack_1.Context, { children: [(0, jsx_runtime_1.jsxs)("span", { children: ["> ", `${count} ${props.text} ${unit}`] }), props.reviewers.map((login) => {
                return (0, jsx_runtime_1.jsx)("span", { children: (0, jsx_runtime_1.jsx)(UserLink, { login: login, slack: props.slackAccounts[login] }) });
            })] }));
};
function arrangeReviewers(req, rv) {
    const pendings = req.edges.map((edge) => {
        return edge.node.requestedReviewer.login;
    });
    const submitters = rv.edges.reduce((previous, current) => {
        const { author: { login }, state } = current.node;
        if (pendings.includes(login)) {
            return previous;
        }
        return { ...previous, [login]: state };
    }, {});
    const approvals = [];
    for (const login in submitters) {
        if (submitters[login] === 'APPROVED') {
            approvals.push(login);
        }
        else {
            pendings.push(login);
        }
    }
    return { pendings, approvals };
}
exports.arrangeReviewers = arrangeReviewers;
const pr_approved = 'Changes approved';
const rv_requested = 'Review requested';
const no_review = 'No requested review';
const Approvals = (props) => {
    const { state, reviewRequests, reviews } = props.repository.pullRequest;
    if (state !== 'OPEN') {
        return null;
    }
    const { pendings, approvals } = arrangeReviewers(reviewRequests, reviews);
    const test = pendings.length == 0 && approvals.length > 0;
    const totalCount = pendings.length + approvals.length;
    return ((0, jsx_runtime_1.jsxs)(jsx_slack_1.Fragment, { children: [(0, jsx_runtime_1.jsx)(StatusSection, { test: test, text: test ? pr_approved : (totalCount > 0 ? rv_requested : no_review) }), (0, jsx_runtime_1.jsx)(Reviewers, { reviewers: approvals, text: 'approved', slackAccounts: props.slackAccounts }), (0, jsx_runtime_1.jsx)(Reviewers, { reviewers: pendings, text: 'pending', slackAccounts: props.slackAccounts })] }));
};
const no_conflicts = 'This branch has no conflicts with the base branch';
const must_be_resolved = 'This branch has conflicts that must be resolved';
const already_merged = 'The merge has already been completed.';
const closed_without_merge = 'This pull request have been closed without merge.';
const Conflicts = (props) => {
    const { state, mergeable, merged } = props.repository.pullRequest;
    if (state !== 'OPEN') {
        const text = merged ? already_merged : closed_without_merge;
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
const PullRequest = (props) => {
    const { url, number, state, changedFiles } = props.repository.pullRequest;
    // TODO: display workflow status.
    return ((0, jsx_runtime_1.jsxs)(jsx_slack_1.Blocks, { children: [(0, jsx_runtime_1.jsx)(Commits, { ...props }), (0, jsx_runtime_1.jsx)(jsx_slack_1.Header, { children: props.repository.pullRequest.title }), (0, jsx_runtime_1.jsx)(jsx_slack_1.Section, { children: props.repository.pullRequest.body })] }));
};
exports.PullRequest = PullRequest;
const ClosedLog = (props) => {
    const { merged } = props.repository.pullRequest;
    if (!merged) {
        return null;
    }
    return ((0, jsx_runtime_1.jsx)(jsx_slack_1.Blocks, { children: (0, jsx_runtime_1.jsx)(jsx_slack_1.Context, { children: (0, jsx_runtime_1.jsxs)("b", { children: ["This pull request was closed ", merged ? 'and was merged' : 'without merge'] }) }) }));
};
exports.ClosedLog = ClosedLog;
const ReviewRequestedLog = (props) => {
    const { login } = props.reviewRequest.requestedReviewer;
    const slack = props.slackAccounts[login];
    const msg = props.action === 'review_requested' ? 'Awaiting' : 'Removed';
    return ((0, jsx_runtime_1.jsx)(jsx_slack_1.Blocks, { children: (0, jsx_runtime_1.jsx)(jsx_slack_1.Context, { children: (0, jsx_runtime_1.jsxs)("b", { children: [msg, " requested review from", (0, jsx_runtime_1.jsx)(UserLink, { login: login, slack: slack })] }) }) }));
};
exports.ReviewRequestedLog = ReviewRequestedLog;
const SubmittedLog = (props) => {
    const { state, author: { login } } = props.review;
    if (state !== 'APPROVED') {
        return null;
    }
    const slack = props.slackAccounts[login];
    const authorLogin = props.repository.pullRequest.author.login;
    const authorSlack = props.slackAccounts[authorLogin];
    return ((0, jsx_runtime_1.jsx)(jsx_slack_1.Blocks, { children: (0, jsx_runtime_1.jsx)(jsx_slack_1.Context, { children: (0, jsx_runtime_1.jsxs)("b", { children: [" ", (0, jsx_runtime_1.jsx)(UserLink, { login: login, slack: slack }), " approved ", (0, jsx_runtime_1.jsx)(UserLink, { login: authorLogin, slack: authorSlack }), "'s changes."] }) }) }));
};
exports.SubmittedLog = SubmittedLog;
//# sourceMappingURL=renderer.js.map