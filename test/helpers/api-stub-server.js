'use strict';

var http = require('http');
var querystring = require('querystring');
var url = require('url');

module.exports = ApiStubServer;

function ApiStubServer() {
  var stubServer = this;

  this.urlsToResponses = {};

  this.server = new http.Server(function(req, res) {
    var baseUrl = url.parse(req.url),
        responseData = stubServer.urlsToResponses[baseUrl.pathname];

    if (!responseData) {
      res.statusCode = 500;
      res.end('unexpected URL: ' + req.url);

    } else if (req.method === 'GET') {
      compareParamsAndRespond(res, responseData,
        querystring.parse(baseUrl.query));

    } else if (req.method === 'POST') {
      comparePostParamsAndRespond(req, res, responseData);

    } else {
      res.statusCode = 500;
      res.end('unexpected HTTP method "' + req.method +
        '" for URL: ' + req.url);
    }
  });
  this.server.listen(0);
}

function comparePostParamsAndRespond(req, res, responseData) {
  var data = '';

  req.setEncoding('utf8');
  req.on('data', function(chunk) {
    data = data + chunk;
  });
  req.on('end', function() {
    try {
      compareParamsAndRespond(res, responseData, JSON.parse(data));

    } catch (err) {
      res.statusCode = 500;
      res.end('could not parse JSON request for ' + req.url +
        ': ' + err + ': ' + data);
    }
  });
}

function compareParamsAndRespond(res, responseData, actualParams) {
  var payload = responseData.payload,
      expectedParams = JSON.stringify(responseData.expectedParams);

  res.statusCode = responseData.statusCode;
  actualParams = JSON.stringify(actualParams);

  if (actualParams !== expectedParams) {
    res.statusCode = 500;
    payload = 'expected params ' + expectedParams +
      ', actual params ' + actualParams;
  }
  res.end(JSON.stringify(payload));
}

ApiStubServer.prototype.address = function() {
  return 'http://localhost:' + this.server.address().port;
};

ApiStubServer.prototype.close = function() {
  this.server.close();
};
