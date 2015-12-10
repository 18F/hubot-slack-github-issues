/* jshint node: true */
/* jshint mocha: true */

'use strict';

var Config = require('../lib/config');
var chai = require('chai');
var fs = require('fs');
var path = require('path');

var expect = chai.expect;
chai.should();

function newBaseConfig() {
  return {
    'githubUser': 'mbland',
    'githubToken': '<mbland-api-token>',
    'githubTimeout': 5000,
    'rules': [
      {
        'reactionName': 'evergreen_tree',
        'githubRepository': '18F/handbook'
      }
    ]
  };
}

describe('Config', function() {
  it('should validate the base config', function() {
    var baseConfig = newBaseConfig(),
        config = new Config(baseConfig);
    expect(JSON.stringify(config)).to.equal(JSON.stringify(baseConfig));
  });

  it('should validate a rule specifying a channel', function() {
    var configWithChannelRule = newBaseConfig(),
        config;
    
    configWithChannelRule.rules.push({
      'reactionName': 'smiley',
      'githubRepository': '18F/hubot-slack-github-issues',
      'channelName': 'hub'
    });
    config = new Config(configWithChannelRule);
    expect(JSON.stringify(config)).to.eql(
      JSON.stringify(configWithChannelRule));
  });

  it('should raise errors for missing required fields', function() {
    var errors = [
      'missing githubUser',
      'missing githubToken',
      'missing githubTimeout',
      'missing rules'
    ];
    expect(function() { new Config({}); }).to.throw(  // jshint ignore:line
      'Invalid configuration:\n  ' + errors.join('\n  '));
  });

  it('should raise errors for missing required rules fields', function() {
    var config = newBaseConfig(),
        errors;

    delete config.rules[0].reactionName;
    delete config.rules[0].githubRepository;

    errors = [
      'rule 0 missing reactionName',
      'rule 0 missing githubRepository'
    ];

    expect(function() { new Config(config); }).to.throw(  // jshint ignore:line
      'Invalid configuration:\n  ' + errors.join('\n  '));
  });

  it('should raise errors for unknown properties', function() {
    var config = newBaseConfig(),
        errors;

    config.foo = {};
    config.bar = {};
    config.rules[0].baz = {};
    config.rules.push({
      'reactionName': 'smiley',
      'githubRepository': '18F/hubot-slack-github-issues',
      'channelName': 'hub',
      'quux': {}
    });

    errors = [
      'unknown property foo',
      'unknown property bar',
      'rule 0 contains unknown property baz',
      'rule 1 contains unknown property quux',
    ];

    expect(function() { new Config(config); }).to.throw(  // jshint ignore:line
      'Invalid configuration:\n  ' + errors.join('\n  '));
  });

  it('should load from HUBOT_SLACK_GITHUB_ISSUES_CONFIG_PATH', function() {
    var testConfigPath = path.join(__dirname, 'test-config.json'),
        baseConfig = newBaseConfig();
    process.env.HUBOT_SLACK_GITHUB_ISSUES_CONFIG_PATH = testConfigPath;
    fs.writeFileSync(testConfigPath, JSON.stringify(baseConfig), 'utf8');

    try {
      var config = new Config();
      expect(JSON.stringify(config)).to.eql(JSON.stringify(baseConfig));
    } catch (err) {
      throw err;
    } finally {
      fs.unlinkSync(testConfigPath);
    }
  });
});
