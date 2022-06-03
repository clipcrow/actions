"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleEvent = exports.extractPayload = exports.createActionContext = exports.processEvent = exports.createRenderModel = void 0;
const core = require("@actions/core");
const github = require("@actions/github");
const finder_1 = require("./finder");
const notifier_1 = require("./notifier");
const renderer_1 = require("./renderer");
function createRenderModel(cx, ev, result) {
    const { owner, slackAccounts, emptyBodyWarning, pushMessage } = cx;
    const { sender, event, action, reviewRequest, review, sha } = ev;
    return {
        owner, slackAccounts, emptyBodyWarning, pushMessage,
        sender, event, action, reviewRequest, review, sha,
        ...result,
    };
}
exports.createRenderModel = createRenderModel;
async function processEvent(cx, ev) {
    const vars1 = { owner: cx.owner, name: cx.name, number: ev.number, sha: ev.sha };
    console.log('QueryVariables-1:');
    console.dir(vars1, { depth: null });
    const result = await (0, finder_1.findActualPullRequest)(cx.githubToken, vars1);
    if (!result) {
        console.log('pull-request not found.');
        return null;
    }
    // number of vars1 is 0 when "push"
    const vars2 = { ...vars1, number: result.repository.pullRequest.number };
    console.log('QueryVariables-2:');
    console.dir(vars2, { depth: null });
    const previousTS = await (0, notifier_1.findPreviousSlackMessage)(cx, vars2);
    core.info(`previousTS: ${previousTS}`);
    const model = createRenderModel(cx, ev, result);
    console.log('RenderModel:');
    console.dir(model, { depth: null });
    let currentResult;
    if (previousTS) {
        currentResult = await (0, notifier_1.updatePullRequestInfo)(cx, model, previousTS);
    }
    else if (ev.upsert) {
        // ts: undefinde, upsert: true
        currentResult = await (0, notifier_1.postPullRequestInfo)(cx, model);
    }
    console.log('SlackResult:');
    console.dir(currentResult, { depth: null });
    const logTargetTS = currentResult?.ok ? currentResult.ts : previousTS;
    console.log(`logTargetTS: ${logTargetTS}`);
    if (logTargetTS && ev.logMessage) {
        return await (0, notifier_1.postChangeLog)(cx, model, logTargetTS, ev.logMessage);
    }
    return currentResult || null;
}
exports.processEvent = processEvent;
function createActionContext() {
    const owner = github.context.repo.owner;
    const name = github.context.repo.repo;
    const githubToken = core.getInput('githubToken');
    const slackToken = core.getInput('slackToken');
    const slackChannel = core.getInput('slackChannel');
    const emptyBodyWarning = core.getInput('emptyBodyWarning');
    const pushMessage = core.getInput('pushMessage');
    const slackAccounts = JSON.parse(core.getInput('slackAccounts'));
    return {
        owner,
        name,
        githubToken,
        slackToken,
        slackChannel,
        slackAccounts,
        emptyBodyWarning,
        pushMessage,
    };
}
exports.createActionContext = createActionContext;
function extractPayload(sender, event, payload, sha) {
    if (event === 'push') {
        return { sender, event, action: '', number: 0, sha, upsert: false, logMessage: renderer_1.DeployCompleteLog };
    }
    if (event === 'pull_request') {
        const pullRequestEvent = payload;
        const number = pullRequestEvent.pull_request.number;
        const action = pullRequestEvent.action;
        if (action === 'review_requested' || action === 'review_request_removed') {
            const reviewRequestEvent = payload;
            const { login, html_url: url } = reviewRequestEvent.requested_reviewer;
            const reviewRequest = { requestedReviewer: { login, url } };
            return { sender, event, action, number, reviewRequest, upsert: true };
        }
        const upsert = ['closed', 'review_requested', 'review_request_removed'].includes(action);
        if (action === 'closed') {
            return { sender, event, action, number, sha, upsert, logMessage: renderer_1.ClosedLog };
        }
        if (['review_requested', 'review_request_removed'].includes(action)) {
            return { sender, event, action, number, sha, upsert, logMessage: renderer_1.ReviewRequestedLog };
        }
        return { sender, event, action, number, sha, upsert };
    }
    if (event === 'pull_request_review') {
        const reviewEvent = payload;
        const number = reviewEvent.pull_request.number;
        const action = reviewEvent.action;
        const { user: { login, html_url: url }, body, submitted_at: updatedAt } = reviewEvent.review;
        // Since it is uppercase in the definition of GitHub GraphQL, align it
        const state = (reviewEvent.review.state).toUpperCase();
        const review = { author: { login, url }, body, state, updatedAt };
        return { sender, event, action, number, review, upsert: true, logMessage: renderer_1.SubmittedLog };
    }
    // if (event === pull_request_review_comment) { TODO: }
    console.log(`Unsupported trigger event: "${event}"`);
    return null;
}
exports.extractPayload = extractPayload;
async function handleEvent() {
    const event = github.context.eventName;
    console.log(`starting handle "${event}"...`);
    const { actor, sha } = github.context;
    const ev = extractPayload({ login: actor, url: `https://github.com/${actor}` }, // sender
    event, github.context.payload, sha);
    if (ev) {
        console.log('extracted payload -');
        console.dir(ev, { depth: null });
        try {
            const cx = await createActionContext();
            console.log('created context -');
            console.dir({ ...cx, githubToken: '{privacy}', slackToken: '{privacy}' }, { depth: null });
            return await processEvent(cx, ev);
        }
        catch (err) {
            console.log('exception -');
            console.dir(err, { depth: null });
        }
    }
    return null;
}
exports.handleEvent = handleEvent;
//# sourceMappingURL=handler.js.map