/* jshint node: true */
'use strict';

var fs = require('fs');

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
    rules: 'Slack-reaction-to-GitHub-issue rules'
  },
  requiredRulesFields: {
    reactionName: 'name of the reaction emoji triggering the rule',
    githubRepository: 'GitHub repository to which to post issues'
  },
  optionalRulesFields: {
    channelName: 'name of the Slack channel triggering the rule'
  }
};

Config.prototype.validate = function() {
  var errors = [];

  this.checkRequiredTopLevelFields(errors);
  this.checkForUnknownFieldNames(errors);
  this.checkRequiredRulesFields(errors);
  this.checkForUnknownRuleFieldNames(errors);

  if (errors.length !== 0) {
    throw new Error('Invalid configuration:\n  ' + errors.join('\n  '));
  }
};

function parseConfigFromEnvironmentVariablePath() {
  var configPath = process.env.HUBOT_SLACK_GITHUB_ISSUES_CONFIG_PATH;
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
