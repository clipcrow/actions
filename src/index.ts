import * as core from '@actions/core';
import * as github from '@actions/github';

import { createActionContext } from './environment';
import { extractEventPayload, processEvent } from './handler';

async function handleEvent (): Promise<void> {
    const event = github.context.eventName;
    console.log(`starting handle "${event}"...`);

    const { actor, sha } = github.context;
    const ev = extractEventPayload(
        {   login: actor, url: `https://github.com/${actor}` }, // sender
        event,
        sha,
        github.context.payload,
    );

    if (ev) {
        console.log('extracted payload -');
        console.dir(ev, { depth: null });
        try {
            const { owner, repo } = github.context.repo;
            const cx = await createActionContext(owner, repo);
            console.log('created context -');
            console.dir({ ...cx, githubToken: 'privacy', slackToken: 'privacy' }, { depth: null } );

            await processEvent(cx, ev);
        } catch(err) {
            console.log('exception -');
            console.dir(err, { depth: null })
        }
    }
}

// bootstrap
handleEvent().catch(err => {
    core.setFailed(err);
});
