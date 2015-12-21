/* jshint node: true */

var http = require('http');
var querystring = require('querystring');
var url = require('url');

module.exports = {
  launch: function launch(urlsToResponses) {
    var server = new http.Server(function(req, res) {
      var baseUrl = url.parse(req.url),
          responseData = urlsToResponses[baseUrl.pathname],
          payload,
          expectedParams,
          actualParams;

      if (!responseData) {
        res.statusCode = 500;
        res.end('unexpected URL: ' + req.url);
        return;
      }

      res.statusCode = responseData.statusCode;
      payload = responseData.payload;
      expectedParams = JSON.stringify(responseData.expectedParams);
      actualParams = JSON.stringify(querystring.parse(baseUrl.query));

      if (actualParams !== expectedParams) {
        res.statusCode = 500;
        payload = 'expected params ' + expectedParams +
          ', actual params ' + actualParams;
      }
      res.end(JSON.stringify(payload));
    });
    server.listen(0);
    return server;
  }
};
