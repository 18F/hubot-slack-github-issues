/* jshint node: true */

var http = require('http');
var url = require('url');

module.exports = {
  launch: function launch(expectedUrl, expectedParams, statusCode, payload) {
    var server = new http.Server(function(req, res) {
      var baseUrl = url.parse(req.url),
          expectedParamsStr = JSON.stringify(expectedParams),
          actualParamsStr = '';

      if (baseUrl.pathname !== expectedUrl) {
        res.statusCode = 500;
        res.end('expected URL: ' + expectedUrl + ', actual URL: ' +
          baseUrl.pathname);
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
