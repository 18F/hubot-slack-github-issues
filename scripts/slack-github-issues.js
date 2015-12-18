// jshint node: true
//
// Description:
//   Uses the Slack Real Time Messaging API to file GitHub issues
//
// Configuration:
//   HUBOT_SLACK_GITHUB_ISSUES_CONFIG_PATH
//
// Commands:
//   hubot foobar - baz quux
//
// Author:
//   mbland

'use strict';

var Config = require('../lib/config');
var SlackClient = require('../lib/slack-client');
var GitHubClient = require('../lib/github-client');
var Middleware = require('../lib/middleware');
var log = require('../lib/log');

module.exports = function(robot) {
  var config = new Config(),
      impl = new Middleware(
        config,
        new SlackClient(robot.adapter.client, config),
        new GitHubClient(config)),
      middleware = function(context, next, done) {
        impl.execute(context, next, done);
      };

  middleware.impl = impl;
  robot.receiveMiddleware(middleware);
  log('registered receiveMiddleware');
};
