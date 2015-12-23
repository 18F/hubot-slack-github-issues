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
    token: process.env.HUBOT_GITHUB_TOKEN
  });
  return api;
}

GitHubClient.prototype.fileNewIssue = function(metadata, repository) {
  var params = {
        user: this.user,
        repo: repository,
        title: metadata.title,
        body: metadata.url
      },
      that = this;

  return new Promise(function(resolve, reject) {
    that.api.issues.create(params, function(err, data) {
      if (err) {
        reject(err);
      } else {
        resolve(data.html_url);  // jshint ignore:line
      }
    });
  });
};
