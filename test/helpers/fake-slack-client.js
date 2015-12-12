/* jshint node: true */

'use strict';

module.exports = FakeSlackClient;

function FakeSlackClient(channelName) {
  this.channelName = channelName;
}

FakeSlackClient.prototype.getChannelByID = function(channelId) {
  this.channelId = channelId;
  return { name: this.channelName };
};
