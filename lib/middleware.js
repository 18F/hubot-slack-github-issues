/* jshint node: true */
'use strict';

var Rule = require('./rule.js');

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
      message = response.message,
      rule = this.findMatchingRule(message),
      resolve,
      reject,
      fileNewIssue,
      that = this;

  if (!rule) {
    return next(done);
  }

  resolve = function(issueUrl) {
    response.reply('Created: ' + issueUrl);
    that.next(that.done);
  };

  reject = function(err) {
    response.reply('Failed to create a GitHub issue in ' +
      that.githubClient.repository + ': ' + err);
    message.finish();
    that.done();
  };

  fileNewIssue = this.githubClient.fileNewIssue(
    this.parseMetadata(message), rule.githubRepository, message);
  return fileNewIssue.then(resolve, reject);
};

Middleware.prototype.findMatchingRule = function(message) {
  var slackClient = this.slackClient;
  return this.rules.find(function(rule) {
    return rule.match(message, slackClient);
  });
};

Middleware.prototype.parseMetadata = function(message) {
  var result = {
    domain: this.slackClient.team.domain,
    channel: this.slackClient.getChannelByID(message.item.channel),
    user: this.slackClient.getUserByID(message.user),
    timestamp: message.item.ts.replace('.', '')
  };
  result.title = 'Update from @' + result.user + ' in #' + result.channel +
    ' at ' + result.timestamp;
  result.url = 'https://' + result.domain + '.slack.com/archives/' +
    result.channel + '/p' + result.timestamp;
  return result;
};
