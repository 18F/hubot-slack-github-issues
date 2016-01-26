/* jshint node: true */
/* jshint mocha: true */
/* jshint expr: true */

'use strict';

var SlackClient = require('../lib/slack-client');
var ApiStubServer = require('./helpers/api-stub-server');
var helpers = require('./helpers');
var url = require('url');
var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');

chai.should();
chai.use(chaiAsPromised);

describe('SlackClient', function() {
  var slackClient, config, slackApiServer, slackToken, setResponse, payload,
      params;

  before(function() {
    slackApiServer = new ApiStubServer();
    config = helpers.baseConfig();
    config.slackApiBaseUrl = slackApiServer.address() + '/api/';
    slackClient = new SlackClient(undefined, config);

    slackToken = '<18F-slack-api-token>';
    process.env.HUBOT_SLACK_TOKEN = slackToken;
  });

  after(function() {
    delete process.env.HUBOT_SLACK_TOKEN;
    slackApiServer.close();
  });

  afterEach(function() {
    slackApiServer.urlsToResponses = {};
  });

  setResponse = function(expectedUrl, expectedParams, statusCode, payload) {
    slackApiServer.urlsToResponses[expectedUrl] = {
      expectedParams: expectedParams,
      statusCode: statusCode,
      payload: payload
    };
  };

  describe('API base URL', function() {
    it('should parse the local server URL', function() {
      url.format(slackClient.baseurl).should.eql(
        slackApiServer.address() + '/api/');
    });

    it('should parse API_BASE_URL if config base URL undefined', function() {
      var slackClient = new SlackClient(undefined, helpers.baseConfig());
      url.format(slackClient.baseurl).should.eql(SlackClient.API_BASE_URL);
    });
  });

  describe('getReactions', function() {
    beforeEach(function() {
      params = {
        channel: helpers.CHANNEL_ID,
        timestamp: helpers.TIMESTAMP,
        token: slackToken
      };
      payload = helpers.messageWithReactions();
    });

    it('should make a successful request', function() {
      setResponse('/api/reactions.get', params, 200, payload);
      return slackClient.getReactions(helpers.CHANNEL_ID, helpers.TIMESTAMP)
        .should.become(payload);
    });

    it('should fail to make a request if the server is down', function() {
      var config = helpers.baseConfig(),
          slackClient;
      config.slackApiBaseUrl = 'http://localhost';
      slackClient = new SlackClient(undefined, config);

      return slackClient.getReactions(helpers.CHANNEL_ID, helpers.TIMESTAMP)
        .should.be.rejectedWith('failed to make Slack API request ' +
          'for method reactions.get:');
    });

    it('should make an unsuccessful request', function() {
      payload = {
        ok: false,
        error: 'not_authed'
      };
      setResponse('/api/reactions.get', params, 200, payload);
      return slackClient.getReactions(helpers.CHANNEL_ID, helpers.TIMESTAMP)
        .should.be.rejectedWith(Error, 'Slack API method reactions.get ' +
          'failed: ' + payload.error);
    });

    it('should make a request that produces a non-200 response', function() {
      setResponse('/api/reactions.get', params, 404, 'Not found');
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
        name: config.successReaction,
        token: slackToken
      };
      payload = { ok: true };
    });

    it('should make a successful request', function() {
      setResponse('/api/reactions.add', params, 200, payload);
      return slackClient.addSuccessReaction(
        helpers.CHANNEL_ID, helpers.TIMESTAMP).should.become(payload);
    });
  });
});
