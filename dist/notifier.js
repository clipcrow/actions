"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.postChangeLog = exports.updatePullRequestInfo = exports.postPullRequestInfo = exports.createSlackResult = exports.createSlackCallPayload = exports.findPreviousSlackMessage = exports.simpleEquals = void 0;
const web_api_1 = require("@slack/web-api");
const jsx_slack_1 = require("jsx-slack");
const renderer_1 = require("./renderer");
const METADATA_EVENT_TYPE = 'pull-request-notify';
const simpleEquals = (payload, vars) => {
    return (payload.owner === vars.owner &&
        payload.name === vars.name &&
        payload.number === vars.number);
};
exports.simpleEquals = simpleEquals;
async function findPreviousSlackMessage(cx, vars) {
    // Search for messages on the channel to get metadata.
    const client = new web_api_1.WebClient(cx.slackToken);
    const result = await client.conversations.history({
        channel: cx.slackChannel,
        include_all_metadata: true,
        limit: 100,
    });
    if (result.ok && result.messages) {
        for (const message of result.messages) {
            // Search for messages using the pull request number stored in the metadata as a clue.
            if ('metadata' in message) {
                const slackMessage = message;
                // check type of application
                if (slackMessage.metadata.event_type !== METADATA_EVENT_TYPE)
                    break;
                // check the pull request
                const { event_payload } = slackMessage.metadata;
                if ((0, exports.simpleEquals)(slackMessage.metadata.event_payload, vars)) {
                    return slackMessage.ts;
                }
            }
        }
    }
    return null;
}
exports.findPreviousSlackMessage = findPreviousSlackMessage;
function createSlackCallPayload(channel, model) {
    // sanitize dirty model
    const event_payload = {
        owner: model.owner,
        name: model.repository.name,
        number: model.repository.pullRequest.number,
    };
    return {
        channel,
        blocks: (0, jsx_slack_1.JSXSlack)((0, renderer_1.PullRequest)(model)),
        metadata: {
            event_type: METADATA_EVENT_TYPE,
            event_payload,
        },
    };
}
exports.createSlackCallPayload = createSlackCallPayload;
function createSlackResult(result, api) {
    return { ok: !!result.ok, error: result.error || '', ts: result.ts || '', api };
}
exports.createSlackResult = createSlackResult;
async function postPullRequestInfo(cx, model) {
    const client = new web_api_1.WebClient(cx.slackToken);
    const param = {
        ...createSlackCallPayload(cx.slackChannel, model),
        text: 'pull-request-notify posts',
    };
    console.log('postPullRequestInfo:');
    console.dir({ ...param, channel: 'privacy' }, { depth: null });
    return createSlackResult(await client.chat.postMessage(param), 'chat.postMessage');
}
exports.postPullRequestInfo = postPullRequestInfo;
async function updatePullRequestInfo(cx, model, ts) {
    const client = new web_api_1.WebClient(cx.slackToken);
    const param = {
        ...createSlackCallPayload(cx.slackChannel, model),
        text: 'pull-request-notify updates',
        ts,
    };
    console.log('updatePullRequestInfo:');
    console.dir({ ...param, channel: 'privacy' }, { depth: null });
    return createSlackResult(await client.chat.update(param), 'chat.update');
}
exports.updatePullRequestInfo = updatePullRequestInfo;
async function postChangeLog(cx, model, ts, logMessage) {
    const blocks = logMessage(model);
    if (blocks) {
        const client = new web_api_1.WebClient(cx.slackToken);
        const param = {
            channel: cx.slackChannel,
            text: 'pull-request-notify posted this change log.',
            blocks: (0, jsx_slack_1.JSXSlack)(blocks),
            thread_ts: ts,
        };
        console.log('postChangeLog:');
        console.dir({ ...param, channel: 'privacy' }, { depth: null });
        return createSlackResult(await client.chat.postMessage(param), 'chat.postMessage');
    }
    return null;
}
exports.postChangeLog = postChangeLog;
//# sourceMappingURL=notifier.js.map