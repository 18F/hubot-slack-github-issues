/* jshint node: true */
/* jshint mocha: true */

'use strict';

var GitHubClient = require('../lib/github-client');
var helpers = require('./helpers');
var launchServer = require('./helpers/fake-github-api-server').launch;
var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');

chai.should();
chai.use(chaiAsPromised);

describe('GitHubClient', function() {
  var config = helpers.baseConfig(),
      githubApiServer, createServer, githubClient;

  before(function() {
    process.env.HUBOT_GITHUB_TOKEN = '<18F-github-token>';
  });

  after(function() {
    delete process.env.HUBOT_GITHUB_TOKEN;
  });

  beforeEach(function() {
    githubApiServer = undefined;
    githubClient = new GitHubClient(config);
    githubClient.protocol = 'http:';
    githubClient.host = 'localhost';
  });

  afterEach(function() {
    githubApiServer.close();
  });

  createServer = function(statusCode, payload) {
    var metadata = helpers.metadata(),
        expectedParams = {
          title: metadata.title,
          body: metadata.url
        };

    githubApiServer = launchServer('/repos/18F/handbook/issues',
      expectedParams, statusCode, payload);
    githubClient.port = githubApiServer.address().port;
  };

  it('should successfully file an issue', function() {
    createServer(200, { url: helpers.ISSUE_URL });
    return githubClient.fileNewIssue(helpers.metadata(), 'handbook')
      .should.eventually.equal(helpers.ISSUE_URL);
  });

  it('should receive an error when filing an issue', function() {
    var payload = { message: 'test failure' };
    createServer(500, payload);
    return githubClient.fileNewIssue(helpers.metadata(), 'handbook')
      .should.be.rejectedWith(Error, 'received 500 response from GitHub ' +
        'API: ' + JSON.stringify(payload));
  });
});
