"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core = require("@actions/core");
const github = require("@actions/github");
const environment_1 = require("./environment");
const handler_1 = require("./handler");
async function handleEvent() {
    const event = github.context.eventName;
    console.log(`starting handle "${event}"...`);
    const { actor, sha } = github.context;
    const ev = (0, handler_1.extractEventPayload)({ login: actor, url: `https://github.com/${actor}` }, // sender
    event, sha, github.context.payload);
    if (ev) {
        console.log('extracted payload -');
        console.dir(ev, { depth: null });
        try {
            const { owner, repo } = github.context.repo;
            const cx = await (0, environment_1.createActionContext)(owner, repo);
            console.log('created context -');
            console.dir({ ...cx, githubToken: 'privacy', slackToken: 'privacy' }, { depth: null });
            await (0, handler_1.processEvent)(cx, ev);
        }
        catch (err) {
            console.log('exception -');
            console.dir(err, { depth: null });
        }
    }
}
// bootstrap
handleEvent().catch(err => {
    core.setFailed(err);
});
//# sourceMappingURL=index.js.map