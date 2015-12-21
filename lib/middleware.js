/* jshint node: true */
'use strict';

var Rule = require('./rule');
var SlackClient = require('./slack-client');
var log = require('./log');

module.exports = Middleware;

function Middleware(config, slackClient, githubClient) {
  this.rules = config.rules.map(function(rule) {
    return new Rule(rule);
  });
  this.successReaction = config.successReaction;
  this.slackClient = slackClient;
  this.githubClient = githubClient;
  this.inProgress = {};
}

Middleware.prototype.execute = function(context, next, done) {
  var response = context.response,
      message = response.message.rawMessage,
      msgId = messageId(message),
      rule = this.findMatchingRule(message),
      finish;

  if (!rule) {
    return next(done);
  }

  if (this.inProgress[msgId]) {
    log(msgId + ': already in progress');
    return next(done);
  }

  if (alreadyProcessed(message, this.successReaction)) {
    log(msgId + ': already processed');
    return next(done);
  }

  this.inProgress[msgId] = true;
  log(msgId + ': matches rule: ' + JSON.stringify(rule));
  finish = handleFinish(this, msgId, response, next, done);

  return fileGitHubIssue(this, msgId, rule.githubRepository)(message)
    .then(handleSuccess(finish))
    .catch(handleFailure(this, rule.githubRepository, finish));
};

function messageId(message) {
  if (message) {
    return message.item.channel + ':' + message.item.message.ts;
  }
}

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

function fileGitHubIssue(that, msgId, githubRepository) {
  return function(message) {
    var metadata = that.parseMetadata(message);

    log(msgId + ': making GitHub request for ' + metadata.url);
    return that.githubClient.fileNewIssue(metadata, githubRepository);
  };
}

function alreadyProcessed(message, successReaction) {
  return message.item.message.reactions.find(function(reaction) {
    return reaction.name === successReaction;
  });
}

function handleSuccess(finish) {
  return function(issueUrl) {
    finish('created: ' + issueUrl);
    return Promise.resolve(issueUrl);
  };
}

function handleFailure(that, githubRepository, finish) {
  return function(err) {
    var message = 'failed to create a GitHub issue in ' +
      that.githubClient.user + '/' + githubRepository + ': ' + err.message;

    finish(message);
    return Promise.reject(new Error(message));
  };
}

function handleFinish(that, msgId, response, next, done) {
  return function(reply) {
    response.reply(reply);
    log(msgId + ': ' + reply);
    delete that.inProgress[msgId];
    next(done);
  };
}
