import * as core from '@actions/core';
import * as github from '@actions/github';
import type { WebhookPayload } from '@actions/github/lib/interfaces';
import type {
    PullRequestEvent, PullRequestReviewRequestedEvent, PullRequestReviewRequestRemovedEvent, PullRequestReviewEvent,
} from '@octokit/webhooks-definitions/schema';

import { findActualPullRequest } from './finder';
import { findPreviousSlackMessage, postPullRequestInfo, updatePullRequestInfo, postChangeLog } from './notifier';
import { ClosedLog, ReviewRequestedLog, SubmittedLog, DeployCompleteLog } from './renderer';
import type {
    KeyValueStore, GitHubUser, ActionContext, QueryVariables, QueryResult, EventPayload, RenderModel, SlackResult,
} from './types';

export function createRenderModel(cx: ActionContext, ev: EventPayload, result: QueryResult): RenderModel {
    const { owner, slackAccounts, emptyBodyWarning, pushMessage } = cx;
    const { sender, event, action, reviewRequest, review, sha } = ev;
    return {
        owner, slackAccounts, emptyBodyWarning, pushMessage,
        sender, event, action, reviewRequest, review, sha,
        ...result,
    };
}

export async function processEvent (cx: ActionContext, ev: EventPayload): Promise<SlackResult | null> {
    const vars1: QueryVariables = { owner: cx.owner, name: cx.name, number: ev.number, sha: ev.sha };
    console.log('QueryVariables-1:')
    console.dir(vars1, { depth: null });

    const result = await findActualPullRequest(cx.githubToken, vars1);
    if (!result) {
        console.log('pull-request not found.');
        return null;
    }

    // number of vars1 is 0 when "push"
    const vars2 = { ...vars1, number: result.repository.pullRequest.number };
    console.log('QueryVariables-2:')
    console.dir(vars2, { depth: null });

    const previousTS = await findPreviousSlackMessage(cx, vars2);
    core.info(`previousTS: ${previousTS}`);

    const model = createRenderModel(cx, ev, result);
    console.log('RenderModel:')
    console.dir(model, { depth: null });

    let currentResult: SlackResult | undefined;
    if (previousTS) {
        currentResult = await updatePullRequestInfo(cx, model, previousTS);
    } else if (ev.upsert) {
        // ts: undefinde, upsert: true
        currentResult = await postPullRequestInfo(cx, model);
    }
    console.log('SlackResult:')
    console.dir(currentResult, { depth: null });

    const logTargetTS = currentResult?.ok ? currentResult.ts : previousTS;
    console.log(`logTargetTS: ${logTargetTS}`);

    if (logTargetTS && ev.logMessage) {
        return await postChangeLog(cx, model, logTargetTS, ev.logMessage);
    }
    return currentResult || null;
}

export function createActionContext(): ActionContext {
    const owner = github.context.repo.owner;
    const name = github.context.repo.repo;
    const githubToken = core.getInput('githubToken');
    const slackToken = core.getInput('slackToken');
    const slackChannel = core.getInput('slackChannel');
    const emptyBodyWarning = core.getInput('emptyBodyWarning');
    const pushMessage = core.getInput('pushMessage');
    const slackAccounts: KeyValueStore = JSON.parse(core.getInput('slackAccounts'));

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

export function extractPayload(
    sender: GitHubUser, event: string, payload: WebhookPayload, sha: string,
): EventPayload | null {
    if (event === 'push') {
        return { sender, event, action: '', number: 0, sha, upsert: false, logMessage: DeployCompleteLog };
    }

    if (event === 'pull_request') {
        const pullRequestEvent = payload as PullRequestEvent;
        const number = pullRequestEvent.pull_request.number;
        const action = pullRequestEvent.action;

        if (action === 'review_requested' || action === 'review_request_removed') {
            const reviewRequestEvent = payload as
                (PullRequestReviewRequestedEvent | PullRequestReviewRequestRemovedEvent);
            const { login, html_url: url} = reviewRequestEvent.requested_reviewer;
            const reviewRequest = { requestedReviewer: { login, url} };
            return { sender, event, action, number, reviewRequest, upsert: true, logMessage: ReviewRequestedLog  };
        }
        if (action === 'closed') {
            return { sender, event, action, number, sha, upsert: true, logMessage: ClosedLog };
        }
        return { sender, event, action, number, sha, upsert: false };
    }

    if (event === 'pull_request_review') {
        const reviewEvent = payload as PullRequestReviewEvent;
        const number = reviewEvent.pull_request.number;
        const action = reviewEvent.action;

        const { user: { login, html_url: url} , body, submitted_at: updatedAt } = reviewEvent.review;

        // Since it is uppercase in the definition of GitHub GraphQL, align it
        const state = (reviewEvent.review.state).toUpperCase();
        const review = { author: { login, url }, body, state, updatedAt };
        if (action === 'submitted') {
            return { sender, event, action, number, review, upsert: true, logMessage: SubmittedLog };
        }
        return { sender, event, action, number, review, upsert: false };
    }

    // if (event === pull_request_review_comment) { TODO: }

    console.log(`Unsupported trigger event: "${event}"`);
    return null;
}

export async function handleEvent (): Promise<SlackResult | null> {
    const event = github.context.eventName;
    console.log(`starting handle "${event}"...`);

    const { actor, sha } = github.context;
    const ev = extractPayload(
        {   login: actor, url: `https://github.com/${actor}` }, // sender
        event,
        github.context.payload,
        sha,
    );

    if (ev) {
        console.log('extracted payload -');
        console.dir(ev, { depth: null });
        try {
            const cx = await createActionContext();
            console.log('created context -');
            console.dir({ ...cx, githubToken: '{privacy}', slackToken: '{privacy}' }, { depth: null } );

            return await processEvent(cx, ev);
        } catch(err) {
            console.log('exception -');
            console.dir(err, { depth: null })
        }
    }
    return null;
}
