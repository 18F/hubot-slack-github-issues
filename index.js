/* jshint node: true */
'use strict';

var path = require('path');

module.exports = function(robot) {
  robot.loadFile(path.resolve(__dirname, 'scripts'), 'slack-github-issues');
};
