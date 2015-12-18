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
var GitHubClient = require('../lib/github-client');
var FakeSlackClient = require('./helpers/fake-slack-client');
var FakeGitHubApi = require('./helpers/fake-github-api');

var path = require('path');
var chai = require('chai');

chai.should();

describe('Integration test', function() {
  var middlewareImpl = null,
      slackClient = new SlackClient(
       new FakeSlackClient('handbook'), testConfig),
      githubParams = helpers.githubParams(),
      logHelper, logMessages,
      configLogMessages, githubLogMessage;

  before(function() {
    var configPath = path.join(__dirname, 'helpers', 'test-config.json');

    process.env.HUBOT_SLACK_GITHUB_ISSUES_CONFIG_PATH = configPath;
    process.env.HUBOT_GITHUB_TOKEN = '<18F-github-token>';
    configLogMessages = [
      [scriptName + ': loading config from ' + configPath],
      [scriptName + ': registered receiveMiddleware']
    ];
    githubLogMessage = scriptName + ': making GitHub request for ' +
      helpers.metadata().url;
  });

  after(function() {
    delete process.env.HUBOT_GITHUB_TOKEN;
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

    this.room.user.react = function(userName, reaction) {
      return new Promise(function(resolve) {
        var reactionMessage = helpers.reactionAddedMessage(),
            rawMessage = reactionMessage.rawMessage;

        that.room.messages.push([userName, reaction]);
        reactionMessage.user.name = userName;
        rawMessage.name = reaction;
        rawMessage.item.message.reactions[0].name = reaction;
        logHelper.captureLog();
        that.room.robot.receive(reactionMessage, resolve);
      }).then(restoreLog, restoreLog);
    };
  });

  afterEach(function() {
    this.room.destroy();
  });

  context('an evergreen_tree reaction to a message', function() {
    beforeEach(function() {
      var githubApi = new FakeGitHubApi(
        helpers.metadata().url, '', githubParams);

      middlewareImpl.githubClient = new GitHubClient(testConfig, githubApi);
      return this.room.user.react('mikebland', 'evergreen_tree');
    });

    it('should create a GitHub issue', function() {
      this.room.messages.should.eql([
        ['mikebland', 'evergreen_tree'],
        ['hubot', '@mikebland created: ' + helpers.metadata().url]
      ]);
      logMessages.should.eql(configLogMessages.concat([
        [githubLogMessage],
        [scriptName + ': GitHub success: ' + helpers.metadata().url]
      ]));
    });
  });

  context('a evergreen_tree reaction to a message', function() {
    beforeEach(function() {
      var githubApi = new FakeGitHubApi(null, 'test failure', githubParams);

      middlewareImpl.githubClient = new GitHubClient(testConfig, githubApi);
      return this.room.user.react('mikebland', 'evergreen_tree');
    });

    it('should fail to create a GitHub issue', function() {
      this.room.messages.should.eql([
        ['mikebland', 'evergreen_tree'],
        ['hubot', '@mikebland failed to create a GitHub issue ' +
         'in 18F/handbook: test failure']
      ]);
      logMessages.should.eql(configLogMessages.concat([
        [githubLogMessage],
        [scriptName + ': GitHub error: test failure']
      ]));
    });
  });

  context('a message receiving another reaction', function() {
    beforeEach(function() {
      var githubApi = new FakeGitHubApi(
        null, 'should not happen', githubParams);

      middlewareImpl.githubClient = new GitHubClient(testConfig, githubApi);
      return this.room.user.react('mikebland', 'sad-face');
    });

    it('should be ignored', function() {
      this.room.messages.should.eql([['mikebland', 'sad-face']]);
      logMessages.should.eql(configLogMessages);
    });
  });
});
