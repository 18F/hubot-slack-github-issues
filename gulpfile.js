/* jshint node: true */

var gulp = require('gulp');
var yargs = require('yargs');
var mocha = require('gulp-mocha');
var jshint = require('gulp-jshint');
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

gulp.task('test', function() {
  return gulp.src(['./test/*.js'], {read: false})
    // Reporters:
    // https://github.com/mochajs/mocha/blob/master/lib/reporters/index.js
    .pipe(mocha(buildArgs({ reporter: 'spec' })));
});

gulp.task('lint', function() {
  return gulp.src(['*.js', 'lib/**/*.js', 'src/**/*.js', 'test/**/*.js'])
    .pipe(jshint())
    .pipe(jshint.reporter('default'));
});
