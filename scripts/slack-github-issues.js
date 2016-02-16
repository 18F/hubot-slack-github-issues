// Description:
//   Uses the Slack Real Time Messaging API to file GitHub issues
//
// Configuration:
//   HUBOT_SLACK_GITHUB_ISSUES_CONFIG_PATH

'use strict';

var Config = require('../lib/config');
var SlackClient = require('../lib/slack-client');
var GitHubClient = require('../lib/github-client');
var Logger = require('../lib/logger');
var Middleware = require('../lib/middleware');

module.exports = function(robot) {
  var logger, config, impl, middleware;

  try {
    logger = new Logger(robot.logger);
    config = new Config(null, logger);
    impl = new Middleware(
      config,
      new SlackClient(robot.adapter.client, config),
      new GitHubClient(config),
      logger);

    middleware = function(context, next, done) {
      impl.execute(context, next, done);
    };
    middleware.impl = impl;
    robot.receiveMiddleware(middleware);
    logger.info(null, 'registered receiveMiddleware');

  } catch (err) {
    logger.error(null, 'receiveMiddleware registration failed:',
      err instanceof Error ? err.message : err);
  }
};
