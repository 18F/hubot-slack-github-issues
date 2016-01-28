/* jshint node: true */

'use strict';

var testConfig = require('./test-config.json');
var SlackClient = require('../../lib/slack-client');
var Hubot = require('hubot');
var SlackBot = require('hubot-slack');

exports = module.exports = {
  REACTION: 'evergreen_tree',
  USER_ID: 'U5150OU812',
  CHANNEL_ID: 'C5150OU812',
  TIMESTAMP: '1360782804.083113',
  PERMALINK: 'https://18f.slack.com/archives/handbook/p1360782804083113',
  ISSUE_URL: 'https://github.com/18F/handbook/issues/1',
  MESSAGE_ID: 'C5150OU812:1360782804.083113',

  baseConfig: function() {
    return JSON.parse(JSON.stringify(testConfig));
  },

  reactionAddedMessage: function() {
    return {
      type: SlackClient.REACTION_ADDED,
      user: exports.USER_ID,
      item: {
        type: 'message',
        channel: exports.CHANNEL_ID,
        ts: exports.TIMESTAMP
      },
      reaction: exports.REACTION,
      'event_ts': exports.TIMESTAMP
    };
  },

  fullReactionAddedMessage: function() {
    var user, text, message;

    user = new Hubot.User(exports.USER_ID,
      { id: exports.USER_ID, name: 'jquser', room: 'handbook' });
    text = exports.REACTION;
    message = exports.reactionAddedMessage();
    return new SlackBot.SlackTextMessage(user, text, text, message);
  },

  messageWithReactions: function() {
    return {
      ok: true,
      type: 'message',
      channel: exports.CHANNEL_ID,
      message: {
        type: 'message',
        ts: exports.TIMESTAMP,
        permalink: exports.PERMALINK,
        reactions: [
        ]
      }
    };
  },

  metadata: function() {
    return {
      channel: 'handbook',
      timestamp: exports.TIMESTAMP,
      url: exports.PERMALINK,
      date: new Date(1360782804.083113 * 1000),
      title: 'Update from #handbook at Wed, 13 Feb 2013 19:13:24 GMT',
    };
  },

  logArgs: function() {
    var args = new Array(arguments.length),
        i;

    for (i = 0; i !== args.length; ++i) {
      args[i] = arguments[i];
    }
    args.unshift(exports.MESSAGE_ID);
    return args;
  }
};
