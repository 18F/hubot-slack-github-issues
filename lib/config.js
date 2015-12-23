/* jshint node: true */
'use strict';

var fs = require('fs');
var log = require('./log');

module.exports = Config;

function Config(configuration) {
  var config = configuration || parseConfigFromEnvironmentVariablePath();

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
  this.checkRequiredRulesFields(errors);
  this.checkForUnknownRuleFieldNames(errors);

  if (errors.length === 0) {
    this.checkForMisconfiguredRules(errors);
  }

  if (errors.length !== 0) {
    errMsg = 'Invalid configuration:\n  ' + errors.join('\n  ');
    log(errMsg);
    throw new Error(errMsg);
  }
};

function parseConfigFromEnvironmentVariablePath() {
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
  if (!this.rules) {
    return;
  }

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
  if (!this.rules) {
    return;
  }

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
  var sorted, isEqualToSorted, NUM_SPACES = 2;

  if (!this.rules) {
    return;
  }

  sorted = this.rules.slice().sort(compareRules);
  isEqualToSorted = function(value, index) {
    return value === sorted[index];
  };

  if (!this.rules.every(isEqualToSorted)) {
    errors.push('rules are not sorted; expected: ' +
      JSON.stringify(sorted, null, NUM_SPACES).replace(/\n/g, '\n  '));
  }
};

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
