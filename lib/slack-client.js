/* jshint node: true */
'use strict';

var http = require('http');

module.exports = SlackClient;

// This client is for 18F-hacked versions of hubot-slack v1.5.0 and
// slack-client v3.4.2.
function SlackClient(robotSlackClient) {
  this.client = robotSlackClient;
  this.protocol = 'https:';
  this.host = 'slack.com';
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

SlackClient.prototype.getMessageText = function(message) {
  return message.text;
};

SlackClient.prototype.getReactions = function(channel, timestamp) {
  return makeApiCall(this, 'reactions.get',
    { channel: channel, timestamp: timestamp });
};

function makeApiCall(that, method, params) {
  return new Promise(function(resolve, reject) {
    var paramsStr, req;

    params.token = process.env.HUBOT_SLACK_TOKEN;
    paramsStr = JSON.stringify(params);

    req = http.request(getHttpOptions(that, method, paramsStr), function(res) {
      handleResponse(res, resolve, reject);
    });
    req.on('error', function(err) {
      reject(new Error('failed to make Slack API request: ' + err.message));
    });
    req.end(paramsStr);
  });
}

function getHttpOptions(that, method, postDataString) {
  return {
    protocol: that.protocol,
    host: that.host,
    port: that.port,
    path: '/api/' + method,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': postDataString.length
    }
  };
}

function handleResponse(res, resolve, reject) {
  var result = '';

  res.setEncoding('utf8');
  res.on('data', function(chunk) {
    result = result + chunk;
  });
  res.on('end', function() {
    if (res.statusCode >=200 && res.statusCode <= 300) {
      resolve(result);
    } else {
      reject(new Error('received ' + res.statusCode +
        ' response from Slack API: ' + result));
    }
  });
}
