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

GraphQL(GitHub v4) was used as the method for acquiring detailed data of pull request.
It was very convenient because it took less effort than the REST API(GitHub v3).

Store the bot tokens needed to use the Slack API in Github Secrets. However, as an Action,
it is sufficient to simply accept a string. The Slack channel ID, Slack and Github account pair,
will be written in Github Secret accessed via the workflow YAML too.

I will write it in TypeScript, assuming the future of changing the location to
[Slack's next-generation platform](https://api.slack.com/future).

- index.ts: simple bootstrap
    - wokflow.ts: GitHub Actions API
        - I'd like to port the following parts
          when Slack's next gait platform is able to handle webhooks (probably soon).
        - handler.ts: GitHub Webhook
            - finder.ts: GitHub v4 API
            - renderer.tsx, logger.tsx: [jsx-slack](https://github.com/yhatt/jsx-slack)
            - notifier.ts: Slack API

If implemented as a GitHub App on Slack's next-generation platform,
I think it will be possible to easily set up tokens and channels,
which are currently troublesome, using the OAuth process.

## handle event of GitHub Actions

- Event > Activity Type
    - **pull_request**
        - opened
            - Even if a review request is made at the same time as the PR opens, the events will occur separately.
        - **closed**
            - When a pull request merges, the `pull_request` is automatically `closed`.
            - with a conditional that checks the `merged` value of the event. also `merged_by`.
        - edited
        - reopened
            - I don't know...
        - **review_requested**
            - see `payload.requested_reviewer`.
        - **review_request_removed**
            - see `payload.requested_reviewer`.
    - **pull_request_review**
        - **submitted**
            - when a pull request has been approved
            - check the `payload.review.state`, state == `approved` then PR was approved.
        - dismissed
            - Change the state of the review, but not the state of the PR.
    - pull_request_review_comment
        - created

## Call Slack API

- **chat.postMessage**
    - scope
        - `chat:write`
- **chat.update**
    - scope
        - `chat:write`
- **conversations.history**
    - scope
        - `channels:history`
        - `groups:history`
        - `im:history`
        - `mpim:history`

### .env file

The .env file is needed when running tests locally, not for using actions.

```yml
githubToken=ghp_abcdefghijklmnopqrstuvwxyz0123456789
slackToken=xoxb-1234567890123-1234567890123-abcdefghijklmnopqrstuvwx
slackChannel=C0123456789
owner=test-target-organization-or-login-account
name=test-target-repository-name
# test target number of pull request
number=311
```

### GitHub Workflow file

```yml
name: handle-pull-request
on:
  pull_request:
    types: [edited, closed, review_requested, review_request_removed]

  pull_request_review:
    types: [submitted]

jobs:
  notify:
    runs-on: ubuntu-latest
    steps:
      - uses: masataka/pull-request-notify@v[0.0.6](https://github.com/masataka/pull-request-notify/releases)
        env:
          NODE_OPTIONS: --enable-source-maps
        with:
          # https://docs.github.com/ja/actions/security-guides/automatic-token-authentication
          githubToken: ${{ secrets.GITHUB_TOKEN }}
          # it will be a big deal If the slack token is leaked,
          # so I recommend using the secrets mechanism on github.
          slackToken: ${{ secrets.SLACK_TOKEN }}
          slackChannel: ${{ secrets.SLACK_CHANNEL }}
          # GitHub - Slack Account Pairing JSON string, { githubA: slackA, githubB: slackB ... } style
          slackAccounts: ${{ secrets.SLACK_ACCOUNTS }}
```

```yml
name: handle-push
on:
  push: # Push events occur frequently, so it's a good idea to set more filter.

jobs:
  notify:
    runs-on: ubuntu-latest
    steps:
      - Your CI steps here

      - Your CD steps here

      - uses: masataka/pull-request-notify@[v0.0.6](https://github.com/masataka/pull-request-notify/releases)
        env:
          NODE_OPTIONS: --enable-source-maps
        with:
          githubToken: ${{ secrets.GITHUB_TOKEN }}
          slackToken: ${{ secrets.SLACK_TOKEN }}
          slackChannel: ${{ secrets.SLACK_CHANNEL }}
          slackAccounts: ${{ secrets.SLACK_ACCOUNTS }}
```