/* jshint node: true */
'use strict';

var GitHubApi = require('github');

module.exports = GitHubClient;

function GitHubClient(config, githubApi) {
  this.user = config.githubUser;
  this.api = githubApi || createGitHubApi(config);
}

function createGitHubApi(config) {
  var api = new GitHubApi({
    version: '3.0.0',
    protocol: 'https',
    timeout: config.githubTimeout
  });

  api.authenticate({
    type: 'oauth',
    token: config.githubToken
  });
  return api;
}

GitHubClient.prototype.fileNewIssue = function(metadata, repository, text) {
  var issueBody = 'From ' + metadata.url + ':\n\n' + text,
      params = {
        user: this.user,
        repo: repository,
        title: metadata.title,
        body: issueBody
      },
      that = this;

  return new Promise(function(resolve, reject) {
    that.api.issues.create(params, function(err, data) {
      if (err) {
        reject(err);
      } else {
        resolve(data.url);
      }
    });
  });
};
