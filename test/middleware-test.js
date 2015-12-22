/* jshint node: true */
/* jshint mocha: true */
/* jshint expr: true */

'use strict';

var Middleware = require('../lib/middleware');
var GitHubClient = require('../lib/github-client');
var SlackClient = require('../lib/slack-client');
var scriptName = require('../package.json').name;
var helpers = require('./helpers');
var config = require('./helpers/test-config.json');
var FakeSlackClientImpl = require('./helpers/fake-slack-client-impl');
var LogHelper = require('./helpers/log-helper');
var sinon = require('sinon');
var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');

var expect = chai.expect;
chai.should();
chai.use(chaiAsPromised);

describe('Middleware', function() {
  var rules, slackClientImpl, githubClient, middleware;

  beforeEach(function() {
    rules = helpers.baseConfig().rules;
    slackClientImpl = new FakeSlackClientImpl('handbook');
    githubClient = new GitHubClient(helpers.baseConfig(), {});
    middleware = new Middleware(
      rules, new SlackClient(slackClientImpl, config), githubClient);
  });

  describe('parseMetadata', function() {
    it('should parse GitHub request metadata from a message', function() {
      middleware.parseMetadata(helpers.reactionAddedMessage().rawMessage)
        .should.eql(helpers.metadata());
      slackClientImpl.channelId.should.equal(helpers.CHANNEL_ID);
      slackClientImpl.userId.should.equal(helpers.USER_ID);
    });
  });

  describe('findMatchingRule', function() {
    it('should find the rule matching the message', function() {
      var message = helpers.reactionAddedMessage().rawMessage,
          expected = rules[rules.length - 1],
          result = middleware.findMatchingRule(message);

      result.reactionName.should.equal(expected.reactionName);
      result.githubRepository.should.equal(expected.githubRepository);
      result.should.not.have.property('channelName');
    });

    it('should ignore a message if it is undefined', function() {
      // When execute() tries to pass context.response.message.rawMessage from
      // a message that doesn't have one, the argument to findMatchingRule()
      // will be undefined.
      expect(middleware.findMatchingRule(undefined)).to.be.undefined;
    });

    it('should ignore a message if its type does not match', function() {
      var message = helpers.reactionAddedMessage();
      message.type = 'hello';
      expect(middleware.findMatchingRule(message)).to.be.undefined;
    });

    it('should ignore messages that do not match', function() {
      var message = helpers.reactionAddedMessage().rawMessage;
      message.name = 'sad-face';
      expect(middleware.findMatchingRule(message)).to.be.undefined;
    });
  });

  describe('execute', function() {
    var message, context, fileNewIssue, reply, next, hubotDone,
        metadata, expectedFileNewIssueArgs, result, logHelper;

    beforeEach(function() {
      message = helpers.reactionAddedMessage();
      context = {
        response: {
          message: message,
          reply: sinon.spy()
        }
      };

      fileNewIssue = sinon.stub(githubClient, 'fileNewIssue');
      reply = context.response.reply;
      next = sinon.spy();
      hubotDone = sinon.spy();

      metadata = helpers.metadata();
      expectedFileNewIssueArgs = [metadata, 'handbook'];
      logHelper = new LogHelper();
    });

    it('should ignore messages that do not match', function() {
      message.rawMessage.name = 'sad-face';
      logHelper.captureLog();
      result = middleware.execute(context, next, hubotDone);
      logHelper.restoreLog();
      expect(result).to.be.undefined;
      next.calledOnce.should.be.true;
      next.calledWith(hubotDone).should.be.true;
      hubotDone.called.should.be.false;
      reply.called.should.be.false;
      fileNewIssue.called.should.be.false;
      logHelper.messages.should.be.empty;
    });

    it('should successfully parse a message and file an issue', function(done) {
      fileNewIssue.returns(Promise.resolve(metadata.url));
      logHelper.captureLog();
      result = middleware.execute(context, next, hubotDone);

      if (!result) {
        logHelper.restoreLog();
        return done(new Error('middleware.execute did not return a Promise'));
      }

      result.should.be.fulfilled.then(function() {
        logHelper.restoreLog();
        fileNewIssue.calledOnce.should.be.true;
        fileNewIssue.firstCall.args.should.eql(expectedFileNewIssueArgs);
        reply.calledOnce.should.be.true;
        reply.firstCall.args.should.eql(['created: ' + metadata.url]);
        next.calledOnce.should.be.true;
        next.calledWith(hubotDone).should.be.true;
        hubotDone.called.should.be.false;
        logHelper.messages.should.eql([
          [scriptName + ': making GitHub request for ' +
           'https://18f.slack.com/archives/handbook/p1360782804083113'],
          [scriptName + ': GitHub success: ' +
           'https://18f.slack.com/archives/handbook/p1360782804083113']
        ]);
      }).should.notify(done);
    });

    it('should parse a message but fail to file an issue', function(done) {
      fileNewIssue.returns(Promise.reject(new Error('test failure')));
      logHelper.captureLog();
      result = middleware.execute(context, next, hubotDone);

      if (!result) {
        logHelper.restoreLog();
        return done(new Error('middleware.execute did not return a Promise'));
      }

      result.should.be.fulfilled.then(function() {
        logHelper.restoreLog();
        fileNewIssue.calledOnce.should.be.true;
        fileNewIssue.firstCall.args.should.eql(expectedFileNewIssueArgs);
        reply.calledOnce.should.be.true;
        reply.firstCall.args.should.eql(
          ['failed to create a GitHub issue in 18F/handbook: test failure']);
        next.calledOnce.should.be.true;
        next.calledWith(hubotDone).should.be.true;
        hubotDone.called.should.be.false;
        logHelper.messages.should.eql([
          [scriptName + ': making GitHub request for ' +
            'https://18f.slack.com/archives/handbook/p1360782804083113'],
          [scriptName + ': GitHub error: test failure']
        ]);
      }).should.notify(done);
    });
  });
});
