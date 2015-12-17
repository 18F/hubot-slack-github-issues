/* jshint node: true */
'use strict';

var path = require('path');
var log = require('./lib/log');

module.exports = function(robot) {
  log('loading');
  robot.loadFile(path.resolve(__dirname, 'scripts'), 'slack-github-issues.js');
};
