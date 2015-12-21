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
      rule = this.findMatchingRule(message),
      msgId,
      finish;

  if (!rule) {
    return next(done);
  }

  msgId = messageId(message);
  if (this.inProgress[msgId]) {
    log(msgId + ': already in progress');
    return next(done);
  }

  this.inProgress[msgId] = true;
  log(msgId + ': matches rule: ' + JSON.stringify(rule));
  finish = handleFinish(this, msgId, response, next, done);

  return getReactions(this, msgId, message)
    .then(fileGitHubIssue(this, msgId, rule.githubRepository))
    .then(handleSuccess(finish))
    .catch(handleFailure(this, rule.githubRepository, finish));
};

function messageId(message) {
  return message.item.channel + ':' + message.item.ts;
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
    channel: this.slackClient.getChannelName(message.channel),
    timestamp: message.message.ts,
    url: message.message.permalink
  };
  result.date = new Date(result.timestamp * 1000);
  result.title = 'Update from #' + result.channel +
    ' at ' + result.date.toUTCString();
  return result;
};

function getReactions(that, msgId, message) {
  var domain = that.slackClient.getTeamDomain(),
      channelName = that.slackClient.getChannelName(message.item.channel),
      timestamp = message.item.ts,
      permalink = 'https://' + domain + '.slack.com/archives/' +
        channelName + '/p' + timestamp.replace('.', '');

  log(msgId + ': getting reactions for ' + permalink);
  return that.slackClient.getReactions(message.item.channel, timestamp);
}

function fileGitHubIssue(that, msgId, githubRepository) {
  return function(message) {
    var metadata, permalink = message.message.permalink;

    if (alreadyProcessed(message, that.successReaction)) {
      log(msgId + ': already processed ' + permalink);
      return Promise.resolve();
    }

    metadata = that.parseMetadata(message);
    log(msgId + ': making GitHub request for ' + permalink);
    return that.githubClient.fileNewIssue(metadata, githubRepository);
  };
}

function alreadyProcessed(message, successReaction) {
  return message.message.reactions.find(function(reaction) {
    return reaction.name === successReaction;
  });
}

function handleSuccess(finish) {
  return function(issueUrl) {
    if (issueUrl) {
      finish('created: ' + issueUrl);
    } else {
      // Already processed; don't log or reply.
      finish();
    }
    return Promise.resolve(issueUrl);
  };
}

function handleFailure(that, githubRepository, finish) {
  return function(err) {
    var message;

    message = 'failed to create a GitHub issue in ' +
      that.githubClient.user + '/' + githubRepository + ': ' + err.message;
    finish(message);
    return Promise.reject(new Error(message));
  };
}

function handleFinish(that, msgId, response, next, done) {
  return function(reply) {
    if (reply) {
      response.reply(reply);
      log(msgId + ': ' + reply);
    }
    delete that.inProgress[msgId];
    next(done);
  };
}
