/* jshint node: true */
/* jshint mocha: true */

'use strict';

var SlackClient = require('../lib/slack-client');
var helpers = require('./helpers');
var testConfig = require('./helpers/test-config.json');
var launchServer = require('./helpers/fake-slack-api-server').launch;
var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');

chai.should();
chai.use(chaiAsPromised);

describe('SlackClient', function() {
  var slackToken, slackApiServer, slackClient, createServer, payload, params;

  before(function() {
    slackClient = new SlackClient(undefined, testConfig);
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
    payload = JSON.stringify(helpers.messageWithReactions());
  });

  afterEach(function() {
    if (slackApiServer) {
      slackApiServer.close();
    }
  });

  createServer = function(expectedUrl, expectedParams, statusCode, payload) {
    var urlsToResponses = {};

    urlsToResponses[expectedUrl] = {
      expectedBody: expectedParams,
      statusCode: statusCode,
      payload: payload
    };
    slackApiServer = launchServer(urlsToResponses);
    slackClient.port = slackApiServer.address().port;
  };

  describe('getReactions', function() {
    beforeEach(function() {
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

  describe('addSuccessReaction', function() {
    beforeEach(function() {
      params = {
        channel: helpers.CHANNEL_ID,
        timestamp: helpers.TIMESTAMP,
        name: testConfig.successReaction,
        token: slackToken
      };
    });

    it('should make a successful request', function() {
      createServer('/api/reactions.add', params, 200, payload);
      return slackClient.addSuccessReaction(
        helpers.CHANNEL_ID, helpers.TIMESTAMP).should.become(payload);
    });
  });
});
