/* jshint node: true */
'use strict';

module.exports = SlackClient;

// This client is for 18F-hacked versions of hubot-slack v1.5.0 and
// slack-client v3.4.2.
function SlackClient(robotSlackClient) {
  this.client = robotSlackClient;
}

// From: https://api.slack.com/events/reaction_added
// May get this directly from a future version of the slack-client package.
SlackClient.REACTION_ADDED = 'reaction_added';

SlackClient.prototype.getChannelName = function(channelId) {
  return this.client.getChannelByID(channelId).name;
};

SlackClient.prototype.getTeamDomain = function() {
  return this.client.team.domain;
};

SlackClient.prototype.getUserName = function(userId) {
  return this.client.getUserByID(userId).name;
};
