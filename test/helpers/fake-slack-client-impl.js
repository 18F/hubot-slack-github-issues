/* jshint node: true */

'use strict';

var Channel = require('slack-client/src/channel');
var Team = require('slack-client/src/team');
var User = require('slack-client/src/user');

module.exports = FakeSlackClientImpl;

function FakeSlackClientImpl(channelName) {
  this.channelName = channelName;
  this.team = new Team(this, '18F', '18F', '18f');
}

FakeSlackClientImpl.prototype.getChannelByID = function(channelId) {
  this.channelId = channelId;
  // https://api.slack.com/types/channel
  return new Channel(this,
    { id: channelId, name: this.channelName, 'is_channel': true });
};

FakeSlackClientImpl.prototype.getUserByID = function(userId) {
  this.userId = userId;
  // https://api.slack.com/types/user
  return new User(this, { id: userId, name: 'mikebland' });
};
