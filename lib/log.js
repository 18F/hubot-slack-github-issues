/* jshint node: true */
'use strict';

var scriptName = require('../package.json').name;

module.exports = function(message) {
  console.log(scriptName + ': ' + message);
};
