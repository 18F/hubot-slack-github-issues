/* jshint node: true */
'use strict';

var Rule = require('./rule');
var SlackClient = require('./slack-client');
var log = require('./log');

module.exports = Middleware;

function Middleware(configRules, slackClient, githubClient) {
  this.rules = configRules.map(function(rule) {
    return new Rule(rule);
  });
  this.slackClient = slackClient;
  this.githubClient = githubClient;
}

Middleware.prototype.execute = function(context, next, done) {
  var response = context.response,
      message = response.message.rawMessage,
      rule = this.findMatchingRule(message);

  if (!rule) {
    return next(done);
  }

  return fileGitHubIssue(this, message, rule, response)
    .then(function() { next(done); });
};

Middleware.prototype.findMatchingRule = function(message) {
  var slackClient = this.slackClient;

  if (message && message.type === SlackClient.REACTION_ADDED) {
    return this.rules.find(function(rule) {
      return rule.match(message, slackClient);
    });
  }
};

Middleware.prototype.parseMetadata = function(message) {
  var result = {
    domain: this.slackClient.getTeamDomain(),
    channel: this.slackClient.getChannelName(message.item.channel),
    user: this.slackClient.getUserName(message.user),
    timestamp: message.item.message.ts
  };
  result.date = new Date(result.timestamp * 1000);
  result.title = 'Update from @' + result.user + ' in #' + result.channel +
    ' at ' + result.date.toUTCString();
  result.url = 'https://' + result.domain + '.slack.com/archives/' +
    result.channel + '/p' + result.timestamp.replace('.', '');
  return result;
};

function fileGitHubIssue(that, message, rule, response) {
  var metadata = that.parseMetadata(message),
      resolve, reject;

  resolve = function(issueUrl) {
    log('GitHub success: ' + issueUrl);
    response.reply('created: ' + issueUrl);
  };

  reject = function(err) {
    log('GitHub error: ' + err.message);
    response.reply('failed to create a GitHub issue in ' +
      that.githubClient.user + '/' + rule.githubRepository + ': ' +
      err.message);
  };

  log('making GitHub request for ' + metadata.url);
  return that.githubClient.fileNewIssue(metadata,
    rule.githubRepository, that.slackClient.getMessageText(response.message))
    .then(resolve, reject);
}
