'use strict';

var path = require('path');
var Logger = require('./lib/logger');

module.exports = function(robot) {
  var logger = new Logger(robot.logger);

  logger.info(null, 'loading');
  robot.loadFile(path.resolve(__dirname, 'scripts'), 'slack-github-issues.js');
};
