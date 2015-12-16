/* jshint node: true */
/* jshint mocha: true */

'use strict';

var GitHubClient = require('../lib/github-client');
var helpers = require('./helpers');
var FakeGitHubApi = require('./helpers/fake-github-api');
var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');

var expect = chai.expect;
chai.should();
chai.use(chaiAsPromised);

describe('GitHubClient', function() {
  var config = helpers.baseConfig();

  before(function() {
    process.env.HUBOT_GITHUB_TOKEN = '<18F-github-token>';
  });

  after(function() {
    delete process.env.HUBOT_GITHUB_TOKEN;
  });

  it('should create a githubApiClient from the configuration', function() {
    var client = new GitHubClient(config);

    expect(client).to.have.property('user', config.githubUser);
    expect(client.api).to.have.deep.property(
      'config.timeout', config.githubTimeout);
    expect(client.api).to.have.deep.property('auth.type', 'oauth');
    expect(client.api).to.have.deep.property(
      'auth.token', process.env.HUBOT_GITHUB_TOKEN);
  });

  it('should successfully file an issue', function() {
    var issueUrl = 'https://github.com/18F/handbook/issues/1',
        api = new FakeGitHubApi(issueUrl, null, helpers.githubParams()),
        client = new GitHubClient(config, api);
    return client.fileNewIssue(
      helpers.metadata(), 'handbook', helpers.reactionAddedMessage().text)
      .should.eventually.equal(issueUrl);
  });

  it('should receive an error when filing an issue', function() {
    var errorMsg = 'failed to file an issue',
        api = new FakeGitHubApi(null, errorMsg, helpers.githubParams()),
        client = new GitHubClient(config, api);
    return client.fileNewIssue(
      helpers.metadata(), 'handbook', helpers.reactionAddedMessage().text)
      .should.be.rejectedWith(Error, errorMsg);
  });
});
