"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.postChangeLog = exports.postPullRequestInfo = exports.findPreviousSlackMessage = void 0;
const web_api_1 = require("@slack/web-api");
const jsx_slack_1 = require("jsx-slack");
const renderer_1 = require("./renderer");
const METADATA_EVENT_TYPE = 'pull-request-notify';
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
                if (event_payload.owner !== vars.owner)
                    break;
                if (event_payload.name !== vars.name)
                    break;
                if (event_payload.number === vars.number) {
                    if (vars.sha && event_payload.sha !== vars.sha) {
                        break;
                    }
                    return slackMessage.ts;
                }
            }
        }
    }
}
exports.findPreviousSlackMessage = findPreviousSlackMessage;
async function postPullRequestInfo(cx, model) {
    const client = new web_api_1.WebClient(cx.slackToken);
    // sanitize because of dirty model
    const event_payload = {
        owner: model.owner,
        name: model.name,
        number: model.number,
        sha: model.sha,
    };
    //    const api = model.ts ? client.chat.postMessage : client.chat.update;
    const param = {
        channel: cx.slackChannel,
        text: 'pull-request-notify posted this message.',
        blocks: (0, jsx_slack_1.JSXSlack)((0, renderer_1.PullRequest)(model)),
        metadata: {
            event_type: METADATA_EVENT_TYPE,
            event_payload,
        },
    };
    let result;
    if (model.ts) {
        result = await client.chat.update({ ...param, ts: model.ts });
    }
    else {
        result = await client.chat.postMessage(param);
    }
    if (result.ok) {
        return result.ts;
    }
    console.error(result.error);
}
exports.postPullRequestInfo = postPullRequestInfo;
async function postChangeLog(cx, ts, log) {
    const blocks = log();
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