"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleEvent = exports.handleAction = exports.findActualPullRequest = exports.queryActualPullRequest = exports.findPullRequestNumber = exports.listPullRequests = exports.createActionContext = void 0;
const core = require("@actions/core");
const github = require("@actions/github");
const fs = require("fs/promises");
const notifier_1 = require("./notifier");
const renderer_1 = require("./renderer");
async function createActionContext() {
    const owner = github.context.repo.owner;
    const name = github.context.repo.repo;
    const githubToken = core.getInput('githubToken');
    const slackToken = core.getInput('slackToken');
    const slackChannel = core.getInput('slackChannel');
    const mergeCommitlMessage = core.getInput('mergeCommitlMessage');
    const file = await fs.readFile(core.getInput('slackAccounts'), 'utf8');
    const slackAccounts = JSON.parse(file);
    return {
        owner,
        name,
        githubToken,
        slackToken,
        slackChannel,
        slackAccounts,
        mergeCommitlMessage,
    };
}
exports.createActionContext = createActionContext;
const pull_request_list_string = `
query ($owner: String!, $name: String!) {
    repository(owner: $owner, name: $name) {
        pullRequests(last: 100) {
            nodes {
                mergeCommit {
                messageBody
                messageHeadline
                sha: oid
                }
            }
        }
    }
}
`;
async function listPullRequests(token, vars) {
    const oktokit = github.getOctokit(token);
    try {
        return await oktokit.graphql(pull_request_list_string, { ...vars });
    }
    catch (err) {
        core.info('' + err);
    }
    return null;
}
exports.listPullRequests = listPullRequests;
async function findPullRequestNumber(token, vars) {
    if (vars.sha) {
        const list = await listPullRequests(token, vars);
        if (list) {
            for (const pullRequest of list.pullRequests.nodes) {
                if (pullRequest.mergeCommit.sha === vars.sha) {
                    return pullRequest.number;
                }
            }
        }
    }
    return 0;
}
exports.findPullRequestNumber = findPullRequestNumber;
const pull_request_query_string = `
query ($owner: String!, $name: String!, $number: Int!) {
    repository(owner: $owner, name: $name) {
        name
        owner {
            login
            url
        }
        pullRequest(number: $number) {
            author {
                login
                url
            }
            baseRefName
            body
            changedFiles
            commits {
                totalCount
            }
            headRefName
            mergeCommit {
                messageBody
                messageHeadline
                sha: oid
            }
            mergeable
            merged
            number
            reviewRequests(last: 100) {
                totalCount
                edges {
                    node {
                        requestedReviewer {
                            ... on Team {
                                __typename
                                login: name
                                url
                            }
                            ... on User {
                                __typename
                                login
                                url
                            }
                        }
                    }
                }
            }
            reviews(last: 100) {
                totalCount
                edges {
                    node {
                    author {
                        login
                        url
                    }
                    body
                    state
                    updatedAt
                    }
                }
            }
            state
            title
            url
        }
        url
    }
}
`;
async function queryActualPullRequest(token, vars) {
    const oktokit = github.getOctokit(token);
    try {
        return await oktokit.graphql(pull_request_query_string, { ...vars });
    }
    catch (err) {
        core.info('' + err);
        return null;
    }
}
exports.queryActualPullRequest = queryActualPullRequest;
async function findActualPullRequest(token, vars) {
    let number = vars.number;
    if (number == 0) {
        number = await findPullRequestNumber(token, vars);
    }
    if (number == 0) {
        // PullRequest Not Found
        return null;
    }
    return await queryActualPullRequest(token, { ...vars, number });
}
exports.findActualPullRequest = findActualPullRequest;
function dumpSlackAccounts(cx) {
    core.info('- cx.slackAccounts');
    let count = 0;
    for (const login in cx.slackAccounts) {
        core.info(`    - ${login}: ${cx.slackAccounts[login]}`);
        count += 1;
    }
    core.info(`    - (total ${count} accounts)`);
}
async function handleAction(ev) {
    const cx = await createActionContext();
    dumpSlackAccounts(cx);
    const vars1 = { owner: cx.owner, name: cx.name, ...ev };
    const result = await findActualPullRequest(cx.githubToken, vars1);
    if (!result) {
        // PullRequest Not Found
        return;
    }
    // number of vars1 is 0 when "push"
    const vars2 = { ...vars1, number: result.repository.pullRequest.number };
    const previous = await (0, notifier_1.findPreviousSlackMessage)(cx, vars2);
    const model = { ...cx, ...ev, ...result, ts: previous };
    const current = await (0, notifier_1.postPullRequestInfo)(cx, model);
    if (current) {
        if (ev.action === 'closed') {
            await (0, notifier_1.postChangeLog)(cx, current, () => (0, renderer_1.ClosedLog)(model));
        }
        else if (['review_requested', 'review_request_removed'].includes(ev.action)) {
            await (0, notifier_1.postChangeLog)(cx, current, () => (0, renderer_1.ReviewRequestedLog)(model));
        }
        else if (ev.action === 'submitted') {
            await (0, notifier_1.postChangeLog)(cx, current, () => (0, renderer_1.SubmittedLog)(model));
        }
        else if (ev.event === 'push') {
            await (0, notifier_1.postChangeLog)(cx, current, () => (0, renderer_1.DeployCompleteLog)(model));
        }
    }
}
exports.handleAction = handleAction;
async function handleEvent() {
    const event = github.context.eventName;
    const action = github.context.action || '';
    let ev;
    if (event === 'pull_request') {
        if (action === 'closed') {
            const payload = github.context.payload;
            const number = payload.pull_request.number;
            const sha = github.context.sha;
            ev = { event, action, number, sha };
        }
        else if (['review_requested', 'review_request_removed'].includes(action)) {
            const payload = github.context.payload;
            const number = payload.pull_request.number;
            const { login, html_url: url } = payload.requested_reviewer;
            const reviewRequest = { requestedReviewer: { login, url } };
            ev = { event, action, number, reviewRequest };
        }
    }
    else if (event === 'pull_request_review') {
        const payload = github.context.payload;
        const number = payload.pull_request.number;
        const { user: { login, html_url: url }, body, submitted_at: updatedAt } = payload.review;
        // Since it is uppercase in the definition of GitHub GraphQL, align it
        const state = (payload.review.state).toUpperCase();
        const review = { author: { login, url }, body, state, updatedAt };
        ev = { event, action, number, review };
    }
    else if (event === 'push') {
        ev = { event, action, number: 0, sha: github.context.sha };
    }
    if (ev) {
        handleAction(ev);
    }
    else {
        const actionType = action ? ` > "${action}"` : '';
        core.info(`Unsupported trigger type: "${event}"${actionType}`);
    }
}
exports.handleEvent = handleEvent;
/*
query ($owner: String!, $name: String!, $branch: String!) {
    repository(owner: $owner, name: $name) {
        ref(qualifiedName: $branch) {
            target {
                ... on Commit {
                    history(first: 10) {
                        edges {
                            node {
                                messageBody
                                messageHeadline
                                sha: oid
                            }
                        }
                    }
                }
            }
        }
    }
}
*/
//# sourceMappingURL=handler.js.map