/* jshint node: true */

var gulp = require('gulp');
var yargs = require('yargs');
var mocha = require('gulp-mocha');
var jshint = require('gulp-jshint');
var istanbul = require('gulp-istanbul');

var TEST_DEPENDENCIES = getTestDependencies();

require('coffee-script/register');

function buildArgs(args) {
  var argName, skipArgs = { _: true, '$0': true };

  for (argName in yargs.argv) {
    if (yargs.argv.hasOwnProperty(argName) && !skipArgs[argName]) {
      args[argName] = yargs.argv[argName];
    }
  }
  return args;
}

gulp.task('setup-coverage', function() {
  return gulp.src(['scripts/**/*.js', 'lib/**/*.js'])
    .pipe(istanbul({ includeUntested: true }))
    .pipe(istanbul.hookRequire());
});

function getTestDependencies() {
  var dependencies = [];

  if (process.env.CI === 'true' || process.env.COVERAGE === 'true') {
    dependencies.push('setup-coverage');
  }
  return dependencies;
}

function getCoverageReportOptions() {
  var options;

  if (process.env.CI === 'true') {
    options = { reporters: ['text', 'lcovonly'] };
  }
  return options;
}

gulp.task('test', TEST_DEPENDENCIES, function() {
  var tests = gulp.src(['./test/*.js'], {read: false}),
      coverageEnabled = TEST_DEPENDENCIES.indexOf('setup-coverage') !== -1;

  // Reporters:
  // https://github.com/mochajs/mocha/blob/master/lib/reporters/index.js
  return tests.pipe(mocha(buildArgs({ reporter: 'spec' })))
    .on('error', function() {
      coverageEnabled = false;
    })
    .on('end', function() {
      if (coverageEnabled) {
        return tests.pipe(istanbul.writeReports(getCoverageReportOptions()));
      }
    });
});

gulp.task('lint', function() {
  return gulp.src(['*.js', 'scripts/**/*.js', 'lib/**/*.js', 'test/**/*.js'])
    .pipe(jshint())
    .pipe(jshint.reporter('default'));
});
