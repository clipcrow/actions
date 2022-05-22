import * as core from '@actions/core';
import * as github from '@actions/github';
import { IssuesEvent } from '@octokit/webhooks-definitions/schema';
import { JSXSlack, Blocks, Section } from 'jsx-slack';

const ReviewerPayload = () => (
    <Blocks>
        <Section>
            <p>Hello, World</p>
        </Section>
    </Blocks>
);

export function handleEvent () {
    if (github.context.eventName === 'issues') {
        const event = github.context.payload as IssuesEvent;
        core.info(event.action);

        // PoC
        console.log(JSXSlack(<ReviewerPayload></ReviewerPayload>));
    }
}
