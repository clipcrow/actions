import type { WebhookPayload } from '@actions/github/lib/interfaces';
import type {
    PullRequestEvent, PullRequestReviewRequestedEvent, PullRequestReviewRequestRemovedEvent, PullRequestReviewEvent,
} from '@octokit/webhooks-definitions/schema';

import { findActualPullRequest } from './finder';
import { findPreviousSlackMessage, postPullRequestInfo, updatePullRequestInfo, postChangeLog } from './notifier';
import { ClosedLog, ReviewRequestedLog, SubmittedLog, DeployCompleteLog } from './logger';
import type {
    GitHubUser, ActionContext, QueryVariables, QueryResult, EventPayload, RenderModel, SlackResult, KeyValueStore
} from './types';

interface Extractor {
    (sender: GitHubUser, sha: string, payload: WebhookPayload): EventPayload
}

export const pushExtractor: Extractor = (sender, sha, payload) => {
    return {
        sender,
        event: 'push',
        action: '',
        number: 0,
        sha,
        upsert: false,
        logMessage: DeployCompleteLog,
    };
}

export const pullRequestExtractor: Extractor = (sender, sha, payload) => {
    const pullRequestEvent = payload as PullRequestEvent;
    const number = pullRequestEvent.pull_request.number;
    const action = pullRequestEvent.action;

    if (action === 'review_requested' || action === 'review_request_removed') {
        const reviewRequestEvent = payload as
            (PullRequestReviewRequestedEvent | PullRequestReviewRequestRemovedEvent);
        const { login, html_url: url} = reviewRequestEvent.requested_reviewer;
        const reviewRequest = { requestedReviewer: { login, url} };
        return {
            sender,
            event: 'pull_request',
            action, number,
            reviewRequest,
            upsert: true,
            logMessage: ReviewRequestedLog,
        };
    }
    if (action === 'closed') {
        return {
            sender,
            event: 'pull_request',
            action,
            number,
            sha,
            upsert: true,
            logMessage: ClosedLog,
        };
    }
    return {
        sender,
        event: 'pull_request',
        action,
        number,
        sha,
        upsert: action === 'edited',
    };
}

export const pullRequestReviewExtractor: Extractor = (sender, sha, payload) => {
    const reviewEvent = payload as PullRequestReviewEvent;
    const number = reviewEvent.pull_request.number;
    const action = reviewEvent.action;

    const { user: { login, html_url: url} , body, submitted_at: updatedAt } = reviewEvent.review;

    // Since it is uppercase in the definition of GitHub GraphQL, align it
    const state = (reviewEvent.review.state).toUpperCase();
    const review = { author: { login, url }, body, state, updatedAt };
    if (action === 'submitted') {
        return {
            sender,
            event: 'pull_request_review',
            action,
            number,
            review,
            upsert: true,
            logMessage: SubmittedLog,
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
}

export function extractEventPayload(
    sender: GitHubUser, event: string, sha: string, payload: WebhookPayload,
): EventPayload | null {
    const extractors: KeyValueStore<Extractor> = {
        'push': pushExtractor,
        'pull_request': pullRequestExtractor,
        'pull_request_review': pullRequestReviewExtractor,
        // 'pull_request_review_comment': pullRequestReviewCommentExtractor,
    };
    const extractor = extractors[event];
    if (extractor) {
        return extractor(sender, sha, payload);
    }
    console.log(`Unsupported trigger event: "${event}"`);
    return null;
}

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
    console.log('QueryVariables for findActualPullRequest -')
    console.dir(vars1, { depth: null });

    const actualPullRequest = await findActualPullRequest(vars1);
    if (!actualPullRequest) {
        console.log('pull-request not found.');
        return null;
    }

    // number of vars1 is 0 when "push"
    const vars2 = { ...vars1, number: actualPullRequest.repository.pullRequest.number };
    console.log('QueryVariables for findPreviousSlackMessage -')
    console.dir(vars2, { depth: null });

    const channel = cx.slackChannel;
    const previousSlackMessageTS = await findPreviousSlackMessage(channel, vars2);
    console.log(`previousTS: ${previousSlackMessageTS}`);

    const renderModel = createRenderModel(cx, ev, actualPullRequest);
    console.log('RenderModel:')
    console.dir(renderModel, { depth: null });

    let currentSlackMessage: SlackResult | undefined;
    if (previousSlackMessageTS) {
        currentSlackMessage = await updatePullRequestInfo(channel, renderModel, previousSlackMessageTS);
    } else if (ev.upsert) {
        // ts: undefined, upsert: true
        currentSlackMessage = await postPullRequestInfo(channel, renderModel);
    }
    console.log('SlackResult -')
    console.dir(currentSlackMessage, { depth: null });

    const targetSlackMessageTS = currentSlackMessage?.ok ? currentSlackMessage.ts : previousSlackMessageTS;
    console.log(`logTargetTS: ${targetSlackMessageTS}`);

    if (targetSlackMessageTS && ev.logMessage) {
        return await postChangeLog(channel, renderModel, targetSlackMessageTS, ev.logMessage);
    }
    return currentSlackMessage || null;
}
