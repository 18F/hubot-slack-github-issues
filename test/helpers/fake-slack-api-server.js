/* jshint node: true */

var http = require('http');

module.exports = {
  launch: function launch(urlsToResponses) {
    var server = new http.Server(function(req, res) {
      var responseData = urlsToResponses[req.url],
          postBody = '';

      if (!responseData) {
        res.statusCode = 500;
        res.end('unexpected URL: ' + req.url);
        return;
      }

      req.on('data', function(chunk) {
        postBody = postBody + chunk.toString();
      });

      req.on('end', function() {
        var statusCode = responseData.statusCode,
            payload = responseData.payload,
            expectedBody = JSON.stringify(responseData.expectedBody),
            actualBody = JSON.stringify(JSON.parse(postBody));

        if (actualBody !== expectedBody) {
          res.statusCode = 500;
          payload = 'expected body ' + expectedBody +
            ', actual body ' + actualBody;
        }
        res.statusCode = statusCode;
        res.end(JSON.stringify(payload));
      });
    });
    server.listen(0);
    return server;
  }
};
