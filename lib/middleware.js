/* jshint node: true */
'use strict';

var Rule = require('./rule');
var SlackClient = require('./slack-client');

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
      rule = this.findMatchingRule(message),
      resolve,
      reject,
      that = this;

  if (!rule) {
    return next(done);
  }

  resolve = function(issueUrl) {
    response.reply('created: ' + issueUrl);
  };

  reject = function(err) {
    response.reply('failed to create a GitHub issue in ' +
      that.githubClient.user + '/' + rule.githubRepository + ': ' +
      err.message);
  };

  return this.githubClient.fileNewIssue(this.parseMetadata(message),
    rule.githubRepository, message.item.message.text)
    .then(resolve, reject)
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
  result.title = 'Update from @' + result.user + ' in #' + result.channel +
    ' at ' + result.timestamp;
  result.url = 'https://' + result.domain + '.slack.com/archives/' +
    result.channel + '/p' + result.timestamp.replace('.', '');
  return result;
};
