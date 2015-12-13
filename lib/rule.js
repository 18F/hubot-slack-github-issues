/* jshint node: true */
'use strict';

var SlackClient = require('./slack-client');

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
    !this.issueAlreadyFiled(message) &&
    this.channelMatches(message, slackClient));
};

Rule.prototype.reactionMatches = function(message) {
  return (message.type === SlackClient.REACTION_ADDED &&
    message.name === this.reactionName);
};

Rule.prototype.issueAlreadyFiled = function(message) {
  // Presume that an issue already exists if this isn't the first reaction.
  var that = this,
      reaction = message.item.message.reactions.find(function(reaction) {
        return reaction.name === that.reactionName;
      });

  // reaction should never be undefined, but we need to handle it anyway.
  return reaction === undefined || reaction.count !== 1;
};

Rule.prototype.channelMatches = function(message, slackClient) {
  var channel;

  if (this.channelName) {
    channel = slackClient.getChannelName(message.item.channel);
  }
  return channel === this.channelName;
};
