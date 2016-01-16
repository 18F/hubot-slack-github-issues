(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (process){
/* jshint node: true */
'use strict';

var fs = require('fs');
var log = require('./log');

module.exports = Config;

function Config(configuration) {
  var config = configuration ||
        parseConfigFromEnvironmentVariablePathOrUseDefault();

  for (var fieldName in config) {
    if (config.hasOwnProperty(fieldName)) {
      this[fieldName] = config[fieldName];
    }
  }
  this.validate();
}

var schema = {
  requiredTopLevelFields: {
    githubUser: 'GitHub username',
    githubTimeout: 'GitHub API timeout limit in milliseconds',
    slackTimeout: 'Slack API timeout limit in milliseconds',
    successReaction: 'emoji used to indicate an issue was successfully filed',
    rules: 'Slack-reaction-to-GitHub-issue rules'
  },
  requiredRulesFields: {
    reactionName: 'name of the reaction emoji triggering the rule',
    githubRepository: 'GitHub repository to which to post issues'
  },
  optionalRulesFields: {
    channelNames: 'names of the Slack channels triggering the rules; ' +
      'leave undefined to match messages in any Slack channel'
  }
};

Config.prototype.validate = function() {
  var errors = [],
      errMsg;

  this.checkRequiredTopLevelFields(errors);
  this.checkForUnknownFieldNames(errors);

  if (this.rules) {
    this.checkRequiredRulesFields(errors);
    this.checkForUnknownRuleFieldNames(errors);

    if (errors.length === 0) {
      this.checkForMisconfiguredRules(errors);
    }
  }

  if (errors.length !== 0) {
    errMsg = 'Invalid configuration:\n  ' + errors.join('\n  ');
    throw new Error(errMsg);
  }
};

function parseConfigFromEnvironmentVariablePathOrUseDefault() {
  var configPath = (process.env.HUBOT_SLACK_GITHUB_ISSUES_CONFIG_PATH ||
    'config/slack-github-issues.json');
  log('loading config from ' + configPath);
  return JSON.parse(fs.readFileSync(configPath, 'utf8'));
}

Config.prototype.checkRequiredTopLevelFields = function(errors) {
  var fieldName;

  for (fieldName in schema.requiredTopLevelFields) {
    if (schema.requiredTopLevelFields.hasOwnProperty(fieldName) &&
        !this.hasOwnProperty(fieldName)) {
      errors.push('missing ' + fieldName);
    }
  }
};

Config.prototype.checkForUnknownFieldNames = function(errors) {
  var fieldName;

  for (fieldName in this) {
    if (this.hasOwnProperty(fieldName) &&
      !schema.requiredTopLevelFields.hasOwnProperty(fieldName)) {
      errors.push('unknown property ' + fieldName);
    }
  }
};

Config.prototype.checkRequiredRulesFields = function(errors) {
  this.rules.forEach(function(rule, index) {
    var fieldName;

    for (fieldName in schema.requiredRulesFields) {
      if (schema.requiredRulesFields.hasOwnProperty(fieldName) &&
          !rule.hasOwnProperty(fieldName)) {
          errors.push('rule ' + index + ' missing ' + fieldName);
      }
    }
  });
};

Config.prototype.checkForUnknownRuleFieldNames = function(errors) {
  this.rules.forEach(function(rule, index) {
    var fieldName;

    for (fieldName in rule) {
      if (rule.hasOwnProperty(fieldName) &&
        !schema.requiredRulesFields.hasOwnProperty(fieldName) &&
        !schema.optionalRulesFields.hasOwnProperty(fieldName)) {
        errors.push('rule ' + index +
          ' contains unknown property ' + fieldName);
      }
    }
  });
};

Config.prototype.checkForMisconfiguredRules = function(errors) {
  checkRulesAreSorted(this.rules, errors);
  checkRulesByReaction(this.rules, errors);
};

function checkRulesAreSorted(rules, errors) {
  var sorted = sortIfUnsorted(rules, compareRules),
      NUM_SPACES = 2;

  if (sorted) {
    errors.push('rules are not sorted; expected: ' +
      JSON.stringify(sorted, null, NUM_SPACES).replace(/\n/g, '\n  '));
  }
}

function checkRulesByReaction(rules, errors) {
  var rulesByReaction = groupRulesBy(rules, 'reactionName');

  for (var reactionName in rulesByReaction) {
    if (rulesByReaction.hasOwnProperty(reactionName)) {
      checkRulesForReaction(rulesByReaction, reactionName, errors);
    }
  }
}

function checkRulesForReaction(rulesByReaction, reactionName, errors) {
  var rules = rulesByReaction[reactionName];
  checkChannelNamesAreSorted(rules, reactionName, errors);
  checkForDuplicateRepositories(rules, reactionName, errors);
  checkForDuplicateChannels(rules, reactionName, errors);
  checkForDuplicateAllChannelRules(rules, reactionName, errors);
}

function checkChannelNamesAreSorted(rules, reactionName, errors) {
  rules.forEach(function(rule, index) {
    var sorted = sortIfUnsorted(rule.channelNames);

    if (sorted) {
      errors.push('channelNames for ' + reactionName + ' rule ' + index +
        ' are not sorted; expected:');
      sorted.forEach(function(channelName) {
        errors.push('  ' + channelName);
      });
    }
  });
}

function checkForDuplicateRepositories(rules, reactionName, errors) {
  var duplicateRepos = rules.map(function(r) { return r.githubRepository; })
    .sort()
    .filter(detectDuplicates);

  if (duplicateRepos.length !== 0) {
    errors.push('duplicate repositories for ' + reactionName + ' rules:');
    duplicateRepos.forEach(function(repo) { errors.push('  ' + repo); });
  }
}

function checkForDuplicateChannels(rules, reactionName, errors) {
  var duplicateChannels,
      reduceChannels = function(channels, rule) {
        Array.prototype.push.apply(channels, rule.channelNames || []);
        return channels;
      };

  duplicateChannels = rules.reduce(reduceChannels, [])
    .sort()
    .filter(detectDuplicates);

  if (duplicateChannels.length !== 0) {
    errors.push('duplicate channels for ' + reactionName + ' rules:');
    duplicateChannels.forEach(function(channel) {
      errors.push('  ' + channel);
    });
  }
}

function checkForDuplicateAllChannelRules(rules, reactionName, errors) {
  var allChannelRules = rules.filter(function(rule) {
    return rule.channelNames === undefined;
  });

  if (allChannelRules.length > 1) {
    errors.push('multiple all-channel rules defined for ' + reactionName);
  }
}

function compareRules(lhs, rhs) {
  return lhs.reactionName.localeCompare(rhs.reactionName) ||
    compareChannelNames(lhs.channelNames, rhs.channelNames) ||
    lhs.githubRepository.localeCompare(rhs.githubRepository);
}

function compareChannelNames(lhs, rhs) {
  if (lhs !== undefined && rhs === undefined) {
    return -1;
  }
  if (lhs === undefined && rhs !== undefined) {
    return 1;
  }
  return 0;
}

function sortIfUnsorted(items, compareItems) {
  var sorted, isSorted;

  if (!items) {
    return;
  }

  sorted = items.slice().sort(compareItems);
  isSorted = function(item, i) {
    return item === sorted[i];
  };

  if (!items.every(isSorted)) {
    return sorted;
  }
}

function groupRulesBy(rules, property) {
  var result = {};

  rules.forEach(function(rule) {
    (result[rule[property]] = result[rule[property]] || []).push(rule);
  });
  return result;
}

function detectDuplicates(property, index, properties) {
  return index !== 0 && properties[index - 1] === property;
}

}).call(this,require('_process'))
},{"./log":2,"_process":5,"fs":4}],2:[function(require,module,exports){
/* jshint node: true */
'use strict';

var scriptName = require('../package.json').name;

module.exports = function(message) {
  console.log(scriptName + ': ' + message);
};

},{"../package.json":3}],3:[function(require,module,exports){
module.exports={
  "name": "hubot-slack-github-issues",
  "version": "0.1.2",
  "description": "Hubot script using the Slack Real Time Messaging API to file GitHub issues",
  "main": "index.js",
  "bin": {
    "hubot-slack-github-issues": "./bin/hubot-slack-github-issues"
  },
  "engines": {
    "node": "4.2.x 5.x"
  },
  "dependencies": {
    "slack-client": "^1.5.0"
  },
  "peerDependencies": {
    "hubot": "2.x",
    "hubot-slack": "3.x"
  },
  "devDependencies": {
    "chai": "^3.4.1",
    "chai-as-promised": "^5.1.0",
    "chai-things": "^0.2.0",
    "codeclimate-test-reporter": "^0.1.1",
    "coffee-script": "^1.10.0",
    "coveralls": "^2.11.6",
    "gulp": "^3.9.0",
    "gulp-istanbul": "^0.10.3",
    "gulp-jshint": "^2.0.0",
    "gulp-mocha": "^2.2.0",
    "hubot": "^2.17.0",
    "hubot-slack": "^3.4.2",
    "hubot-test-helper": "^1.3.0",
    "istanbul": "^0.4.1",
    "jshint": "^2.8.0",
    "mocha": "^2.3.4",
    "sinon": "^1.17.2",
    "yargs": "^3.31.0"
  },
  "scripts": {
    "test": "gulp test",
    "lint": "gulp lint",
    "report-cov-cc": "codeclimate-test-reporter < coverage/lcov.info",
    "report-coveralls": "coveralls < coverage/lcov.info"
  },
  "repository": {
    "type": "git",
    "url": "git+https://github.com/18F/hubot-slack-github-issues.git"
  },
  "keywords": [
    "hubot",
    "slack",
    "github"
  ],
  "author": "Mike Bland <michael.bland@gsa.gov> (https://18f.gsa.gov/)",
  "license": "CC0-1.0",
  "bugs": {
    "url": "https://github.com/18F/hubot-slack-github-issues/issues"
  },
  "homepage": "https://github.com/18F/hubot-slack-github-issues#readme"
}

},{}],4:[function(require,module,exports){

},{}],5:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = setTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            currentQueue[queueIndex].run();
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    clearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        setTimeout(drainQueue, 0);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],6:[function(require,module,exports){
/* jshint node: true */

'use strict';

var Config = require('../lib/config');

var NBSP_REGEX = /  /g;

window.validateConfig = function() {
  var configInput = document.getElementById('config-input'),
      resultText = document.getElementById('result-text'),
      config,
      resultMsg = '';

  try {
    if (configInput.value.length !== 0) {
      config = new Config(JSON.parse(configInput.value));
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
  resultText.innerHTML = '<p>' + resultMsg + '</p>'
}

},{"../lib/config":1}]},{},[6]);
