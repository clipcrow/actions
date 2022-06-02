"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.postChangeLog = exports.postPullRequestInfo = exports.findPreviousSlackMessage = void 0;
const web_api_1 = require("@slack/web-api");
const jsx_slack_1 = require("jsx-slack");
const renderer_1 = require("./renderer");
const METADATA_EVENT_TYPE = 'pull-request-notify';
function payloadEquals(payload, vars) {
    return (payload.owner === vars.owner &&
        payload.name === vars.name &&
        payload.number === vars.number);
}
async function findPreviousSlackMessage(cx, vars) {
    // Search for messages on the channel to get metadata.
    const client = new web_api_1.WebClient(cx.slackToken);
    const result = await client.conversations.history({
        channel: cx.slackChannel,
        include_all_metadata: true,
    });
    if (result.messages) {
        for (const message of result.messages) {
            // Search for messages using the pull request number stored in the metadata as a clue.
            if ('metadata' in message) {
                const slackMessage = message;
                // check type of application
                if (slackMessage.metadata.event_type !== METADATA_EVENT_TYPE)
                    break;
                // check the pull request
                const { event_payload } = slackMessage.metadata;
                if (payloadEquals(slackMessage.metadata.event_payload, vars)) {
                    return slackMessage.ts;
                }
            }
        }
    }
}
exports.findPreviousSlackMessage = findPreviousSlackMessage;
async function postPullRequestInfo(cx, model, ts) {
    const client = new web_api_1.WebClient(cx.slackToken);
    // sanitize because of dirty model
    const event_payload = {
        owner: model.owner,
        name: model.repository.name,
        number: model.repository.pullRequest.number,
    };
    const param = {
        channel: cx.slackChannel,
        blocks: (0, jsx_slack_1.JSXSlack)((0, renderer_1.PullRequest)(model)),
        metadata: {
            event_type: METADATA_EVENT_TYPE,
            event_payload,
        },
    };
    let result;
    if (ts) {
        result = await client.chat.update({ ...param, text: 'pull-request-notify updates', ts });
    }
    else {
        result = await client.chat.postMessage({ ...param, text: 'pull-request-notify posts' });
    }
    if (result.ok) {
        return result.ts;
    }
    console.error(result.error);
}
exports.postPullRequestInfo = postPullRequestInfo;
async function postChangeLog(cx, ts, logMessage) {
    const blocks = logMessage();
    if (blocks) {
        const client = new web_api_1.WebClient(cx.slackToken);
        const result = await client.chat.postMessage({
            channel: cx.slackChannel,
            text: 'pull-request-notify posted this change log.',
            blocks: (0, jsx_slack_1.JSXSlack)(blocks),
            thread_ts: ts,
        });
        if (result.ok) {
            return result.ts;
        }
        console.log(result.error);
    }
}
exports.postChangeLog = postChangeLog;
//# sourceMappingURL=notifier.js.map