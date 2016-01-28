/* jshint node: true */

'use strict';

var fs = require('fs');
var path = require('path');

module.exports = Config;

function Config(configuration, logger) {
  var config = configuration ||
        parseConfigFromEnvironmentVariablePathOrUseDefault(logger);

  validate(config);

  for (var fieldName in config) {
    if (config.hasOwnProperty(fieldName)) {
      this[fieldName] = config[fieldName];
    }
  }
}

var schema = {
  requiredTopLevelFields: {
    githubUser: 'GitHub username',
    githubTimeout: 'GitHub API timeout limit in milliseconds',
    slackTimeout: 'Slack API timeout limit in milliseconds',
    successReaction: 'emoji used to indicate an issue was successfully filed',
    rules: 'Slack-reaction-to-GitHub-issue rules'
  },
  optionalTopLevelFields: {
    githubApiBaseUrl: 'Alternate base URL for GitHub API requests',
    slackApiBaseUrl: 'Alternate base URL for Slack API requests'
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

function validate(config) {
  var errors = [],
      errMsg;

  checkRequiredTopLevelFields(config, errors);
  checkForUnknownFieldNames(config, errors);

  if (config.rules) {
    checkRequiredRulesFields(config, errors);
    checkForUnknownRuleFieldNames(config, errors);

    if (errors.length === 0) {
      checkForMisconfiguredRules(config.rules, errors);
    }
  }

  if (errors.length !== 0) {
    errMsg = 'Invalid configuration:\n  ' + errors.join('\n  ');
    throw new Error(errMsg);
  }
}

function parseConfigFromEnvironmentVariablePathOrUseDefault(logger) {
  var configPath = (process.env.HUBOT_SLACK_GITHUB_ISSUES_CONFIG_PATH ||
        path.join('config', 'slack-github-issues.json')),
      errorPrefix = 'failed to load configuration from ' + configPath + ': ';
  logger.info(null, 'reading configuration from', configPath);

  try {
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (err) {
    if (err instanceof SyntaxError) {
      errorPrefix = errorPrefix + 'invalid JSON: ';
    }
    err.message = errorPrefix + err.message;
    throw err;
  }
}

function checkRequiredTopLevelFields(config, errors) {
  filterMissingFields(config, schema.requiredTopLevelFields)
    .forEach(function(fieldName) {
      errors.push('missing ' + fieldName);
    });
}

function filterMissingFields(object, requiredFields) {
  return Object.keys(requiredFields).filter(function(fieldName) {
    return !object.hasOwnProperty(fieldName);
  });
}

function checkForUnknownFieldNames(config, errors) {
  filterUnknownFields(config, schema.requiredTopLevelFields,
    schema.optionalTopLevelFields)
    .forEach(function(fieldName) {
      errors.push('unknown property ' + fieldName);
    });
}

function filterUnknownFields(object, requiredFields, optionalFields) {
  return Object.keys(object).filter(function(fieldName) {
    return !requiredFields.hasOwnProperty(fieldName) &&
      !optionalFields.hasOwnProperty(fieldName);
  });
}

function checkRequiredRulesFields(config, errors) {
  config.rules.forEach(function(rule, index) {
    filterMissingFields(rule, schema.requiredRulesFields)
      .forEach(function(fieldName) {
        errors.push('rule ' + index + ' missing ' + fieldName);
      });
  });
}

function checkForUnknownRuleFieldNames(config, errors) {
  config.rules.forEach(function(rule, index) {
    filterUnknownFields(rule, schema.requiredRulesFields,
      schema.optionalRulesFields)
      .forEach(function(fieldName) {
        errors.push('rule ' + index +
          ' contains unknown property ' + fieldName);
      });
  });
}

function checkForMisconfiguredRules(rules, errors) {
  checkRulesAreSorted(rules, errors);
  checkRulesByReaction(rules, errors);
}

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
