/* jshint node: true */

var http = require('http');

module.exports = {
  launch: function launch(expectedUrl, expectedParams, statusCode, payload) {
    var server = new http.Server(function(req, res) {
      var postBody = '', expectedBody, actualBody;

      if (req.url !== expectedUrl) {
        res.statusCode = 500;
        res.end('expected URL ' + expectedUrl + ', actual URL ' + req.url);
        return;
      }

      req.on('data', function(chunk) {
        postBody = postBody + chunk.toString();
      });

      req.on('end', function() {
        expectedBody = JSON.stringify(expectedParams);
        actualBody = JSON.stringify(JSON.parse(postBody));

        if (actualBody !== expectedBody) {
          statusCode = 500;
          payload = 'expected body ' + expectedBody +
            ', actual body ' + actualBody;
        }
        res.statusCode = statusCode;
        res.end(payload);
      });
    });
    server.listen(0);
    return server;
  }
};
