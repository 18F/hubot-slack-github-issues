/* jshint node: true */
/* jshint mocha: true */
/* jshint expr: true */

'use strict';

var Rule = require('../lib/rule');
var RTM_EVENTS = require('slack-client/lib/clients/rtm/events/rtm-events');
var REACTION_ADDED = RTM_EVENTS.EVENTS.REACTION_ADDED;
var chai = require('chai');

var expect = chai.expect;
chai.should();

var USER_ID = 'U5150OU812';
var CHANNEL_ID = 'C5150OU812';

function newConfigRule() {
  return {
    'reactionName': 'smiley',
    'githubRepository': '18F/hubot-slack-github-issues',
    'channelName': 'hub'
  };
}

function newReactionAddedMessage() {
  return {
    type: REACTION_ADDED,
    user: USER_ID,
    name: 'smiley',
    item: {
      type: 'message',
      channel: CHANNEL_ID,
      message: {
        reactions: [
          {
            name: 'smiley',
            count: 1,
            users: [ USER_ID ]
          }
        ]
      }
    },
    'event_ts': '1360782804.083113'
  };
}

function FakeSlackClient(channelName) {
  this.channelName = channelName;
}

FakeSlackClient.prototype.getChannelByID = function(channelId) {
  this.channelId = channelId;
  return this.channelName;
};

describe('Rule', function() {
  it('should contain all the fields from the configuration', function() {
    var configRule = newConfigRule(),
        rule = new Rule(configRule);
    expect(JSON.stringify(rule)).to.eql(JSON.stringify(configRule));
  });

  it('should match a channel-specific message', function() {
    var rule = new Rule(newConfigRule()),
        message = newReactionAddedMessage(),
        client = new FakeSlackClient('hub');
    expect(rule.match(message, client)).to.be.true;
    expect(client.channelId).to.eql(CHANNEL_ID);
  });

  it('should match a non-channel-specific message', function() {
    var rule = new Rule(newConfigRule()),
        message = newReactionAddedMessage(),
        client = new FakeSlackClient('not-the-hub');
    delete rule.channelName;
    expect(rule.match(message, client)).to.be.true;
    expect(client.channelId).to.be.undefined;
  });

  it('should ignore a message if its type does not match', function() {
    var rule = new Rule(newConfigRule()),
        message = newReactionAddedMessage(),
        client = new FakeSlackClient('hub');
    message.type = RTM_EVENTS.EVENTS.HELLO;
    expect(rule.match(message, client)).to.be.false;
    expect(client.channelId).to.be.undefined;
  });

  it('should ignore a message if its name does not match', function() {
    var rule = new Rule(newConfigRule()),
        message = newReactionAddedMessage(),
        client = new FakeSlackClient('hub');
    message.name = 'sad-face';
    expect(rule.match(message, client)).to.be.false;
    expect(client.channelId).to.be.undefined;
  });

  it('should ignore a message if this is not the first reaction', function() {
    var rule = new Rule(newConfigRule()),
        message = newReactionAddedMessage(),
        client = new FakeSlackClient('hub');
    message.item.message.reactions[0].count = 2;
    expect(rule.match(message, client)).to.be.false;
    expect(client.channelId).to.be.undefined;
  });

  it('should ignore a message if the inner reaction isn\'t found', function() {
    var rule = new Rule(newConfigRule()),
        message = newReactionAddedMessage(),
        client = new FakeSlackClient('hub');
    message.item.message.reactions.pop();
    expect(rule.match(message, client)).to.be.false;
    expect(client.channelId).to.be.undefined;
  });

  it('should ignore a message if the channel doesn\'t match', function() {
    var rule = new Rule(newConfigRule()),
        message = newReactionAddedMessage(),
        client = new FakeSlackClient('not-the-hub');
    expect(rule.match(message, client)).to.be.false;
    expect(client.channelId).to.eql(CHANNEL_ID);
  });
});
