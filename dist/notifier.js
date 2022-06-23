"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.postChangeLog = exports.updatePullRequestInfo = exports.postPullRequestInfo = exports.createSlackCallPayload = exports.findPreviousSlackMessage = void 0;
const jsx_slack_1 = require("jsx-slack");
const environment_1 = require("./environment");
const renderer_1 = require("./renderer");
const METADATA_EVENT_TYPE = 'pull-request-notify';
async function findPreviousSlackMessage(channel, vars) {
    // Search for messages on the channel to get metadata.
    const client = (0, environment_1.getWebClient)();
    const result = await client.conversations.history({
        channel,
        include_all_metadata: true,
        limit: 100,
    });
    if (result.ok && Array.isArray(result.messages)) {
        for (const message of result.messages) {
            // Search for messages using the pull request number stored in the metadata as a clue.
            if ('metadata' in message) {
                const slackMessage = message;
                // check type of application
                if (slackMessage.metadata.event_type !== METADATA_EVENT_TYPE)
                    break;
                // check the pull request
                const { event_payload } = slackMessage.metadata;
                const actual = slackMessage.metadata.event_payload;
                if (actual.owner === vars.owner && actual.name === vars.name && actual.number === vars.number) {
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
async function postPullRequestInfo(channel, model) {
    const client = (0, environment_1.getWebClient)();
    const param = {
        ...createSlackCallPayload(channel, model),
        text: 'pull-request-notify posts',
    };
    console.log('postPullRequestInfo -');
    console.dir({ ...param, channel: 'privacy' }, { depth: null });
    return createSlackResult(await client.chat.postMessage(param), 'chat.postMessage');
}
exports.postPullRequestInfo = postPullRequestInfo;
async function updatePullRequestInfo(channel, model, ts) {
    const client = (0, environment_1.getWebClient)();
    const param = {
        ...createSlackCallPayload(channel, model),
        text: 'pull-request-notify updates',
        ts,
    };
    console.log('updatePullRequestInfo -');
    console.dir({ ...param, channel: 'privacy' }, { depth: null });
    return createSlackResult(await client.chat.update(param), 'chat.update');
}
exports.updatePullRequestInfo = updatePullRequestInfo;
async function postChangeLog(channel, model, ts, logMessage) {
    const blocks = logMessage(model);
    if (blocks) {
        const client = (0, environment_1.getWebClient)();
        const param = {
            channel,
            text: 'pull-request-notify posted this change log.',
            blocks: (0, jsx_slack_1.JSXSlack)(blocks),
            thread_ts: ts,
        };
        console.log('postChangeLog -');
        console.dir({ ...param, channel: 'privacy' }, { depth: null });
        return createSlackResult(await client.chat.postMessage(param), 'chat.postMessage');
    }
    return null;
}
exports.postChangeLog = postChangeLog;
//# sourceMappingURL=notifier.js.map