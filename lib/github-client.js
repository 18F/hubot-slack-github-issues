/* jshint node: true */
'use strict';

var http = require('http');
var https = require('https');
var packageInfo = require('../package.json');

module.exports = GitHubClient;

function GitHubClient(config) {
  this.user = config.githubUser;
  this.timeout = config.githubTimeout;
  this.protocol = 'https:';
  this.host = 'api.github.com';
}

GitHubClient.prototype.httpOptions = function(repository, paramsStr) {
  return {
    protocol: this.protocol,
    host: this.host,
    port: this.port,
    path: '/repos/' + this.user + '/' + repository + '/issues',
    method: 'POST',
    headers: {
      'Accept': 'application/vnd.github.v3+json',
      'Authorization': 'token ' + process.env.HUBOT_GITHUB_TOKEN,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(paramsStr, 'utf8'),
      'User-Agent': packageInfo.name + '/' + packageInfo.version
    }
  };
};

GitHubClient.prototype.fileNewIssue = function(metadata, repository) {
  var requestFactory = (this.protocol === 'https:') ? https : http,
      paramsStr = JSON.stringify({
        title: metadata.title,
        body: metadata.url
      }),
      httpOptions = this.httpOptions(repository, paramsStr),
      that = this;

  return new Promise(function(resolve, reject) {
    var req = requestFactory.request(httpOptions, function(res) {
      handleResponse(res, resolve, reject);
    });

    req.setTimeout(that.timeout);
    req.on('error', function(err) {
      reject(new Error('GitHub create issue API call failed: ' + err.message));
    });
    req.end(paramsStr);
  });
};

function handleResponse(res, resolve, reject) {
  var result = '';

  res.setEncoding('utf8');
  res.on('data', function(chunk) {
    result = result + chunk;
  });
  res.on('end', function() {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      resolve(JSON.parse(result).html_url);  // jshint ignore:line
    } else {
      reject(new Error('received ' + res.statusCode +
        ' response from GitHub API: ' + result));
    }
  });
}
