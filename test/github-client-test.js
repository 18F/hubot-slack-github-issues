/* jshint node: true */
/* jshint mocha: true */

'use strict';

var GitHubClient = require('../lib/github-client');
var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');

var expect = chai.expect;
chai.should();
chai.use(chaiAsPromised);

function FakeGitHubApi(urlOnSuccess, msgOnError) {
  var that = this;

  this.issues = {
    create: function(params, done) {
      that.params = params;

      if (urlOnSuccess) {
        done(null, { url: urlOnSuccess });
      } else {
        done(new Error(msgOnError));
      }
    }
  };
}

describe('GitHubClient', function() {
  var config = {
    githubUser: '18F',
    githubToken: '<18F-api-token>',
    githubTimeout: 5000
  };

  var metadata = {
    url: 'https://18F.slack.com/archives/hub/p1360782804083113',
    title: 'Update from @mikebland in #hub at 1360782804.083113'
  };

  var message = { text: 'Hello, world!' };

  it('should create a githubApiClient from the configuration', function() {
    var client = new GitHubClient(config);
    expect(client).to.have.property('user', config.githubUser);
    expect(client.api).to.have.deep.property(
      'config.timeout', config.githubTimeout);
    expect(client.api).to.have.deep.property('auth.type', 'oauth');
    expect(client.api).to.have.deep.property(
      'auth.token', config.githubToken);
  });

  it('should successfully file an issue', function() {
    var issueUrl = 'https://github.com/18F/handbook/issues/1',
        api = new FakeGitHubApi(issueUrl),
        client = new GitHubClient(config, api);
    return client.fileNewIssue(metadata, 'handbook', message)
      .should.eventually.equal(issueUrl);
  });

  it('should receive an error when filing an issue', function() {
    var errorMsg = 'failed to file an issue',
        api = new FakeGitHubApi(null, errorMsg),
        client = new GitHubClient(config, api);
    return client.fileNewIssue(metadata, 'handbook', message)
      .should.be.rejectedWith(Error, errorMsg);
  });
});
