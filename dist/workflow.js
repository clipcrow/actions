"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleEvent = exports.createActionContext = exports.getOctokit = void 0;
const core = require("@actions/core");
const github = require("@actions/github");
const handler_1 = require("./handler");
function getOctokit() {
    return github.getOctokit(core.getInput('githubToken'));
}
exports.getOctokit = getOctokit;
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
async function handleEvent() {
    const event = github.context.eventName;
    console.log(`starting handle "${event}"...`);
    const { actor, sha } = github.context;
    const ev = (0, handler_1.extractPayload)({ login: actor, url: `https://github.com/${actor}` }, // sender
    event, github.context.payload, sha);
    if (ev) {
        console.log('extracted payload -');
        console.dir(ev, { depth: null });
        try {
            const cx = await createActionContext();
            console.log('created context -');
            console.dir({ ...cx, githubToken: 'privacy', slackToken: 'privacy' }, { depth: null });
            return await (0, handler_1.processEvent)(cx, ev);
        }
        catch (err) {
            console.log('exception -');
            console.dir(err, { depth: null });
        }
    }
    return null;
}
exports.handleEvent = handleEvent;
//# sourceMappingURL=workflow.js.map