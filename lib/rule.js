/* jshint node: true */
'use strict';

module.exports = Rule;

function Rule(configRule) {
  for (var property in configRule) {
    if (configRule.hasOwnProperty(property)) {
      this[property] = configRule[property];
    }
  }
}

// This expects just the rawMessage from a SlackTextMessage.
Rule.prototype.match = function(message, slackClient) {
  return (this.reactionMatches(message) &&
    this.channelMatches(message, slackClient));
};

Rule.prototype.reactionMatches = function(message) {
  return message.reaction === this.reactionName;
};

Rule.prototype.channelMatches = function(message, slackClient) {
  var channel;

  if (this.channelName) {
    channel = slackClient.getChannelName(message.item.channel);
  }
  return channel === this.channelName;
};
