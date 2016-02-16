'use strict';

var Rule = require('./rule');
var SlackClient = require('./slack-client');

module.exports = Middleware;

function Middleware(config, slackClient, githubClient, logger) {
  this.rules = config.rules.map(function(rule) {
    return new Rule(rule);
  });
  this.successReaction = config.successReaction;
  this.slackClient = slackClient;
  this.githubClient = githubClient;
  this.logger = logger;
  this.inProgress = {};
}

Middleware.prototype.execute = function(context, next, done) {
  var errorMessage;

  try {
    return doExecute(this, context, next, done);

  } catch (err) {
    errorMessage = 'unhandled error: ' +
      (err instanceof Error ? err.message : err) + '\nmessage: ' +
        JSON.stringify(context.response.message.rawMessage, null, 2);
    this.logger.error(null, errorMessage);
    context.response.reply(errorMessage);
    return next(done);
  }
};

function doExecute(middleware, context, next, done) {
  var response = context.response,
      message = response.message.rawMessage,
      rule = middleware.findMatchingRule(message),
      msgId,
      finish;

  if (!rule) {
    return next(done);
  }

  msgId = messageId(message);
  if (middleware.inProgress[msgId]) {
    middleware.logger.info(msgId, 'already in progress');
    return next(done);
  }
  middleware.inProgress[msgId] = true;

  middleware.logger.info(msgId, 'matches rule:', rule);
  finish = handleFinish(msgId, middleware, response, next, done);

  return getReactions(middleware, msgId, message)
    .then(fileGitHubIssue(middleware, msgId, rule.githubRepository))
    .then(addSuccessReaction(middleware, msgId, message))
    .then(handleSuccess(finish), handleFailure(finish));
}

Middleware.prototype.findMatchingRule = function(message) {
  var slackClient = this.slackClient;

  if (message && message.type === SlackClient.REACTION_ADDED &&
      message.item.type === 'message') {
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

function messageId(message) {
  return message.item.channel + ':' + message.item.ts;
}

function getReactions(middleware, msgId, message) {
  var domain = middleware.slackClient.getTeamDomain(),
      channelName = middleware.slackClient.getChannelName(message.item.channel),
      timestamp = message.item.ts,
      permalink = 'https://' + domain + '.slack.com/archives/' +
        channelName + '/p' + timestamp.replace('.', ''),
      reject;

  reject = function(err) {
    return Promise.reject(new Error('failed to get reactions for ' +
      permalink + ': ' + err.message));
  };

  middleware.logger.info(msgId, 'getting reactions for', permalink);
  return middleware.slackClient.getReactions(message.item.channel, timestamp)
    .catch(reject);
}

function fileGitHubIssue(middleware, msgId, githubRepository) {
  return function(message) {
    var metadata,
        permalink = message.message.permalink,
        reject;

    if (alreadyProcessed(message, middleware.successReaction)) {
      return Promise.reject('already processed ' + permalink);
    }

    metadata = middleware.parseMetadata(message);
    middleware.logger.info(msgId, 'making GitHub request for', permalink);

    reject = function(err) {
      return Promise.reject(new Error('failed to create a GitHub issue in ' +
        middleware.githubClient.user + '/' + githubRepository + ': ' +
        err.message));
    };
    return middleware.githubClient.fileNewIssue(metadata, githubRepository)
      .catch(reject);
  };
}

function alreadyProcessed(message, successReaction) {
  return message.message.reactions.find(function(reaction) {
    return reaction.name === successReaction;
  });
}

function addSuccessReaction(middleware, msgId, message) {
  return function(issueUrl) {
    var channel = message.item.channel,
        timestamp = message.item.ts,
        reaction = middleware.slackClient.successReaction,
        resolve, reject;

    resolve = function() {
      return Promise.resolve(issueUrl);
    };

    reject = function(err) {
      return Promise.reject(new Error('created ' + issueUrl +
        ' but failed to add ' + reaction + ': ' + err.message));
    };

    middleware.logger.info(msgId, 'adding', reaction);
    return middleware.slackClient.addSuccessReaction(channel, timestamp)
      .then(resolve, reject);
  };
}

function handleSuccess(finish) {
  return function(issueUrl) {
    finish('created: ' + issueUrl);
    return Promise.resolve(issueUrl);
  };
}

function handleFailure(finish) {
  return function(err) {
    finish(err);
    return Promise.reject(err);
  };
}

function handleFinish(messageId, middleware, response, next, done) {
  return function(message) {
    if (message instanceof Error) {
      middleware.logger.error(messageId, message.message);
    } else {
      middleware.logger.info(messageId, message);
    }

    if (!(message.startsWith && message.startsWith('already '))) {
      response.reply(message);
    }
    delete middleware.inProgress[messageId];
    next(done);
  };
}
