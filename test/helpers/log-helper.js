/* jshint node: true */

var sinon = require('sinon');

var LOGGER_PREFIX = require('../../lib/logger').PREFIX;

module.exports = LogHelper;

function LogHelper() {
  var messages = [];
  this.messages = messages;
  this.recordMessages = function() {
    var i, args = new Array(arguments.length);
    for (i = 0; i !== args.length; ++i) {
      args[i] = arguments[i];
    }
    messages.push(args.join(' '));
  };
}

LogHelper.prototype.beginCapture = function() {
  sinon.stub(process.stdout, 'write', this.recordMessages);
  sinon.stub(process.stderr, 'write', this.recordMessages);
};

LogHelper.prototype.endCapture = function() {
  process.stderr.write.restore();
  process.stdout.write.restore();
};

LogHelper.prototype.capture = function(callback) {
  this.beginCapture();

  try {
    return callback();
  } finally {
    this.endCapture();
  }
};

LogHelper.prototype.endCaptureResolve = function() {
  var helper = this;

  return function(value) {
    helper.endCapture();
    return Promise.resolve(value);
  };
};

LogHelper.prototype.endCaptureReject = function() {
  var helper = this;

  return function(err) {
    helper.endCapture();
    return Promise.reject(err);
  };
};

LogHelper.prototype.filteredMessages = function() {
  var logFilter = /^\[.+\] ([A-Z]+) ([0-9a-z-]+:) (.*)/;

  return this.messages.map(function(message) {
    var match = message.match(logFilter);

    if (match && match[2] === LOGGER_PREFIX) {
      return match[1] + ' ' + match[3];
    }
    return message;
  });
};
