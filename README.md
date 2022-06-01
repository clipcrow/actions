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

### .env file

The .env file is needed when running tests locally, not when using actions.

```yml
githubToken=ghp_abcdefghijklmnopqrstuvwxyz0123456789
slackToken=xoxb-1234567890123-1234567890123-abcdefghijklmnopqrstuvwx
slackChannel=C0123456789
# The message you want to post when the push event that occurs after a merge commit is complete.
mergeCommitlMessage=Deployment flow complete
owner=<test target organization or login account>
name=<test target repository name>
# test target number of pull request
number=311
```

### GitHub Workflow file

```yml
name: pull-request-notify
on:
  pull_request:
    types: [closed, review_requested, review_request_removed]
  pull_request_review:
    types: [submitted]
jobs:
  notify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: masataka/pull-request-notify@v0.0.3
        with:
          # https://docs.github.com/ja/actions/security-guides/automatic-token-authentication
          githubToken: ${{ secrets.GITHUB_TOKEN }}
          # it will be a big deal If the slack token is leaked,
          # so I recommend using the secrets mechanism on github.
          slackToken: ${{ secrets.SLACK_BOT_TOKEN }}
          slackChannel: C0123456789
          # GitHub - Slack Account Pairing JSON File Path, { github: slack, github: slack ... } style
          slackAccounts: src/repository/accounts.json
```