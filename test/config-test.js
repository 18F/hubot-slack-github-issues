'use strict';

var Config = require('../lib/config');
var Logger = require('../lib/logger');
var helpers = require('./helpers');
var path = require('path');

var sinon = require('sinon');
var chai = require('chai');
var expect = chai.expect;

describe('Config', function() {
  before(function() {
    delete process.env.HUBOT_SLACK_GITHUB_ISSUES_CONFIG_PATH;
  });

  afterEach(function() {
    delete process.env.HUBOT_SLACK_GITHUB_ISSUES_CONFIG_PATH;
  });

  it('should validate a valid configuration', function() {
    var configData = helpers.baseConfig(),
        config = new Config(configData);

    expect(JSON.stringify(config)).to.equal(JSON.stringify(configData));
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

    expect(function() { return new Config({}); }).to.throw(Error, errorMessage);
  });

  it('should validate optional config fields', function() {
    var configData = helpers.baseConfig(),
        config;
    configData.githubApiBaseUrl = 'http://localhost/github/';
    configData.slackApiBaseUrl = 'http://localhost/slack/';
    configData.rules[0].channelNames = ['hub'];

    config = new Config(configData);
    expect(JSON.stringify(config)).to.equal(JSON.stringify(configData));
  });

  it('should raise errors for unknown top-level properties', function() {
    var configData = helpers.baseConfig(),
        errors = [
          'unknown property foo',
          'unknown property baz',
          'rule 0 contains unknown property xyzzy',
          'rule 3 contains unknown property quux'
        ],
        errorMessage = 'Invalid configuration:\n  ' + errors.join('\n  ');

    configData.foo = 'bar';
    configData.baz = ['quux'];
    configData.rules[0].xyzzy = 'plugh';
    configData.rules.push({
      'reactionName': 'smiley',
      'githubRepository': '18F/hubot-slack-github-issues',
      'channelNames': ['hub'],
      'quux': {}
    });

    expect(function() { return new Config(configData); })
      .to.throw(Error, errorMessage);
  });

  it('should raise errors for missing required rules fields', function() {
    var configData = helpers.baseConfig(),
        errors = [
          'rule 0 missing reactionName',
          'rule 2 missing githubRepository'
        ],
        errorMessage = 'Invalid configuration:\n  ' + errors.join('\n  ');

    delete configData.rules[0].reactionName;
    delete configData.rules[2].githubRepository;

    expect(function() { return new Config(configData); })
      .to.throw(Error, errorMessage);
  });

  it('should load from HUBOT_SLACK_GITHUB_ISSUES_CONFIG_PATH', function() {
    var testConfig = require('./helpers/test-config.json'),
        logger = new Logger(console),
        configPath = path.join(__dirname, 'helpers', 'test-config.json'),
        config;

    process.env.HUBOT_SLACK_GITHUB_ISSUES_CONFIG_PATH = configPath;
    sinon.stub(logger, 'info');
    config = new Config(null, logger);
    expect(JSON.stringify(config)).to.eql(JSON.stringify(testConfig));
    expect(logger.info.args).to.eql([
      [null, 'reading configuration from', configPath]
    ]);
  });

  it('should load from config/slack-github-issues.json by default', function() {
    var testConfig = require('../config/slack-github-issues.json'),
        logger = new Logger(console),
        configPath = path.join('config', 'slack-github-issues.json'),
        config;

    sinon.stub(logger, 'info');
    config = new Config(null, logger);
    expect(JSON.stringify(config)).to.eql(JSON.stringify(testConfig));
    expect(logger.info.args).to.eql([
      [null, 'reading configuration from', configPath]
    ]);
  });

  it('should raise an error if the config file does not exist', function() {
    var logger = new Logger(console),
        configPath = path.join(__dirname, 'nonexistent-config-file'),
        errorMessage = 'failed to load configuration from ' + configPath + ': ';

    process.env.HUBOT_SLACK_GITHUB_ISSUES_CONFIG_PATH = configPath;
    sinon.stub(logger, 'info');
    expect(function() { return new Config(null, logger); })
      .to.throw(Error, errorMessage);
    expect(logger.info.args).to.eql([
      [null, 'reading configuration from', configPath]
    ]);
  });

  it('should raise an error if the config file isn\'t valid JSON', function() {
    var logger = new Logger(console),
        errorMessage = 'failed to load configuration from ' + __filename +
          ': invalid JSON: ';

    process.env.HUBOT_SLACK_GITHUB_ISSUES_CONFIG_PATH = __filename;
    sinon.stub(logger, 'info');
    expect(function() { return new Config(null, logger); })
      .to.throw(Error, errorMessage);
    expect(logger.info.args).to.eql([
      [null, 'reading configuration from', __filename]
    ]);
  });

  describe('checkForMisconfiguredRules', function() {
    it('should detect when rules are not sorted by reactionName', function() {
      var configData = helpers.baseConfig(),
          errorMessage,
          NUM_SPACES = 2;

      configData.rules = [
        { reactionName: 'smiley',
          githubRepository: 'hubot-slack-github-issues'
        },
        { reactionName: 'evergreen_tree',
          githubRepository: 'hub',
          channelNames: ['hub']
        },
        { reactionName: 'evergreen_tree',
          githubRepository: 'handbook'
        }
      ];
      errorMessage = 'Invalid configuration:\n' +
        '  rules are not sorted; expected: ' +
        JSON.stringify(helpers.baseConfig().rules, null, NUM_SPACES)
          .replace(/\n/g, '\n  ');

      expect(function() { return new Config(configData); })
        .to.throw(errorMessage);
    });

    it('should detect when rules are not sorted by channelNames', function() {
      var configData = helpers.baseConfig(),
          errorMessage,
          NUM_SPACES = 2;

      configData.rules = [
        { reactionName: 'evergreen_tree',
          githubRepository: 'handbook'
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

      expect(function() { return new Config(configData); })
        .to.throw(errorMessage);
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
        correctConfig.rules[2]
      ];

      errorMessage = 'Invalid configuration:\n' +
        '  rules are not sorted; expected: ' +
        JSON.stringify(correctConfig.rules, null, NUM_SPACES)
          .replace(/\n/g, '\n  ');

      expect(function() { return new Config(errorConfig); })
        .to.throw(errorMessage);
    });

    it('should detect unsorted channel names', function() {
      var configData = helpers.baseConfig(),
          errorMessage;

      configData.rules[0].githubRepository = 'guides';
      configData.rules[0].channelNames = ['wg-testing', 'wg-documentation'];
      configData.rules[1].githubRepository = 'handbook';
      configData.rules[1].channelNames = ['hub', 'handbook'];
      errorMessage = 'Invalid configuration:\n' +
        '  channelNames for evergreen_tree rule 0 are not sorted; expected:\n' +
        '    wg-documentation\n' +
        '    wg-testing\n' +
        '  channelNames for evergreen_tree rule 1 are not sorted; expected:\n' +
        '    handbook\n' +
        '    hub';
      expect(function() { return new Config(configData); })
        .to.throw(errorMessage);
    });

    it('should detect duplicate repos for same reaction', function() {
      var configData = helpers.baseConfig(),
          errorMessage;

      configData.rules.forEach(function(rule) {
        rule.githubRepository = 'handbook';
      });
      errorMessage = 'Invalid configuration:\n' +
        '  duplicate repositories for evergreen_tree rules:\n' +
        '    handbook';
      expect(function() { return new Config(configData); })
        .to.throw(errorMessage);
    });

    it('should detect duplicate repos and channels for reaction', function() {
      var configData = helpers.baseConfig(),
          errorMessage;

      configData.rules.forEach(function(rule) {
        rule.githubRepository = 'handbook';
        rule.channelNames = ['hub'];
      });

      configData.rules[0].channelNames.unshift('handbook');
      configData.rules[1].channelNames.push('wg-documentation');
      errorMessage = 'Invalid configuration:\n' +
        '  duplicate repositories for evergreen_tree rules:\n' +
        '    handbook\n' +
        '  duplicate channels for evergreen_tree rules:\n' +
        '    hub';
      expect(function() { return new Config(configData); })
        .to.throw(errorMessage);
    });

    it('should detect multiple all-channel rules for reaction', function() {
      var configData = helpers.baseConfig(),
          errorMessage;

      configData.rules[0].githubRepository = 'handbook';
      delete configData.rules[0].channelNames;
      configData.rules[1].githubRepository = 'hub';

      errorMessage = 'Invalid configuration:\n' +
        '  multiple all-channel rules defined for evergreen_tree';
      expect(function() { return new Config(configData); })
        .to.throw(errorMessage);
    });
  });
});
