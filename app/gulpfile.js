var gulp = require('gulp');
var templateCache = require('gulp-angular-templatecache');
var order = require("gulp-order");
var concat = require("gulp-concat");
var clean = require('gulp-clean');
var watch = require('gulp-watch');

gulp.task('default',['clean','concat','watch']);

gulp.task('clean', function(){
  return gulp.src('dist', {read: false})
       .pipe(clean());
})

gulp.task('template',function() {
  return gulp.src('templates/*.html')
    .pipe(templateCache())
    .pipe(gulp.dest('scripts'));
});

gulp.task('concat',['template'], function() {
  return gulp
    .src(['scripts/jquery.min.js','scripts/angular.min.js','scripts/templates.js','scripts/src.js'],{base: 'scripts/'})
    .pipe(order([
      'jquery.min.js',
      'angular.min.js',
      'src.js',
      'templates.js'
    ]))
    .pipe(concat("all.js"))
    .pipe(gulp.dest("dist"));
});


gulp.task('watch', function() {
  gulp.watch(['scripts/*.js','styles/main.css','templates/*.html'], ['clean','concat']);
});
