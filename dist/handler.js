"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processEvent = exports.createRenderModel = exports.extractEventPayload = exports.pullRequestReviewExtractor = exports.pullRequestExtractor = exports.pushExtractor = void 0;
const finder_1 = require("./finder");
const notifier_1 = require("./notifier");
const logger_1 = require("./logger");
const pushExtractor = (sender, sha, payload) => {
    return {
        sender,
        event: 'push',
        action: '',
        number: 0,
        sha,
        upsert: false,
        logMessage: logger_1.DeployCompleteLog,
    };
};
exports.pushExtractor = pushExtractor;
const pullRequestExtractor = (sender, sha, payload) => {
    const pullRequestEvent = payload;
    const number = pullRequestEvent.pull_request.number;
    const action = pullRequestEvent.action;
    if (action === 'review_requested' || action === 'review_request_removed') {
        const reviewRequestEvent = payload;
        const { login, html_url: url } = reviewRequestEvent.requested_reviewer;
        const reviewRequest = { requestedReviewer: { login, url } };
        return {
            sender,
            event: 'pull_request',
            action,
            number,
            reviewRequest,
            upsert: true,
            logMessage: logger_1.ReviewRequestedLog,
        };
    }
    if (action === 'closed') {
        return {
            sender,
            event: 'pull_request',
            action: 'closed',
            number,
            sha,
            upsert: true,
            logMessage: logger_1.ClosedLog,
        };
    }
    if (action === 'edited') {
        return {
            sender,
            event: 'pull_request',
            action: 'edited',
            number,
            sha,
            upsert: true,
            logMessage: logger_1.EditedLog,
        };
    }
    return {
        sender,
        event: 'pull_request',
        action,
        number,
        sha,
        upsert: false,
    };
};
exports.pullRequestExtractor = pullRequestExtractor;
const pullRequestReviewExtractor = (sender, sha, payload) => {
    const reviewEvent = payload;
    const number = reviewEvent.pull_request.number;
    const action = reviewEvent.action;
    const { user: { login, html_url: url }, body, submitted_at: updatedAt } = reviewEvent.review;
    // Since it is uppercase in the definition of GitHub GraphQL, align it
    const state = (reviewEvent.review.state).toUpperCase();
    const review = { author: { login, url }, body, state, updatedAt };
    if (action === 'submitted') {
        return {
            sender,
            event: 'pull_request_review',
            action: 'submitted',
            number,
            review,
            upsert: true,
            logMessage: logger_1.SubmittedLog,
        };
    }
    return {
        sender,
        event: 'pull_request_review',
        action,
        number,
        review,
        upsert: false,
    };
};
exports.pullRequestReviewExtractor = pullRequestReviewExtractor;
function extractEventPayload(sender, event, sha, payload) {
    const extractors = {
        'push': exports.pushExtractor,
        'pull_request': exports.pullRequestExtractor,
        'pull_request_review': exports.pullRequestReviewExtractor,
        // 'pull_request_review_comment': pullRequestReviewCommentExtractor,
    };
    const extractor = extractors[event];
    if (extractor) {
        return extractor(sender, sha, payload);
    }
    console.log(`Unsupported trigger event: "${event}"`);
    return null;
}
exports.extractEventPayload = extractEventPayload;
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
    console.log('QueryVariables for findActualPullRequest -');
    console.dir(vars1, { depth: null });
    const actualPullRequest = await (0, finder_1.findActualPullRequest)(vars1);
    if (!actualPullRequest) {
        console.log('pull-request not found.');
        return null;
    }
    // number of vars1 is 0 when "push"
    const vars2 = { ...vars1, number: actualPullRequest.repository.pullRequest.number };
    console.log('QueryVariables for findPreviousSlackMessage -');
    console.dir(vars2, { depth: null });
    const channel = cx.slackChannel;
    const previousSlackMessageTS = await (0, notifier_1.findPreviousSlackMessage)(channel, vars2);
    console.log(`previousTS: ${previousSlackMessageTS}`);
    const renderModel = createRenderModel(cx, ev, actualPullRequest);
    console.log('RenderModel:');
    console.dir(renderModel, { depth: null });
    let currentSlackMessage;
    if (previousSlackMessageTS) {
        currentSlackMessage = await (0, notifier_1.updatePullRequestInfo)(channel, renderModel, previousSlackMessageTS);
    }
    else if (ev.upsert) {
        // ts: undefined, upsert: true
        currentSlackMessage = await (0, notifier_1.postPullRequestInfo)(channel, renderModel);
    }
    console.log('SlackResult -');
    console.dir(currentSlackMessage, { depth: null });
    const targetSlackMessageTS = currentSlackMessage?.ok ? currentSlackMessage.ts : previousSlackMessageTS;
    console.log(`logTargetTS: ${targetSlackMessageTS}`);
    if (targetSlackMessageTS && ev.logMessage) {
        return await (0, notifier_1.postChangeLog)(channel, renderModel, targetSlackMessageTS, ev.logMessage);
    }
    return currentSlackMessage || null;
}
exports.processEvent = processEvent;
//# sourceMappingURL=handler.js.map