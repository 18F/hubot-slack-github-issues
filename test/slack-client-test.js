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
  var slackToken, slackApiServer, slackClient, createServer, payload, params;

  before(function() {
    slackClient = new SlackClient(undefined, helpers.baseConfig());
    slackClient.protocol = 'http:';
    slackClient.host = 'localhost';
    slackToken = '<18F-slack-api-token>';
    process.env.HUBOT_SLACK_TOKEN = slackToken;
    params = {
      channel: helpers.CHANNEL_ID,
      timestamp: helpers.TIMESTAMP,
      token: slackToken
    };
  });

  after(function() {
    delete process.env.HUBOT_SLACK_TOKEN;
  });

  beforeEach(function() {
    slackApiServer = undefined;
    payload = '{ "message": "Hello, world!" }';
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
    it('should make a successful request', function() {
      createServer('/api/reactions.get', params, 200, payload);
      return slackClient.getReactions(helpers.CHANNEL_ID, helpers.TIMESTAMP)
        .should.become(payload);
    });

    it('should fail to make a request if the server is down', function() {
      return slackClient.getReactions(helpers.CHANNEL_ID, helpers.TIMESTAMP)
        .should.be.rejectedWith('failed to make Slack API request:');
    });

    it('should make an unsuccessful request', function() {
      // 300-family requests will currently fail as well.
      createServer('/api/reactions.get', params, 404, 'Not found');
      return slackClient.getReactions(helpers.CHANNEL_ID, helpers.TIMESTAMP)
        .should.be.rejectedWith('received 404 response from Slack API: ' +
          'Not found');
    });
  });
});
