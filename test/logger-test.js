/* jshint node: true */
/* jshint mocha: true */
/* jshint expr: true */

'use strict';

var Logger = require('../lib/logger');
var sinon = require('sinon');
var chai = require('chai');

chai.should();

describe('Logger', function() {
  var logger, infoSpy, errorSpy;

  beforeEach(function() {
    infoSpy = sinon.spy();
    errorSpy = sinon.spy();
    logger = new Logger({ info: infoSpy, error: errorSpy });
  });

  it('should prefix info messages with the script name', function() {
    logger.info(null, 'this', 'is', 'a', 'test');
    infoSpy.calledOnce.should.be.true;
    infoSpy.args[0].should.eql([Logger.PREFIX, 'this', 'is', 'a', 'test']);
  });

  it('should prefix info messages with the script name + msg ID', function() {
    logger.info('U5150+COU812', 'msgID', 'test');
    infoSpy.calledOnce.should.be.true;
    infoSpy.args[0].should.eql(
      [Logger.PREFIX, 'U5150+COU812:', 'msgID', 'test']);
  });

  it('should prefix error messages with the script name', function() {
    logger.error(null, 'this', 'is', 'a', 'test');
    errorSpy.calledOnce.should.be.true;
    errorSpy.args[0].should.eql([Logger.PREFIX, 'this', 'is', 'a', 'test']);
  });
});
