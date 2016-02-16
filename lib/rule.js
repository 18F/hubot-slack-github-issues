'use strict';

module.exports = Rule;

function Rule(configRule) {
  for (var property in configRule) {
    if (configRule.hasOwnProperty(property)) {
      this[property] = configRule[property];
    }
  }
}

Rule.prototype.match = function(message, slackClient) {
  return (this.reactionMatches(message) &&
    this.channelMatches(message, slackClient));
};

Rule.prototype.reactionMatches = function(message) {
  return message.reaction === this.reactionName;
};

Rule.prototype.channelMatches = function(message, slackClient) {
  var channels = this.channelNames,
      channelId = message.item.channel;
  return channels === undefined ||
    channels.indexOf(slackClient.getChannelName(channelId)) !== -1;
};
