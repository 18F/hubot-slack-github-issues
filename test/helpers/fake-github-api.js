/* jshint node: true */

'use strict';

module.exports = FakeGitHubApi;

function FakeGitHubApi(urlOnSuccess, msgOnError, expectedParams) {
  this.issues = {
    create: function(params, done) {
      var actualString = JSON.stringify(params),
          expectedString = JSON.stringify(expectedParams);

      if (actualString !== expectedString) {
        done(new Error([
            'params did not match expectations:',
            'expected: ' + expectedString,
            'actual:   ' + actualString
          ].join('\n  ')));
      } else if (urlOnSuccess) {
        done(null, { url: urlOnSuccess });
      } else {
        done(new Error(msgOnError));
      }
    }
  };
}
