# hubot-slack-github-issues - WORK IN PROGRESS!

[![Build Status](https://travis-ci.org/18F/hubot-slack-github-issues.svg?branch=master)](https://travis-ci.org/18F/hubot-slack-github-issues)

[Hubot](https://hubot.github.com/) plugin that creates
[GitHub](https://github.com/) issues from
[Slack messages that receive a specific emoji
reaction](https://api.slack.com/events/reaction_added).

## Installation

1. In your Hubot repository, run:

```bash
npm install hubot-slack-github-issues --save
```

1. Include the plugin in your `external-scripts.json`.

```json
[
  "hubot-slack-github-issues"
]
```

## Configuration

You'll need to create a JSON file conforming to the following schema:

* *githubUser*: GitHub organization or username owning all repositories
* *githubToken*: GitHub API token
* *githubTimeout*: GitHub API timeout limit in milliseconds
* *rules*: defines each condition that will result in a new GitHub issue
  * *reactionName* name of the reaction emoji triggering the rule
  * *githubRepository*: GitHub repository belonging to *githubUser* to which
    to post issues
  * *channelName (optional)*: name of the Slack channel triggering the rule;
    leave undefined to match messages in _any_ Slack channel

For example:

```json
{
  "githubUser": "18F",
  "githubToken": "<18F-api-token>",
  "githubTimeout": 5000,
  "rules": [
    {
      "reactionName": "evergreen_tree",
      "githubRepository": "handbook"
    }
  ]
}
```

The path to this configuration file should be made available to the running
Hubot instance via the `HUBOT_SLACK_GITHUB_ISSUES_CONFIG_PATH` environment
variable.

## Public domain

This project is in the worldwide [public domain](LICENSE.md). As stated in
[CONTRIBUTING](CONTRIBUTING.md):

> This project is in the public domain within the United States, and copyright
> and related rights in the work worldwide are waived through the
> [CC0 1.0 Universal public domain dedication](https://creativecommons.org/publicdomain/zero/1.0/).
>
> All contributions to this project will be released under the CC0 dedication.
> By submitting a pull request, you are agreeing to comply with this waiver of
> copyright interest.
