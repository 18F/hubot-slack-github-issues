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
    logHelper = new LogHelper();
    delete process.env.HUBOT_SLACK_GITHUB_ISSUES_CONFIG_PATH;
  });

  afterEach(function() {
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

  it('should validate a valid configuration', function() {
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
        errorMessage = 'Invalid configuration:\n  ' + errors.join('\n  ');

    expect(function() { newConfig({}); }).to.throw(Error, errorMessage);
    expect(logHelper.messages).to.eql([scriptName + ': ' + errorMessage]);
  });

  it('should raise errors for missing required rules fields', function() {
    var config = helpers.baseConfig(),
        errors,
        errorMessage;

    delete config.rules[0].reactionName;
    delete config.rules[0].githubRepository;

    errors = [
      'rule 0 missing reactionName',
      'rule 0 missing githubRepository'
    ];
    errorMessage = 'Invalid configuration:\n  ' + errors.join('\n  ');

    expect(function() { newConfig(config); }).to.throw(Error, errorMessage);
    expect(logHelper.messages).to.eql([scriptName + ': ' + errorMessage]);
  });

  it('should raise errors for unknown properties', function() {
    var config = helpers.baseConfig(),
        errors,
        errorMessage;

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
    errorMessage = 'Invalid configuration:\n  ' + errors.join('\n  ');

    expect(function() { newConfig(config); }).to.throw(Error, errorMessage);
    expect(logHelper.messages).to.eql([scriptName + ': ' + errorMessage]);
  });

  it('should load from HUBOT_SLACK_GITHUB_ISSUES_CONFIG_PATH', function() {
    var baseConfig = helpers.baseConfig(),
        config;

    process.env.HUBOT_SLACK_GITHUB_ISSUES_CONFIG_PATH = path.join(
      __dirname, 'helpers', 'test-config.json');
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

    config = newConfig();
    expect(JSON.stringify(config)).to.eql(JSON.stringify(defaultConfig));
    expect(logHelper.messages).to.eql([
      scriptName + ': loading config from config/slack-github-issues.json'
    ]);
  });

  describe('checkForMisconfiguredRules', function() {
    it('should detect when rules are not sorted by reactionName', function() {
      var config = helpers.baseConfig(),
          errorMessage,
          NUM_SPACES = 2;

      config.rules = [
        { reactionName: 'smiley',
          githubRepository: 'hubot-slack-github-issues'
        },
        { reactionName: 'evergreen_tree',
          githubRepository: 'hub',
          channelNames: ['hub']
        },
        { reactionName: 'evergreen_tree',
          githubRepository: 'handbook',
        }
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

    it('should detect when rules are not sorted by channelNames', function() {
      var config = helpers.baseConfig(),
          errorMessage,
          NUM_SPACES = 2;

      config.rules = [
        { reactionName: 'evergreen_tree',
          githubRepository: 'handbook',
        },
        { reactionName: 'evergreen_tree',
          githubRepository: 'hub',
          channelNames: ['hub']
        },
        { reactionName: 'smiley',
          githubRepository: 'hubot-slack-github-issues'
        }
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

    it('should detect when rules are not sorted by repository', function() {
      var correctConfig = helpers.baseConfig(),
          errorConfig = helpers.baseConfig(),
          errorMessage,
          NUM_SPACES = 2;

      correctConfig.rules = [
        { reactionName: 'evergreen_tree',
          githubRepository: 'handbook',
          channelNames: ['handbook']
        },
        { reactionName: 'evergreen_tree',
          githubRepository: 'hub',
          channelNames: ['hub']
        },
        { reactionName: 'smiley',
          githubRepository: 'hubot-slack-github-issues'
        }
      ];

      errorConfig.rules = [
        correctConfig.rules[1],
        correctConfig.rules[0],
        correctConfig.rules[2],
      ];

      errorMessage = 'Invalid configuration:\n' +
        '  rules are not sorted; expected: ' +
        JSON.stringify(correctConfig.rules, null, NUM_SPACES)
          .replace(/\n/g, '\n  ');

      expect(function() { newConfig(errorConfig); }).to.throw(errorMessage);
      expect(logHelper.messages).to.eql([
        scriptName + ': ' + errorMessage
      ]);
    });

    it('should detect unsorted channel names', function() {
      var config = helpers.baseConfig(),
          errorMessage;

      config.rules[0].githubRepository = 'guides';
      config.rules[0].channelNames = ['wg-testing', 'wg-documentation'];
      config.rules[1].githubRepository = 'handbook';
      config.rules[1].channelNames = ['hub', 'handbook'];
      errorMessage = 'Invalid configuration:\n' +
        '  channelNames for evergreen_tree rule 0 are not sorted; expected:\n' +
        '    wg-documentation\n' +
        '    wg-testing\n' +
        '  channelNames for evergreen_tree rule 1 are not sorted; expected:\n' +
        '    handbook\n' +
        '    hub';
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
        scriptName + ': ' + errorMessage
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
        scriptName + ': ' + errorMessage
      ]);
    });

    it('should detect multiple all-channel rules for reaction', function() {
      var config = helpers.baseConfig(),
          errorMessage;

      config.rules[0].githubRepository = 'handbook';
      delete config.rules[0].channelNames;
      config.rules[1].githubRepository = 'hub';

      errorMessage = 'Invalid configuration:\n' +
        '  multiple all-channel rules defined for evergreen_tree';
      expect(function() { newConfig(config); }).to.throw(errorMessage);
      expect(logHelper.messages).to.eql([
        scriptName + ': ' + errorMessage
      ]);
    });
  });
});
