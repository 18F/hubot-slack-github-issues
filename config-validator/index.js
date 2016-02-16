/* eslint-env browser */

'use strict';

var Config = require('../lib/config');

var NBSP_REGEX = / {2}/g;

window.validateConfig = function() {
  var configInput = document.getElementById('config-input'),
      resultText = document.getElementById('result-text'),
      resultMsg = '';

  try {
    if (configInput.value.length !== 0) {
      new Config(JSON.parse(configInput.value));
      resultMsg = 'The configuration is valid.';
    } else {
      resultMsg = 'Please enter a JSON configuration object.';
    }
  } catch (err) {
    if (err instanceof SyntaxError) {
      resultMsg = 'The JSON failed to parse: ' + err.message;
    } else {
      err.message.split('\n').forEach(function(item) {
        resultMsg = resultMsg + item.replace(NBSP_REGEX, '&nbsp;&nbsp;') +
          '<br/>';
      });
    }
  }
  resultText.innerHTML = '<p>' + resultMsg + '</p>';
};
