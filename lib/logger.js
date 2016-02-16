'use strict';

var scriptName = require('../package.json').name;

module.exports = Logger;

function Logger(logger) {
  this.logger = logger;
}

Logger.PREFIX = scriptName + ':';

Logger.prototype.info = function() {
  this.logger.info.apply(this.logger, addPrefix.apply(null, arguments));
};

Logger.prototype.error = function() {
  this.logger.error.apply(this.logger, addPrefix.apply(null, arguments));
};

function addPrefix() {
  var args = new Array(arguments.length),
      i;

  for (i = 0; i !== args.length; ++i) {
    args[i] = arguments[i];
  }

  if (args.length !== 0 && args[0]) {
    args[0] = args[0] + ':';
  } else {
    args.shift();
  }
  args.unshift(Logger.PREFIX);
  return args;
}
