/* jshint node: true */
/* jshint mocha: true */

'use strict';

var Config = require('../lib/config');
var helpers = require('./helpers');
var chai = require('chai');
var path = require('path');

var expect = chai.expect;
chai.should();

describe('Config', function() {
  before(function() {
    process.env.HUBOT_SLACK_GITHUB_ISSUES_CONFIG_PATH = path.join(
      __dirname, 'helpers', 'test-config.json');
  });

  after(function() {
    delete process.env.HUBOT_SLACK_GITHUB_ISSUES_CONFIG_PATH;
  });

  it('should validate the base config', function() {
    var baseConfig = helpers.baseConfig(),
        config = new Config(baseConfig);
    expect(JSON.stringify(config)).to.equal(JSON.stringify(baseConfig));
  });

  it('should validate a rule specifying a channel', function() {
    var configWithChannelRule = helpers.baseConfig(),
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
      'missing githubTimeout',
      'missing rules'
    ];
    expect(function() { new Config({}); }).to.throw(  // jshint ignore:line
      'Invalid configuration:\n  ' + errors.join('\n  '));
  });

  it('should raise errors for missing required rules fields', function() {
    var config = helpers.baseConfig(),
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
    var config = helpers.baseConfig(),
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
      'rule 3 contains unknown property quux',
    ];

    expect(function() { new Config(config); }).to.throw(  // jshint ignore:line
      'Invalid configuration:\n  ' + errors.join('\n  '));
  });

  it('should load from HUBOT_SLACK_GITHUB_ISSUES_CONFIG_PATH', function() {
    var baseConfig = helpers.baseConfig(),
        config = new Config();
    expect(JSON.stringify(config)).to.eql(JSON.stringify(baseConfig));
  });

  it('should load from config/slack-github-issues.json by default', function() {
    var defaultConfig = require('../config/slack-github-issues.json'),
        config;

    delete process.env.HUBOT_SLACK_GITHUB_ISSUES_CONFIG_PATH;
    config = new Config();
    expect(JSON.stringify(config)).to.eql(JSON.stringify(defaultConfig));
  });
});
