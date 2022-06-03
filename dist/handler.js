"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleEvent = exports.extractPayload = exports.processEvent = exports.createRenderModel = exports.findActualPullRequest = exports.queryActualPullRequest = exports.findPullRequestNumber = exports.listPullRequests = exports.dumpSlackAccounts = exports.createActionContext = exports.readSlackAccounts = void 0;
const core = require("@actions/core");
const github = require("@actions/github");
const notifier_1 = require("./notifier");
const renderer_1 = require("./renderer");
function readSlackAccounts(input) {
    try {
        return JSON.parse(input);
    }
    catch (err) {
        core.info('' + err);
    }
    return {};
}
exports.readSlackAccounts = readSlackAccounts;
function createActionContext() {
    const owner = github.context.repo.owner;
    const name = github.context.repo.repo;
    const githubToken = core.getInput('githubToken');
    const slackToken = core.getInput('slackToken');
    const slackChannel = core.getInput('slackChannel');
    const pushMessage = core.getInput('pushMessage');
    const slackAccounts = readSlackAccounts(core.getInput('slackAccounts'));
    return {
        owner,
        name,
        githubToken,
        slackToken,
        slackChannel,
        slackAccounts,
        pushMessage,
    };
}
exports.createActionContext = createActionContext;
function dumpSlackAccounts(cx) {
    core.info('- cx.slackAccounts');
    let count = 0;
    for (const login in cx.slackAccounts) {
        core.info(`    - github: ${login}, slack: {privacy}`);
        count += 1;
    }
    core.info(`    - (total ${count} accounts)`);
}
exports.dumpSlackAccounts = dumpSlackAccounts;
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
                number
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
            for (const pullRequest of list.repository.pullRequests.nodes) {
                if (pullRequest.mergeCommit && pullRequest.mergeCommit.sha === vars.sha) {
                    core.info(`Hit! #${pullRequest.number}, sha: ${vars.sha}`);
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
function createRenderModel(cx, ev, result) {
    const { owner, slackAccounts, pushMessage } = cx;
    const { sender, event, action, reviewRequest, review, sha } = ev;
    return {
        owner, slackAccounts, pushMessage,
        sender, event, action, reviewRequest, review, sha,
        ...result,
    };
}
exports.createRenderModel = createRenderModel;
async function processEvent(cx, ev) {
    core.info('processing...');
    const vars1 = { owner: cx.owner, name: cx.name, number: ev.number, sha: ev.sha };
    core.info('finding actual pull-request...');
    core.info(JSON.stringify(vars1, null, '\t'));
    const result = await findActualPullRequest(cx.githubToken, vars1);
    if (!result) {
        core.info('Related pull-request not found!');
        return null;
    }
    // number of vars1 is 0 when "push"
    const vars2 = { ...vars1, number: result.repository.pullRequest.number };
    core.info('finding slack message...');
    core.info(JSON.stringify(vars2, null, '\t'));
    try {
        const previousTS = await (0, notifier_1.findPreviousSlackMessage)(cx, vars2);
        core.info(`previous ts: ${previousTS}`);
        const model = createRenderModel(cx, ev, result);
        core.info('posting slack message...');
        core.info(JSON.stringify(model, null, '\t'));
        const currentResult = await (0, notifier_1.postPullRequestInfo)(cx, model, previousTS);
        if (currentResult.ok) {
            core.info('success!');
            if (ev.action === 'closed') {
                core.info('posting log for "closed"...');
                return await (0, notifier_1.postChangeLog)(cx, currentResult.ts, () => (0, renderer_1.ClosedLog)(model));
            }
            if (['review_requested', 'review_request_removed'].includes(ev.action)) {
                core.info(`posting log for "${ev.action}"...`);
                return await (0, notifier_1.postChangeLog)(cx, currentResult.ts, () => (0, renderer_1.ReviewRequestedLog)(model));
            }
            if (ev.action === 'submitted') {
                core.info('posting log for "submitted"...');
                return await (0, notifier_1.postChangeLog)(cx, currentResult.ts, () => (0, renderer_1.SubmittedLog)(model));
            }
            if (ev.event === 'push') {
                core.info('posting log for "push"...');
                return await (0, notifier_1.postChangeLog)(cx, currentResult.ts, () => (0, renderer_1.DeployCompleteLog)(model));
            }
        }
        else {
            core.info(`Slack Error: ${currentResult.error}`);
        }
        return currentResult;
    }
    catch (err) {
        core.info(JSON.stringify(err, null, '\t'));
        return null;
    }
}
exports.processEvent = processEvent;
function extractPayload(sender, event, payload, sha) {
    if (event === 'push') {
        core.info('extract "push" event...');
        return { sender, event, action: '', number: 0, sha };
    }
    const action = payload.action;
    if (event === 'pull_request') {
        core.info('extract "pull_request" event...');
        if (action === 'closed') {
            core.info('extract "closed"...');
            const closedEvent = payload;
            const number = closedEvent.pull_request.number;
            const sha = github.context.sha;
            return { sender, event, action, number, sha };
        }
        if (action === 'review_requested' || action === 'review_request_removed') {
            core.info(`extract "${action}" action...`);
            const reviewerEvent = payload;
            const number = reviewerEvent.pull_request.number;
            const { login, html_url: url } = reviewerEvent.requested_reviewer;
            const reviewRequest = { requestedReviewer: { login, url } };
            return { sender, event, action, number, reviewRequest };
        }
    }
    if (event === 'pull_request_review') {
        core.info('extract "pull_request_review" event...');
        const reviewEvent = payload;
        const action = reviewEvent.action;
        core.info(`extract "${action}" action...`);
        const number = reviewEvent.pull_request.number;
        const { user: { login, html_url: url }, body, submitted_at: updatedAt } = reviewEvent.review;
        // Since it is uppercase in the definition of GitHub GraphQL, align it
        const state = (reviewEvent.review.state).toUpperCase();
        const review = { author: { login, url }, body, state, updatedAt };
        return { sender, event, action, number, review };
    }
    const caption = action ? ` > "${action}"` : '';
    core.info(`Unsupported trigger type: "${event}"${caption}`);
    return null;
}
exports.extractPayload = extractPayload;
async function handleEvent() {
    const event = github.context.eventName;
    core.info(`starting handle "${event}"...`);
    const { actor, sha } = github.context;
    const ev = extractPayload({ login: actor, url: `https://github.com/${actor}` }, event, github.context.payload, sha);
    if (ev) {
        core.info('extracted payload is');
        core.info(JSON.stringify(ev, null, '\t'));
        core.info('context creating...');
        const cx = await createActionContext();
        dumpSlackAccounts(cx);
        return await processEvent(cx, ev);
    }
    core.info(`...ending handle "${event}"`);
    return null;
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