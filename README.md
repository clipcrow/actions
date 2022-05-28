## Requirements

Notify the pull request reviewer that a review request is coming,
Notify the pull request author as soon as the reviewer completes the approval.

- Post a message to Slack when a particular user is added as a reviewer to a pull request
- Update messages already posted at the following events
    - Yet another specific user is added as a reviewer
    - Reviewer completes review
    - Pull requests are merged
- The update history is threaded to the message
- Mention the Slack account of the target GitHub user

## How to implement

By implementing it as an action to be incorporated into the workflow of GitHub Actions,
it can be operated without a server. The billing value increases each time the workflow moves,
but I decided to implement it as an action after considering the cost of preparing a server separately
and the trouble of operation.

Use Slack's metadata API to find messages to update. In this way, the channel is not wasted. 
Fortunately, pull requests have a unique number, so I can simply use that as my search key.

Store the bot tokens needed to use the Slack API in Github Secrets. However, as an Action,
it is sufficient to simply accept a string.The Slack channel ID, Slack and Github account pair,
will be written in the workflow YAML too.

I will write it in TypeScript, assuming the future of changing the location to
[Slack's next-generation platform](https://api.slack.com/future).

## GitHub Actions Trigger

- Event
    - **pull_request**
    - Activity Type
        - opened
            - Even if a review request is made at the same time as the PR opens, the events will occur separately.
        - **closed**
            - When a pull request merges, the `pull_request` is automatically `closed`. 
            - with a conditional that checks the `merged` value of the event. also `merged_by`.
        - reopened
            - I don't know...
        - **review_requested**
            - see `payload.requested_reviewer`.
        - **review_request_removed**
            - see `payload.requested_reviewer`.
- Event
    - **pull_request_review**
    - Activity Type
        - **submitted**
            - when a pull request has been approved
            - check the `payload.review.state`, state == `approved` then PR was approved.
        - dismissed
            - Change the state of the review, but not the state of the PR.

## Slack API

- **users.info**
    - scope
        - `users:read`
    - arg
        - user
- **chat.postMessage**
    - scope
        - `chat:write`
    - arg
        - channel
        - blocks
        - thread_ts
        - reply_broadcast
- **chat.update**
    - scope
        - `chat:write`
    - arg
        - channel
        - ts
- **conversations.history**
    - scope
        - `channels:history`
        - `groups:history`
        - `im:history`
        - `mpim:history`
    - arg
        - channel
        - include_all_metadata
        - oldest
        - latest
