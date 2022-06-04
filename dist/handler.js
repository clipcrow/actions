"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractPayload = exports.processEvent = exports.createRenderModel = void 0;
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
    console.log('QueryVariables-1 -');
    console.dir(vars1, { depth: null });
    const result = await (0, finder_1.findActualPullRequest)(vars1);
    if (!result) {
        console.log('pull-request not found.');
        return null;
    }
    // number of vars1 is 0 when "push"
    const vars2 = { ...vars1, number: result.repository.pullRequest.number };
    console.log('QueryVariables-2 -');
    console.dir(vars2, { depth: null });
    const previousTS = await (0, notifier_1.findPreviousSlackMessage)(cx, vars2);
    console.log(`previousTS: ${previousTS}`);
    const model = createRenderModel(cx, ev, result);
    console.log('RenderModel:');
    console.dir(model, { depth: null });
    let currentResult;
    if (previousTS) {
        currentResult = await (0, notifier_1.updatePullRequestInfo)(cx, model, previousTS);
    }
    else if (ev.upsert) {
        // ts: undefined, upsert: true
        currentResult = await (0, notifier_1.postPullRequestInfo)(cx, model);
    }
    console.log('SlackResult -');
    console.dir(currentResult, { depth: null });
    const logTargetTS = currentResult?.ok ? currentResult.ts : previousTS;
    console.log(`logTargetTS: ${logTargetTS}`);
    if (logTargetTS && ev.logMessage) {
        return await (0, notifier_1.postChangeLog)(cx, model, logTargetTS, ev.logMessage);
    }
    return currentResult || null;
}
exports.processEvent = processEvent;
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
            return { sender, event, action, number, reviewRequest, upsert: true, logMessage: renderer_1.ReviewRequestedLog };
        }
        if (action === 'closed') {
            return { sender, event, action, number, sha, upsert: true, logMessage: renderer_1.ClosedLog };
        }
        return { sender, event, action, number, sha, upsert: action === 'edited' };
    }
    if (event === 'pull_request_review') {
        const reviewEvent = payload;
        const number = reviewEvent.pull_request.number;
        const action = reviewEvent.action;
        const { user: { login, html_url: url }, body, submitted_at: updatedAt } = reviewEvent.review;
        // Since it is uppercase in the definition of GitHub GraphQL, align it
        const state = (reviewEvent.review.state).toUpperCase();
        const review = { author: { login, url }, body, state, updatedAt };
        if (action === 'submitted') {
            return { sender, event, action, number, review, upsert: true, logMessage: renderer_1.SubmittedLog };
        }
        return { sender, event, action, number, review, upsert: false };
    }
    // if (event === pull_request_review_comment) { /* future */ }
    console.log(`Unsupported trigger event: "${event}"`);
    return null;
}
exports.extractPayload = extractPayload;
//# sourceMappingURL=handler.js.map