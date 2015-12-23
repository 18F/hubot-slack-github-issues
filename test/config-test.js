/* jshint node: true */
/* jshint mocha: true */
/* jshint expr: true */

'use strict';

var Config = require('../lib/config');
var scriptName = require('../package.json').name;
var helpers = require('./helpers');
var LogHelper = require('./helpers/log-helper');
var chai = require('chai');
var path = require('path');

var expect = chai.expect;
chai.should();

describe('Config', function() {
  var logHelper, newConfig;

  before(function() {
    process.env.HUBOT_SLACK_GITHUB_ISSUES_CONFIG_PATH = path.join(
      __dirname, 'helpers', 'test-config.json');
    logHelper = new LogHelper();
  });

  after(function() {
    delete process.env.HUBOT_SLACK_GITHUB_ISSUES_CONFIG_PATH;
  });

  newConfig = function(config) {
    try {
      logHelper.captureLog();
      return new Config(config);
    } finally {
      logHelper.restoreLog();
    }
  };

  it('should validate the base config', function() {
    var baseConfig = helpers.baseConfig(),
        config = new Config(baseConfig);
    expect(JSON.stringify(config)).to.equal(JSON.stringify(baseConfig));
  });

  it('should raise errors for missing required fields', function() {
    var errors = [
          'missing githubUser',
          'missing githubTimeout',
          'missing slackTimeout',
          'missing successReaction',
          'missing rules'
        ],
        errorMsg = 'Invalid configuration:\n  ' + errors.join('\n  ');

    expect(function() { newConfig({}); }).to.throw(errorMsg);
    expect(logHelper.messages).to.eql([scriptName + ': ' + errorMsg]);
  });

  it('should raise errors for missing required rules fields', function() {
    var config = helpers.baseConfig(),
        errors,
        errorMsg;

    delete config.rules[0].reactionName;
    delete config.rules[0].githubRepository;

    errors = [
      'rule 0 missing reactionName',
      'rule 0 missing githubRepository'
    ];
    errorMsg = 'Invalid configuration:\n  ' + errors.join('\n  ');

    expect(function() { newConfig(config); }).to.throw(errorMsg);
    expect(logHelper.messages).to.eql([scriptName + ': ' + errorMsg]);
  });

  it('should raise errors for unknown properties', function() {
    var config = helpers.baseConfig(),
        errors,
        errorMsg;

    config.foo = {};
    config.bar = {};
    config.rules[0].baz = {};
    config.rules.push({
      'reactionName': 'smiley',
      'githubRepository': '18F/hubot-slack-github-issues',
      'channelNames': ['hub'],
      'quux': {}
    });

    errors = [
      'unknown property foo',
      'unknown property bar',
      'rule 0 contains unknown property baz',
      'rule 3 contains unknown property quux',
    ];
    errorMsg = 'Invalid configuration:\n  ' + errors.join('\n  ');

    expect(function() { newConfig(config); }).to.throw(errorMsg);
    expect(logHelper.messages).to.eql([scriptName + ': ' + errorMsg]);
  });

  it('should load from HUBOT_SLACK_GITHUB_ISSUES_CONFIG_PATH', function() {
    var baseConfig = helpers.baseConfig(),
        config = newConfig();
    expect(JSON.stringify(config)).to.eql(JSON.stringify(baseConfig));
    expect(logHelper.messages).to.eql([
      scriptName + ': loading config from ' +
        process.env.HUBOT_SLACK_GITHUB_ISSUES_CONFIG_PATH
    ]);
  });

  it('should load from config/slack-github-issues.json by default', function() {
    var defaultConfig = require('../config/slack-github-issues.json'),
        config;

    delete process.env.HUBOT_SLACK_GITHUB_ISSUES_CONFIG_PATH;
    config = newConfig();
    expect(JSON.stringify(config)).to.eql(JSON.stringify(defaultConfig));
    expect(logHelper.messages).to.eql([
      scriptName + ': loading config from config/slack-github-issues.json'
    ]);
  });

  describe('checkForMisconfiguredRules', function() {
    it('should detect when rules are not sorted', function() {
      var config = helpers.baseConfig(),
          errorMessage,
          NUM_SPACES = 2;

      config.rules = [
        config.rules[1],
        config.rules[2],
        config.rules[0]
      ];
      errorMessage = 'Invalid configuration:\n' +
        '  rules are not sorted; expected: ' +
        JSON.stringify(helpers.baseConfig().rules, null, NUM_SPACES)
          .replace(/\n/g, '\n  ');

      expect(function() { newConfig(config); }).to.throw(errorMessage);
      expect(logHelper.messages).to.eql([
        scriptName + ': ' + errorMessage
      ]);
    });

    it('should detect duplicate repos for same reaction', function() {
      var config = helpers.baseConfig(),
          errorMessage;

      config.rules.forEach(function(rule) {
        rule.githubRepository = 'handbook';
      });
      errorMessage = 'Invalid configuration:\n' +
        '  duplicate repositories for evergreen_tree rules:\n' +
        '    handbook';
      expect(function() { newConfig(config); }).to.throw(errorMessage);
      expect(logHelper.messages).to.eql([
        [scriptName + ': ' + errorMessage]
      ]);
    });

    it('should detect duplicate repos and channels for reaction', function() {
      var config = helpers.baseConfig(),
          errorMessage;

      config.rules.forEach(function(rule) {
        rule.githubRepository = 'handbook';
        rule.channelNames = ['hub'];
      });

      config.rules[0].channelNames.unshift('handbook');
      config.rules[1].channelNames.push('wg-documentation');
      errorMessage = 'Invalid configuration:\n' +
        '  duplicate repositories for evergreen_tree rules:\n' +
        '    handbook\n' +
        '  duplicate channels for evergreen_tree rules:\n' +
        '    hub';
      expect(function() { newConfig(config); }).to.throw(errorMessage);
      expect(logHelper.messages).to.eql([
        [scriptName + ': ' + errorMessage]
      ]);
    });
  });
});
