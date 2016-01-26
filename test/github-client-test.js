/* jshint node: true */
/* jshint mocha: true */
/* jshint expr: true */

'use strict';

var GitHubClient = require('../lib/github-client');
var ApiStubServer = require('./helpers/api-stub-server');
var helpers = require('./helpers');
var url = require('url');
var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');

chai.should();
chai.use(chaiAsPromised);

describe('GitHubClient', function() {
  var githubClient, githubApiServer, setResponse;

  before(function() {
    var config = helpers.baseConfig();
    githubApiServer = new ApiStubServer();
    config.githubApiBaseUrl = githubApiServer.address();
    githubClient = new GitHubClient(config);
  });

  after(function() {
    githubApiServer.close();
  });

  afterEach(function() {
    githubApiServer.urlsToResponses = {};
  });

  setResponse = function(statusCode, payload) {
    var metadata = helpers.metadata();

    githubApiServer.urlsToResponses['/repos/18F/handbook/issues'] = {
      expectedParams: {
        title: metadata.title,
        body: metadata.url
      },
      statusCode: statusCode,
      payload: payload
    };
  };

  describe('API base URL', function() {
    it('should parse the local server URL', function() {
      url.format(githubClient.baseurl).should.eql(
        githubApiServer.address() + '/');
    });

    it('should parse API_BASE_URL if config base URL undefined', function() {
      var githubClient = new GitHubClient(helpers.baseConfig());
      url.format(githubClient.baseurl).should.eql(GitHubClient.API_BASE_URL);
    });
  });

  it('should successfully file an issue', function() {
    setResponse(201, { 'html_url': helpers.ISSUE_URL });
    return githubClient.fileNewIssue(helpers.metadata(), 'handbook')
      .should.eventually.equal(helpers.ISSUE_URL);
  });

  it('should fail to make a request if the server is down', function() {
    var config = helpers.baseConfig(),
        githubClient;
    config.githubApiBaseUrl = 'http://localhost';
    githubClient = new GitHubClient(config);

  return githubClient.fileNewIssue(helpers.metadata(), 'handbook')
      .should.be.rejectedWith('failed to make GitHub API request:');
  });

  it('should receive an error when filing an issue', function() {
    var payload = { message: 'test failure' };
    setResponse(500, payload);
    return githubClient.fileNewIssue(helpers.metadata(), 'handbook')
      .should.be.rejectedWith(Error, 'received 500 response from GitHub ' +
        'API: ' + JSON.stringify(payload));
  });
});
