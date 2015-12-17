/* jshint node: true */

module.exports = LogHelper;

var sinon = require('sinon');

function LogHelper() {
}

LogHelper.prototype.captureLog = function() {
  sinon.stub(console, 'log').returns(null);
};

LogHelper.prototype.restoreLog = function() {
  this.messages = console.log.args;
  console.log.restore();
};
