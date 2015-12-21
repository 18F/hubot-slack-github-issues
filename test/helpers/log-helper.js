/* jshint node: true */

module.exports = LogHelper;

var sinon = require('sinon');
var chai = require('chai');
chai.should();

function LogHelper() {
}

LogHelper.prototype.captureLog = function() {
  sinon.stub(console, 'log').returns(null);
};

LogHelper.prototype.restoreLog = function() {
  this.messages = console.log.args.map(function(callArgs) {
    return callArgs.join(' ');
  });
  console.log.restore();
};
