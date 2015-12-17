/* jshint node: true */
/* jshint mocha: true */

'use strict';

var SlackClient = require('../lib/slack-client');
var helpers = require('./helpers');
var launchServer = require('./helpers/fake-slack-api-server').launch;
var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');

chai.should();
chai.use(chaiAsPromised);

describe('SlackClient', function() {
  var slackToken, slackApiServer, slackClient, createServer;

  before(function() {
    slackClient = new SlackClient();
    slackClient.protocol = 'http:';
    slackClient.host = 'localhost';
    slackToken = '<18F-slack-api-token>';
    process.env.HUBOT_SLACK_TOKEN = slackToken;
  });

  after(function() {
    delete process.env.HUBOT_SLACK_TOKEN;
  });

  beforeEach(function() {
    slackApiServer = undefined;
  });

  afterEach(function() {
    if (slackApiServer) {
      slackApiServer.close();
    }
  });

  createServer = function(expectedUrl, expectedParams, statusCode, payload) {
    slackApiServer = launchServer(expectedUrl, expectedParams,
      statusCode, payload);
    slackClient.port = slackApiServer.address().port;
  };

  describe('getReactions', function() {
    var payload, params;

    beforeEach(function() {
      payload = '{ "message": "Hello, world!" }';
      params = {
        channel: helpers.CHANNEL_ID,
        timestamp: helpers.TIMESTAMP,
        token: slackToken
      };
    });

    it('should make a successful request', function() {
      createServer('/api/reactions.get', params, 200, payload);
      return slackClient.getReactions(helpers.CHANNEL_ID, helpers.TIMESTAMP)
        .should.become(payload);
    });
  });
});
