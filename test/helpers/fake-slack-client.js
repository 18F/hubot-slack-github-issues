/* jshint node: true */

'use strict';

var Channel = require('slack-client/src/channel');

module.exports = FakeSlackClient;

function FakeSlackClient(channelName) {
  this.channelName = channelName;
}

FakeSlackClient.prototype.getChannelByID = function(channelId) {
  this.channelId = channelId;
  // https://api.slack.com/types/channel
  return new Channel(this,
    { id: channelId, name: this.channelName, 'is_channel': true });
};
