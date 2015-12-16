/* jshint node: true */

'use strict';

var SlackClient = require('../../lib/slack-client');
var testConfig = require('./test-config.json');
var Hubot = require('hubot');
var SlackBot = require('hubot-slack');

exports = module.exports = {
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
      reactionName: 'evergreen_tree',
      githubRepository: 'hubot-slack-github-issues',
      channelName: 'hub'
    };
  },

  USER_ID: 'U5150OU812',
  CHANNEL_ID: 'C5150OU812',

  reactionAddedMessage: function() {
    var user, text, message;

    user = new Hubot.User(exports.USER_ID,
      { id: exports.USER_ID, name: 'mikebland', room: 'handbook' });
    text = 'Hello, world!';
    message = {
      type: SlackClient.REACTION_ADDED,
      user: exports.USER_ID,
      name: 'evergreen_tree',
      item: {
        type: 'message',
        channel: exports.CHANNEL_ID,
        message: {
          ts: '1360782804.083113',
          text: text,
          reactions: [
            {
              name: 'evergreen_tree',
              count: 1,
              users: [ exports.USER_ID ]
            }
          ]
        }
      },
      'event_ts': '1360782804.083113'
    };
    return new SlackBot.SlackTextMessage(user, text, text, message);
  },

  metadata: function() {
    return {
      domain: '18f',
      channel: 'handbook',
      user: 'mikebland',
      timestamp: '1360782804.083113',
      date: new Date(1360782804.083113 * 1000),
      title: 'Update from @mikebland in #handbook at ' +
        'Wed, 13 Feb 2013 19:13:24 GMT',
      url: 'https://18f.slack.com/archives/handbook/p1360782804083113'
    };
  },

  githubParams: function() {
    return {
      user:  '18F',
      repo:  'handbook',
      title: exports.metadata().title,
      body:  'From ' + exports.metadata().url + ':\n\n' +
        exports.reactionAddedMessage().text
    };
  }
};
