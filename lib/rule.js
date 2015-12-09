/* jshint node: true */
'use strict';

var RTM_EVENTS = require('slack-client/lib/clients/rtm/events/rtm-events');
var REACTION_ADDED = RTM_EVENTS.EVENTS.REACTION_ADDED;

module.exports = Rule;

function Rule(configRule) {
  for (var property in configRule) {
    if (configRule.hasOwnProperty(property)) {
      this.property = configRule.property;
    }
  }
}

Rule.prototype.match = function(message, slackClient) {
  return (this.reactionMatches(message) &&
    !this.issueAlreadyFiled(message) &&
    this.channelMatches(message, slackClient));
};

Rule.prototype.reactionMatches = function(message) {
  return message.type === REACTION_ADDED && message.name === this.reactionName;
};

Rule.prototype.issueAlreadyFiled = function(message) {
  // Presume that an issue already exists if this isn't the first reaction.
  var reaction = message.item.message.reactions.find(function(reaction) {
    return reaction.name === this.reactionName;
  });
  return reaction && reaction.count !== 1;
};

Rule.prototype.channelMatches = function(message, slackClient) {
  var channel;

  if (this.channelName) {
    channel = slackClient.getChannelByID(message.item.channel);
  }
  return channel === this.channelName;
};
