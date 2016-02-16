'use strict';

var exec = require('child_process').exec;
var fs = require('fs');
var path = require('path');
var sinon = require('sinon');
var chai = require('chai');
var expect = chai.expect;

var rootDir = path.dirname(__dirname);
var scriptName = require(path.join(rootDir, 'package.json')).name;
var SUCCESS_MESSAGE = scriptName + ': registered receiveMiddleware';
var FAILURE_MESSAGE = scriptName + ': receiveMiddleware registration failed: ';

describe('Smoke test', function() {
  var checkHubot;

  beforeEach(function() {
    delete process.env.HUBOT_SLACK_GITHUB_ISSUES_CONFIG_PATH;
  });

  after(function() {
    delete process.env.HUBOT_SLACK_GITHUB_ISSUES_CONFIG_PATH;
  });

  checkHubot = function(done, validateOutput) {
    exec('hubot -t', { cwd: rootDir }, function(error, stdout, stderr) {
      try {
        expect(error).to.be.null;
        stderr.should.eql('');
        validateOutput(stdout);
        stdout.should.have.string('\nOK\n', '"OK" missing from end of output');
        done();

      } catch (err) {
        done(err);
      }
    });
  };

  it('should successfully load the index.js entry point', function(done) {
    var entryPoint = require('../index'),
        robot = { logger: {} },
        scriptPath;

    robot.logger.info = sinon.spy();
    robot.loadFile = sinon.spy();
    entryPoint(robot);
    robot.logger.info.args.should.have.deep.property('[0]')
      .that.deep.equals([scriptName + ':', 'loading']);
    robot.loadFile.calledOnce.should.be.true;

    scriptPath = path.join.apply(null, robot.loadFile.args[0]);
    fs.exists(scriptPath, function(exists) {
      done(exists ? null : new Error(scriptPath + ' does not exist'));
    });
  });

  it('should register successfully using the default config', function(done) {
    checkHubot(done, function(output) {
      output.should.have.string(SUCCESS_MESSAGE, 'script not registered');
    });
  });

  it('should register successfully using the config from ' +
     'HUBOT_SLACK_GITHUB_ISSUES_CONFIG_PATH', function(done) {
    process.env.HUBOT_SLACK_GITHUB_ISSUES_CONFIG_PATH = path.join(
      __dirname, 'helpers', 'test-config.json');
    checkHubot(done, function(output) {
      output.should.have.string(SUCCESS_MESSAGE, 'script not registered');
    });
  });

  it('should fail to register due to an invalid config', function(done) {
    process.env.HUBOT_SLACK_GITHUB_ISSUES_CONFIG_PATH = path.join(
      __dirname, 'helpers', 'test-config-invalid.json');
    checkHubot(done, function(output) {
      output.should.have.string(FAILURE_MESSAGE + 'Invalid configuration:',
        'script didn\'t emit expected error');
    });
  });
});
