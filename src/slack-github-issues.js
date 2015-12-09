/* jshint node: true */

// https://hubot.github.com/docs/scripting/#middleware
// https://gist.github.com/shokai/d23607d91ea7885a8df7

'use strict';

var Config = require('../lib/config.js');
var GitHubClient = require('../lib/github-client.js');
var Middleware = require('../lib/middleware.js');

module.exports = function(robot, configuration, githubApiClient) {
  var config = new Config(configuration);
  var githubClient = new GitHubClient(config, githubApiClient);
  var middleware = new Middleware(config.rules, robot.adapter.client,
    githubClient);
  robot.receiveMiddleware(function(context, next, done) {
    middleware.execute(context, next, done);
  });
};
