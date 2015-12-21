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
    payload = { ok: true, message: 'Hello, world!' };
  });

  afterEach(function() {
    if (slackApiServer) {
      slackApiServer.close();
    }
  });

  createServer = function(expectedUrl, expectedParams, statusCode, payload) {
    var urlsToResponses = {};

    urlsToResponses[expectedUrl] = {
      expectedParams: expectedParams,
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
        .should.be.rejectedWith('failed to make Slack API request ' +
          'for method reactions.get:');
    });

    it('should make an unsuccessful request', function() {
      payload = {
        ok: false,
        error: 'not_authed'
      };
      createServer('/api/reactions.get', params, 200, payload);
      return slackClient.getReactions(helpers.CHANNEL_ID, helpers.TIMESTAMP)
        .should.be.rejectedWith(Error, 'Slack API method reactions.get ' +
          'failed: ' + payload.error);
    });

    it('should make a request that produces a non-200 response', function() {
      createServer('/api/reactions.get', params, 404, 'Not found');
      return slackClient.getReactions(helpers.CHANNEL_ID, helpers.TIMESTAMP)
        .should.be.rejectedWith(Error, 'received 404 response from ' +
          'Slack API method reactions.get: "Not found"');
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
