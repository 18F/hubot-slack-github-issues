/* jshint node: true */
/* jshint mocha: true */
/* jshint expr: true */

'use strict';

var Rule = require('../lib/rule');
var SlackClient = require('../lib/slack-client');
var helpers = require('./helpers');
var config = require('./helpers/test-config.json');
var FakeSlackClient = require('./helpers/fake-slack-client');
var chai = require('chai');

var expect = chai.expect;
chai.should();

describe('Rule', function() {
  it('should contain all the fields from the configuration', function() {
    var configRule = helpers.configRule(),
        rule = new Rule(configRule);
    expect(JSON.stringify(rule)).to.eql(JSON.stringify(configRule));
  });

  it('should match a channel-specific message', function() {
    var rule = new Rule(helpers.configRule()),
        message = helpers.reactionAddedMessage().rawMessage,
        client = new FakeSlackClient('hub');
    expect(rule.match(message, new SlackClient(client, config))).to.be.true;
    expect(client.channelId).to.eql(helpers.CHANNEL_ID);
  });

  it('should match a non-channel-specific message', function() {
    var rule = new Rule(helpers.configRule()),
        message = helpers.reactionAddedMessage().rawMessage,
        client = new FakeSlackClient('not-the-hub');
    delete rule.channelName;
    expect(rule.match(message, new SlackClient(client, config))).to.be.true;
    expect(client.channelId).to.be.undefined;
  });

  it('should ignore a message if its name does not match', function() {
    var rule = new Rule(helpers.configRule()),
        message = helpers.reactionAddedMessage().rawMessage,
        client = new FakeSlackClient('hub');
    message.name = 'sad-face';
    expect(rule.match(message, new SlackClient(client, config))).to.be.false;
    expect(client.channelId).to.be.undefined;
  });

  it('should ignore a message if this is not the first reaction', function() {
    var rule = new Rule(helpers.configRule()),
        message = helpers.reactionAddedMessage().rawMessage,
        client = new FakeSlackClient('hub');
    message.item.message.reactions[0].count = 2;
    expect(rule.match(message, new SlackClient(client, config))).to.be.false;
    expect(client.channelId).to.be.undefined;
  });

  it('should ignore a message if the inner reaction isn\'t found', function() {
    var rule = new Rule(helpers.configRule()),
        message = helpers.reactionAddedMessage().rawMessage,
        client = new FakeSlackClient('hub');
    message.item.message.reactions.pop();
    expect(rule.match(message, new SlackClient(client, config))).to.be.false;
    expect(client.channelId).to.be.undefined;
  });

  it('should ignore a message if the channel doesn\'t match', function() {
    var rule = new Rule(helpers.configRule()),
        message = helpers.reactionAddedMessage().rawMessage,
        client = new FakeSlackClient('not-the-hub');
    expect(rule.match(message, new SlackClient(client, config))).to.be.false;
    expect(client.channelId).to.eql(helpers.CHANNEL_ID);
  });
});
