/* jshint node: true */

'use strict';

var SlackClient = require('../../lib/slack-client');
var scriptName = require('../../package.json').name;
var testConfig = require('./test-config.json');
var Hubot = require('hubot');
var SlackBot = require('hubot-slack');

exports = module.exports = {
  REACTION: 'evergreen_tree',
  USER_ID: 'U5150OU812',
  CHANNEL_ID: 'C5150OU812',
  TIMESTAMP: '1360782804.083113',
  MSG_ID: 'C5150OU812:1360782804.083113',
  PERMALINK: 'https://18f.slack.com/archives/handbook/p1360782804083113',
  ISSUE_URL: 'https://github.com/18F/handbook/issues/1',

  baseConfig: function() {
    // Notes on the `rules:` property:
    // - The first one matches the 'evergreen_tree' reaction from
    //   reactionAddedMessage(), but is specific to a different channel.
    // - The second one doesn't match reactionAddedMessage() at all.
    // - The third one matches an 'evergreen_tree' message in any channel, and
    //   should match reactionAddedMessage().
    return JSON.parse(JSON.stringify(testConfig));
  },

  configRule: function() {
    return {
      reactionName: exports.REACTION,
      githubRepository: 'hubot-slack-github-issues',
      channelName: 'hub'
    };
  },

  reactionAddedMessage: function() {
    var user, text, message;

    user = new Hubot.User(exports.USER_ID,
      { id: exports.USER_ID, name: 'mikebland', room: 'handbook' });
    text = 'Hello, world!';
    message = {
      type: SlackClient.REACTION_ADDED,
      user: exports.USER_ID,
      name: exports.REACTION,
      item: {
        type: 'message',
        channel: exports.CHANNEL_ID,
        message: {
          ts: exports.TIMESTAMP,
          text: text,
          reactions: [
            {
              name: exports.REACTION,
              count: 1,
              users: [ exports.USER_ID ]
            }
          ]
        }
      },
      'event_ts': exports.TIMESTAMP
    };
    return new SlackBot.SlackTextMessage(user, text, text, message);
  },

  metadata: function() {
    return {
      domain: '18f',
      channel: 'handbook',
      user: 'mikebland',
      timestamp: exports.TIMESTAMP,
      date: new Date(1360782804.083113 * 1000),
      title: 'Update from @mikebland in #handbook at ' +
        'Wed, 13 Feb 2013 19:13:24 GMT',
      url: exports.PERMALINK
    };
  },

  githubParams: function() {
    return {
      user:  '18F',
      repo:  'handbook',
      title: exports.metadata().title,
      body:  exports.metadata().url
    };
  },

  logMessage: function(message) {
    return scriptName + ': ' + exports.MSG_ID + ': ' + message;
  },

  matchingRuleLogMessage: function() {
    var matchingRule = exports.baseConfig().rules[2];
    return exports.logMessage('matches rule: ' + JSON.stringify(matchingRule));
  },

  githubLogMessage: function() {
    return exports.logMessage('making GitHub request for ' + exports.PERMALINK);
  },

  successLogMessage: function() {
    return exports.logMessage('created: ' + exports.ISSUE_URL);
  },

  failureMessage: function(message) {
    var params = exports.githubParams();

    return 'failed to create a GitHub issue in ' +
      params.user + '/' + params.repo + ': ' + message;
  },

  failureLogMessage: function(message) {
    return exports.logMessage(exports.failureMessage(message));
  }
};
