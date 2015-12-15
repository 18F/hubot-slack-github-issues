/* jshint node: true */

'use strict';

var SlackClient = require('../../lib/slack-client');
var testConfig = require('./test-config.json');

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
    return {
      type: SlackClient.REACTION_ADDED,
      user: exports.USER_ID,
      name: 'evergreen_tree',
      item: {
        type: 'message',
        channel: exports.CHANNEL_ID,
        message: {
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
  },

  metadata: function() {
    return {
      url: 'https://18F.slack.com/archives/handbook/p1360782804083113',
      title: 'Update from @mikebland in #handbook at 1360782804.083113'
    };
  },

  message: function() {
    return { text: 'Hello, world!' };
  },

  githubParams: function() {
    return {
      user:  '18F',
      repo:  'handbook',
      title: exports.metadata().title,
      body:  'From ' + exports.metadata().url + ':\n\n' +
        exports.message().text
    };
  }
};
