/* jshint node: true */
'use strict';

var GitHubApiClient = require('github-client');

module.exports = GitHubClient;

function GitHubClient(config, githubApiClient) {
  this.user = config.githubUser;
  this.api = githubApiClient || createGitHubApiClient(config);
}

function createGitHubApiClient(config) {
  var api = new GitHubApiClient({
    version: '3.0.0',
    protocol: 'https',
    host: 'api.github.com',
    timeout: config.githubTimeout
  });

  api.authenticate({
    type: 'oauth',
    token: config.githubToken
  });

  return api;
}

GitHubClient.prototype.fileNewIssue = function(metadata, repository, message) {
  var issueBody = 'From ' + metadata.url + ':\n\n' + message.text;
  var params = {
    user: this.user,
    repo: repository,
    title: metadata.title,
    body: issueBody
  };
  var that = this;

  return new Promise(function(resolve, reject) {
    // http://mikedeboer.github.io/node-github/#issues.prototype.create
    that.api.issues.create(params, function(err, data) {
      if (err) {
        reject(err);
      } else {
        resolve(data.url);
      }
    });
  });
};
