/* jshint node: true */
/* jshint mocha: true */

'use strict';

var Helper = require('hubot-test-helper');
var scriptHelper = new Helper('../scripts/slack-github-issues.js');

var scriptName = require('../package.json').name;
var helpers = require('./helpers');
var testConfig = require('./helpers/test-config.json');
var LogHelper = require('./helpers/log-helper');
var SlackClient = require('../lib/slack-client');
var launchSlackApiServer = require('./helpers/fake-slack-api-server').launch;
var GitHubClient = require('../lib/github-client');
var launchGitHubApiServer = require('./helpers/fake-github-api-server').launch;
var FakeSlackClientImpl = require('./helpers/fake-slack-client-impl');

var path = require('path');
var chai = require('chai');

chai.should();

describe('Integration test', function() {
  var middlewareImpl = null,
      slackClient = new SlackClient(
       new FakeSlackClientImpl('handbook'), testConfig),
      slackApiServerUrls,
      slackApiServer,
      githubClient = new GitHubClient(testConfig),
      githubApiServer, createGitHubApiServer,
      logHelper, logMessages, configLogMessages;

  before(function() {
    var configPath = path.join(__dirname, 'helpers', 'test-config.json');

    process.env.HUBOT_SLACK_GITHUB_ISSUES_CONFIG_PATH = configPath;
    process.env.HUBOT_SLACK_TOKEN = '<18F-github-token>';
    process.env.HUBOT_GITHUB_TOKEN = '<18F-github-token>';
    configLogMessages = [
      scriptName + ': loading config from ' + configPath,
      scriptName + ': registered receiveMiddleware'
    ];

    slackApiServerUrls = {
      '/api/reactions.get': {
        expectedParams: {
          channel: helpers.CHANNEL_ID,
          timestamp: helpers.TIMESTAMP,
          token: process.env.HUBOT_SLACK_TOKEN
        },
        statusCode: 200,
        payload: helpers.messageWithReactions()
      },
      '/api/reactions.add': {
        expectedParams: {
          channel: helpers.CHANNEL_ID,
          timestamp: helpers.TIMESTAMP,
          name: helpers.SUCCESS_REACTION,
          token: process.env.HUBOT_SLACK_TOKEN
        },
        statusCode: 200,
        payload: { ok: true }
      }
    };
    slackApiServer = launchSlackApiServer(slackApiServerUrls);
    slackClient.protocol = 'http:';
    slackClient.host = 'localhost';
    slackClient.port = slackApiServer.address().port;

    githubClient.protocol = 'http:';
    githubClient.host = 'localhost';
    githubClient.port = slackApiServer.address().port;
  });

  after(function() {
    slackApiServer.close();
    delete process.env.HUBOT_GITHUB_TOKEN;
    delete process.env.HUBOT_SLACK_TOKEN;
    delete process.env.HUBOT_SLACK_GITHUB_ISSUES_CONFIG_PATH;
  });

  beforeEach(function() {
    var that = this,
        restoreLog = function() {
          logHelper.restoreLog();
          logMessages = logMessages.concat(logHelper.messages);
        };

    logHelper = new LogHelper();
    logHelper.captureLog();
    this.room = scriptHelper.createRoom({ name: 'handbook' });
    logHelper.restoreLog();
    logMessages = logHelper.messages.slice();
    middlewareImpl = this.room.robot.middleware.receive.stack[0].impl;
    middlewareImpl.slackClient = slackClient;
    middlewareImpl.githubClient = githubClient;

    this.room.user.react = function(userName, reaction) {
      return new Promise(function(resolve) {
        var reactionMessage = helpers.reactionAddedMessage(),
            rawMessage = reactionMessage.rawMessage;

        that.room.messages.push([userName, reaction]);
        reactionMessage.user.name = userName;
        rawMessage.reaction = reaction;
        logHelper.captureLog();
        that.room.robot.receive(reactionMessage, resolve);
      }).then(restoreLog, restoreLog);
    };
  });

  createGitHubApiServer = function(statusCode, payload) {
    var metadata = helpers.metadata(),
        expectedParams = {
          title: metadata.title,
          body: metadata.url
        };

    githubApiServer = launchGitHubApiServer('/repos/18F/handbook/issues',
      helpers.REPOSITORY, expectedParams, statusCode, payload);
    githubClient.port = githubApiServer.address().port;
  };

  afterEach(function() {
    githubApiServer.close();
    this.room.destroy();
  });

  context('an evergreen_tree reaction to a message', function() {
    beforeEach(function() {
      createGitHubApiServer(200, { 'html_url': helpers.ISSUE_URL });
      return this.room.user.react('mikebland', 'evergreen_tree');
    });

    it('should create a GitHub issue', function() {
      this.room.messages.should.eql([
        ['mikebland', 'evergreen_tree'],
        ['hubot', '@mikebland created: ' + helpers.ISSUE_URL]
      ]);

      logMessages.should.eql(configLogMessages.concat([
        helpers.matchingRuleLogMessage(),
        helpers.getReactionsLogMessage(),
        helpers.githubLogMessage(),
        helpers.addSuccessReactionLogMessage(),
        helpers.successLogMessage()
      ]));
    });
  });

  context('a evergreen_tree reaction to a message', function() {
    var payload = { message: 'test failure' };
    beforeEach(function() {
      createGitHubApiServer(500, payload);
      return this.room.user.react('mikebland', 'evergreen_tree');
    });

    it('should fail to create a GitHub issue', function() {
      var errorMessage = helpers.failureMessage(
        'received 500 response from GitHub API: ' + JSON.stringify(payload));

      this.room.messages.should.eql([
        ['mikebland', 'evergreen_tree'],
        ['hubot', '@mikebland ' + errorMessage ]
      ]);

      logMessages.should.eql(configLogMessages.concat([
        helpers.matchingRuleLogMessage(),
        helpers.getReactionsLogMessage(),
        helpers.githubLogMessage(),
        helpers.logMessage(errorMessage)
      ]));
    });
  });

  context('a message receiving another reaction', function() {
    beforeEach(function() {
      createGitHubApiServer(500, { message: 'should not happen' });
      return this.room.user.react('mikebland', 'sad-face');
    });

    it('should be ignored', function() {
      this.room.messages.should.eql([['mikebland', 'sad-face']]);
      logMessages.should.eql(configLogMessages);
    });
  });
});
