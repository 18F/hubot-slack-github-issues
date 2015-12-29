/* jshint node: true */
/* jshint mocha: true */
/* jshint expr: true */

'use strict';

var Middleware = require('../lib/middleware');
var scriptName = require('../package.json').name;
var GitHubClient = require('../lib/github-client');
var SlackClient = require('../lib/slack-client');
var helpers = require('./helpers');
var FakeSlackClientImpl = require('./helpers/fake-slack-client-impl');
var LogHelper = require('./helpers/log-helper');
var sinon = require('sinon');
var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');
var chaiThings = require('chai-things');

var expect = chai.expect;
chai.should();
chai.use(chaiAsPromised);
chai.use(chaiThings);

describe('Middleware', function() {
  var config, slackClientImpl, githubClient, middleware;

  beforeEach(function() {
    config = helpers.baseConfig();
    slackClientImpl = new FakeSlackClientImpl('handbook');
    githubClient = new GitHubClient(helpers.baseConfig(), {});
    middleware = new Middleware(
      config, new SlackClient(slackClientImpl, config), githubClient);
  });

  describe('parseMetadata', function() {
    it('should parse GitHub request metadata from a message', function() {
      middleware.parseMetadata(helpers.reactionAddedMessage().rawMessage)
        .should.eql(helpers.metadata());
      slackClientImpl.channelId.should.equal(helpers.CHANNEL_ID);
    });
  });

  describe('findMatchingRule', function() {
    it('should find the rule matching the message', function() {
      var message = helpers.reactionAddedMessage().rawMessage,
          expected = config.rules[1],
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
        metadata, expectedFileNewIssueArgs, result, logHelper, doExecute;

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

    doExecute = function(done) {
      var result;

      try {
        logHelper.captureLog();
        result = middleware.execute(context, next, hubotDone);

        if (!result) {
          logHelper.restoreLog();
          return done(new Error('middleware.execute did not return a Promise'));
        }
        return result;

      } catch(err) {
        logHelper.restoreLog();
        throw err;
      }
    };

    it('should ignore messages that are not reaction_added', function() {
      message.rawMessage = { type: 'hello' };
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
      fileNewIssue.returns(Promise.resolve(helpers.ISSUE_URL));
      result = doExecute(done);

      if (!result) {
        return;
      }

      result.should.become(helpers.ISSUE_URL).then(function() {
        logHelper.restoreLog();
        fileNewIssue.calledOnce.should.be.true;
        fileNewIssue.firstCall.args.should.eql(expectedFileNewIssueArgs);
        reply.calledOnce.should.be.true;
        reply.firstCall.args.should.eql(['created: ' + helpers.ISSUE_URL]);
        next.calledOnce.should.be.true;
        next.calledWith(hubotDone).should.be.true;
        hubotDone.called.should.be.false;
        logHelper.messages.should.eql([
          helpers.matchingRuleLogMessage(),
          helpers.githubLogMessage(),
          helpers.successLogMessage(),
        ]);
      }).should.notify(done);
    });

    it('should parse a message but fail to file an issue', function(done) {
      var errorMessage = helpers.failureMessage('test failure');

      fileNewIssue.returns(Promise.reject(new Error('test failure')));
      result = doExecute(done);

      if (!result) {
        return;
      }

      result.should.be.rejectedWith(Error, errorMessage).then(function() {
        logHelper.restoreLog();
        fileNewIssue.calledOnce.should.be.true;
        fileNewIssue.firstCall.args.should.eql(expectedFileNewIssueArgs);
        reply.calledOnce.should.be.true;
        reply.firstCall.args.should.eql([errorMessage]);
        next.calledOnce.should.be.true;
        next.calledWith(hubotDone).should.be.true;
        hubotDone.called.should.be.false;
        logHelper.messages.should.eql([
          helpers.matchingRuleLogMessage(),
          helpers.githubLogMessage(),
          helpers.failureLogMessage('test failure')
        ]);
      }).should.notify(done);
    });

    it('should not file another issue for the same message when ' +
      'one is in progress', function(done) {
      fileNewIssue.returns(Promise.resolve(helpers.ISSUE_URL));
      result = doExecute(done);

      if (!result) {
        return;
      }

      if (middleware.execute(context, next, hubotDone) !== undefined) {
        logHelper.restoreLog();
        return done(new Error('middleware.execute did not prevent a second ' +
          'issue being filed when one was in progress'));
      }

      return result.should.become(helpers.ISSUE_URL).then(function() {
        var inProgressLogMessage;

        logHelper.restoreLog();
        fileNewIssue.calledOnce.should.be.true;

        inProgressLogMessage = scriptName + ': ' + helpers.MSG_ID +
          ': already in progress';
        logHelper.messages.should.include.something.that.deep.equals(
          inProgressLogMessage);
      }).should.notify(done);
    });

    it('should not file another issue for the same message when ' +
      'one is already filed ', function() {
      var result, alreadyFiledLogMessage;

      message.rawMessage.item.message.reactions.push({
        name: config.successReaction,
        count: 1,
        users: [ helpers.USER_ID ]
      });

      logHelper.captureLog();
      result = middleware.execute(context, next, hubotDone);
      logHelper.restoreLog();
      expect(result).to.be.undefined;

      alreadyFiledLogMessage = scriptName + ': ' + helpers.MSG_ID +
        ': already processed';
      logHelper.messages.should.include.something.that.deep.equals(
        alreadyFiledLogMessage);
    });
  });
});
