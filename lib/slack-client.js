/* jshint node: true */

'use strict';

var http = require('http');
var https = require('https');
var querystring = require('querystring');
var url = require('url');

module.exports = SlackClient;

function SlackClient(robotSlackClient, config) {
  this.client = robotSlackClient;
  this.timeout = config.slackTimeout;
  this.successReaction = config.successReaction;
  this.baseurl = url.parse(config.slackApiBaseUrl || SlackClient.API_BASE_URL);
}

SlackClient.API_BASE_URL = 'https://slack.com/api/';

// From: https://api.slack.com/events/reaction_added
// May get this directly from a future version of the slack-client package.
SlackClient.REACTION_ADDED = 'reaction_added';

SlackClient.prototype.getChannelName = function(channelId) {
  return this.client.getChannelByID(channelId).name;
};

SlackClient.prototype.getTeamDomain = function() {
  return this.client.team.domain;
};

SlackClient.prototype.getReactions = function(channel, timestamp) {
  return makeApiCall(this, 'reactions.get',
    { channel: channel, timestamp: timestamp });
};

SlackClient.prototype.addSuccessReaction = function(channel, timestamp) {
  return makeApiCall(this, 'reactions.add',
    { channel: channel, timestamp: timestamp, name: this.successReaction });
};

function getHttpOptions(client, method, queryParams) {
  var baseurl = client.baseurl;
  return {
    protocol: baseurl.protocol,
    host: baseurl.hostname,
    port: baseurl.port,
    path: baseurl.pathname + method + '?' + querystring.stringify(queryParams),
    method: 'GET'
  };
}

function makeApiCall(client, method, params) {
  var requestFactory = (client.baseurl.protocol === 'https:') ? https : http;

  return new Promise(function(resolve, reject) {
    var httpOptions, req;

    params.token = process.env.HUBOT_SLACK_TOKEN;
    httpOptions = getHttpOptions(client, method, params);

    req = requestFactory.request(httpOptions, function(res) {
      handleResponse(method, res, resolve, reject);
    });

    req.setTimeout(client.timeout);
    req.on('error', function(err) {
      reject(new Error('failed to make Slack API request for method ' +
        method + ': ' + err.message));
    });
    req.end();
  });
}

function handleResponse(method, res, resolve, reject) {
  var result = '';

  res.setEncoding('utf8');
  res.on('data', function(chunk) {
    result = result + chunk;
  });
  res.on('end', function() {
    var parsed;

    if (res.statusCode >= 200 && res.statusCode < 300) {
      parsed = JSON.parse(result);

      if (parsed.ok) {
        resolve(parsed);
      } else {
        reject(new Error('Slack API method ' + method + ' failed: ' +
          parsed.error));
      }
    } else {
      reject(new Error('received ' + res.statusCode +
        ' response from Slack API method ' + method + ': ' + result));
    }
  });
}
