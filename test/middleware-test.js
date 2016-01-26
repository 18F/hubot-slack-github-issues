/* jshint node: true */
/* jshint mocha: true */
/* jshint expr: true */

'use strict';

var Middleware = require('../lib/middleware');
var Config = require('../lib/config');
var Rule = require('../lib/rule');
var GitHubClient = require('../lib/github-client');
var SlackClient = require('../lib/slack-client');
var Logger = require('../lib/logger');
var helpers = require('./helpers');
var chai = require('chai');
var sinon = require('sinon');
var chaiAsPromised = require('chai-as-promised');
var chaiThings = require('chai-things');

var expect = chai.expect;
chai.should();
chai.use(chaiAsPromised);
chai.use(chaiThings);

describe('Middleware', function() {
  var config, slackClient, githubClient, logger, middleware;

  beforeEach(function() {
    config = new Config(helpers.baseConfig());
    slackClient = new SlackClient(undefined, config);
    githubClient = new GitHubClient(config);
    logger = new Logger(console);
    middleware = new Middleware(config, slackClient, githubClient, logger);
  });

  describe('findMatchingRule', function() {
    var getChannelName, message;

    beforeEach(function() {
      getChannelName = sinon.stub(slackClient, 'getChannelName');
      getChannelName.returns('not-any-channel-from-any-config-rule');
      message = helpers.reactionAddedMessage();
    });

    afterEach(function() {
      getChannelName.restore();
    });

    it('should find the rule matching the message', function() {
      var expected = config.rules[1],
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
      message.type = 'hello';
      expect(middleware.findMatchingRule(message)).to.be.undefined;
    });

    it('should ignore a message if its item type does not match', function() {
      message.item.type = 'file';
      expect(middleware.findMatchingRule(message)).to.be.undefined;
    });

    it('should ignore messages that do not match any rule', function() {
      message.reaction = 'sad-face';
      expect(middleware.findMatchingRule(message)).to.be.undefined;
    });
  });

  describe('parseMetadata', function() {
    var getChannelName;

    beforeEach(function() {
      getChannelName = sinon.stub(slackClient, 'getChannelName');
      getChannelName.returns('handbook');
    });

    afterEach(function() {
      getChannelName.restore();
    });

    it('should parse GitHub request metadata from a message', function() {
      middleware.parseMetadata(helpers.messageWithReactions())
        .should.eql(helpers.metadata());
      getChannelName.calledOnce.should.be.true;
      getChannelName.args.should.have.deep.property('[0]')
        .that.deep.equals([helpers.CHANNEL_ID]);
    });
  });

  describe('execute', function() {
    var context, next, hubotDone, message, checkErrorResponse;

    beforeEach(function() {
      context = {
        response: {
          message: helpers.fullReactionAddedMessage(),
          reply: sinon.spy()
        }
      };
      next = sinon.spy();
      hubotDone = sinon.spy();
      message = helpers.fullReactionAddedMessage();

      slackClient = sinon.stub(slackClient);
      githubClient = sinon.stub(githubClient);
      logger = sinon.stub(logger);

      slackClient.getChannelName.returns('handbook');
      slackClient.getTeamDomain.returns('18f');

      slackClient.getReactions
        .returns(Promise.resolve(helpers.messageWithReactions()));
      githubClient.fileNewIssue.returns(Promise.resolve(helpers.ISSUE_URL));
      slackClient.addSuccessReaction
        .returns(Promise.resolve(helpers.ISSUE_URL));
    });

    it('should receive a message and file an issue', function(done) {
      middleware.execute(context, next, hubotDone)
        .should.become(helpers.ISSUE_URL).then(function() {
        var matchingRule = new Rule(helpers.baseConfig().rules[1]);

        context.response.reply.args.should.eql([
          ['created: ' + helpers.ISSUE_URL]
        ]);
        next.calledWith(hubotDone).should.be.true;
        logger.info.args.should.eql([
          helpers.logArgs('matches rule:', matchingRule),
          helpers.logArgs('getting reactions for', helpers.PERMALINK),
          helpers.logArgs('making GitHub request for', helpers.PERMALINK),
          helpers.logArgs('adding', helpers.baseConfig().successReaction),
          helpers.logArgs('created: ' + helpers.ISSUE_URL)
        ]);
      }).should.notify(done);
    });

    it('should ignore messages that do not match', function() {
      delete context.response.message.rawMessage;
      expect(middleware.execute(context, next, hubotDone)).to.be.undefined;
      next.calledWith(hubotDone).should.be.true;
    });

    it('should not file another issue for the same message when ' +
      'one is in progress', function(done) {
      var result;

      result = middleware.execute(context, next, hubotDone);
      if (middleware.execute(context, next, hubotDone) !== undefined) {
        return done(new Error('middleware.execute did not prevent filing a ' +
          'second issue when one was already in progress'));
      }

      result.should.become(helpers.ISSUE_URL).then(function() {
        logger.info.args.should.include.something.that.deep.equals(
          helpers.logArgs('already in progress'));

        // Make another call to ensure that the ID is cleaned up. Normally the
        // message will have a successReaction after the first successful
        // request, but we'll test that in another case.
        middleware.execute(context, next, hubotDone)
          .should.become(helpers.ISSUE_URL).should.notify(done);
      });
    });

    it('should not file another issue for the same message when ' +
      'one is already filed ', function(done) {
      var message = helpers.messageWithReactions();

      message.message.reactions.push({
        name: config.successReaction,
        count: 1,
        users: [ helpers.USER_ID ]
      });
      slackClient.getReactions.returns(Promise.resolve(message));

      middleware.execute(context, next, hubotDone)
        .should.be.rejectedWith('already processed').then(function() {
        slackClient.getReactions.calledOnce.should.be.true;
        githubClient.fileNewIssue.called.should.be.false;
        slackClient.addSuccessReaction.called.should.be.false;
        context.response.reply.called.should.be.false;
        logger.info.args.should.include.something.that.deep.equals(
          helpers.logArgs('already processed ' + helpers.PERMALINK));
      }).should.notify(done);
    });

    checkErrorResponse = function(errorMessage) {
      context.response.reply.args.should.have.deep.property(
        '[0][0].message', errorMessage);
      logger.error.args.should.have.deep.property('[0][0]', helpers.MESSAGE_ID);
      logger.error.args.should.have.deep.property('[0][1]', errorMessage);
    };

    it('should receive a message but fail to get reactions', function(done) {
      var errorMessage = 'failed to get reactions for ' + helpers.PERMALINK +
        ': test failure';

      slackClient.getReactions
        .returns(Promise.reject(new Error('test failure')));

      middleware.execute(context, next, hubotDone)
        .should.be.rejectedWith(errorMessage).then(function() {
        slackClient.getReactions.calledOnce.should.be.true;
        githubClient.fileNewIssue.called.should.be.false;
        slackClient.addSuccessReaction.called.should.be.false;
        checkErrorResponse(errorMessage);
      }).should.notify(done);
    });

    it('should get reactions but fail to file an issue', function(done) {
      var errorMessage = 'failed to create a GitHub issue in 18F/handbook: ' +
        'test failure';

      githubClient.fileNewIssue
        .returns(Promise.reject(new Error('test failure')));

      middleware.execute(context, next, hubotDone)
        .should.be.rejectedWith(errorMessage).then(function() {
        slackClient.getReactions.calledOnce.should.be.true;
        githubClient.fileNewIssue.calledOnce.should.be.true;
        slackClient.addSuccessReaction.called.should.be.false;
        checkErrorResponse(errorMessage);
      }).should.notify(done);
    });

    it('should file an issue but fail to add a reaction', function(done) {
      var errorMessage = 'created ' + helpers.ISSUE_URL +
        ' but failed to add ' + helpers.baseConfig().successReaction +
        ': test failure';

      slackClient.addSuccessReaction
        .returns(Promise.reject(new Error('test failure')));

      middleware.execute(context, next, hubotDone)
        .should.be.rejectedWith(errorMessage).then(function() {
        slackClient.getReactions.calledOnce.should.be.true;
        githubClient.fileNewIssue.calledOnce.should.be.true;
        slackClient.addSuccessReaction.calledOnce.should.be.true;
        checkErrorResponse(errorMessage);
      }).should.notify(done);
    });

    it('should catch and log unanticipated errors', function() {
      var errorMessage = 'unhandled error: Error\nmessage: ' +
            JSON.stringify(helpers.reactionAddedMessage(), null, 2);

      slackClient.getChannelName.throws();
      expect(middleware.execute(context, next, hubotDone)).to.be.undefined;
      next.calledWith(hubotDone).should.be.true;
      context.response.reply.args.should.eql([[errorMessage]]);
      logger.error.args.should.eql([[null, errorMessage]]);
    });
  });
});
