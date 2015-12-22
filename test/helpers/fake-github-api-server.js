/* jshint node: true */

var GitHubClient = require('../../lib/github-client');
var testConfig = require('./test-config.json');
var http = require('http');
var url = require('url');

var githubClient = new GitHubClient(testConfig);

module.exports = {
  launch: function(
    expectedUrl, repository, expectedParams, statusCode, payload) {
    var server = new http.Server(function(req, res) {
      var baseUrl = url.parse(req.url),
          mismatchedHeaders,
          expectedParamsStr = JSON.stringify(expectedParams),
          actualParamsStr = '';

      if (baseUrl.pathname !== expectedUrl) {
        res.statusCode = 500;
        res.end('expected URL: ' + expectedUrl + ', actual URL: ' +
          baseUrl.pathname);
        return;
      }

      mismatchedHeaders = getMismatchedHeaders(
        repository, expectedParamsStr, req.headers);

      if (mismatchedHeaders) {
        res.statusCode = 500;
        res.end('mismatched headers: ' + JSON.stringify(mismatchedHeaders));
        return;
      }

      req.on('data', function(chunk) {
        actualParamsStr = actualParamsStr + chunk;
      });

      req.on('end', function() {
        res.statusCode = statusCode;

        if (actualParamsStr !== expectedParamsStr) {
          res.statusCode = 500;
          payload = 'expected params ' + expectedParamsStr +
            ', actual params ' + actualParamsStr;
        }
        res.end(JSON.stringify(payload));
      });
    });
    server.listen(0);
    return server;
  }
};

function getMismatchedHeaders(repository, expectedParamsStr, actualHeaders) {
  var expectedHeaders = githubClient.httpOptions(
        repository, expectedParamsStr).headers,
      mismatched, headerName, expected, actual;

  for (headerName in expectedHeaders) {
    if (expectedHeaders.hasOwnProperty(headerName)) {
      expected = expectedHeaders[headerName].toString();
      actual = actualHeaders[headerName.toLowerCase()];

      if (actual === expected) {
        continue;
      } else if (mismatched === undefined) {
        mismatched = {};
      }
      mismatched[headerName] = {
        expected: expected,
        actual: actual
      };
    }
  }
  return mismatched;
}
