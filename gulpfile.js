var gulp = require('gulp');
var uglify = require('gulp-uglify');
var log = require('fancy-log');
const child_process = require('child_process');
const cleanCSS = require('gulp-clean-css');

gulp.task('showDate', function (cb) {
  return child_process.spawn('date', {stdio: 'inherit'});
})

gulp.task('js', function (cb) {
  return gulp.src(['js/*.js'])
    .pipe(uglify())
    .pipe(gulp.dest('dist/js/'));
})

gulp.task('css', function (cb) {
  return gulp.src(['collections.css'])
    .pipe(cleanCSS({compatibility: 'ie8'}))
    .pipe(gulp.dest('dist/'));
})

gulp.task('index', function (cb) {
  // Create the main index page.

  // statictea -t index-tmpl.html \
  //   -s collections.json \
  //   -o header.tea \
  //   -r index.html

  const parameters = [
    "-t", "index-tmpl.html",
    "-s", "collections.json",
    "-o", "header.tea",
    "-r", "dist/index.html",
  ]
  return child_process.spawn("statictea", parameters, {stdio: 'inherit'});
})

gulp.task('thumbnails', function (cb) {
  // Create the thumbnails page.

  // statictea -t pages/thumbnails-tmpl.html \
  //   -s pages/collection-1.json \
  //   -o header.tea \
  //   -r pages/thumbnails-1.html

  const parameters = [
    "-t", "pages/thumbnails-tmpl.html",
    "-s", "pages/collection-1.json",
    "-o", "header.tea",
    "-r", "dist/pages/thumbnails-1.html",
  ]
  return child_process.spawn("statictea", parameters, {stdio: 'inherit'});
})

gulp.task('image', function (cb) {
  // Create the image page.

  // statictea -t pages/image-tmpl.html \
  //   -s pages/collection-1.json \
  //   -o header.tea \
  //   -r pages/image-1.html

  const parameters = [
    "-t", "pages/image-tmpl.html",
    "-s", "pages/collection-1.json",
    "-o", "header.tea",
    "-r", "dist/pages/image-1.html",
  ]
  return child_process.spawn("statictea", parameters, {stdio: 'inherit'});
})

gulp.task('templates', gulp.parallel("index", "thumbnails", "image"));

gulp.task('icons', function() {
  // Copy the icons to dist.
  return gulp.src('./icons/*.png')
    .pipe(gulp.dest('./dist/icons'));
});

gulp.task('images', function() {
  // Copy the images to dist.
  return gulp.src('./images/*.jpg')
    .pipe(gulp.dest('./dist/images'));
});

gulp.task('rsync', function(cb) {

  const parameters = [
    "--delete",
    "--progress",
    "-a",
    "/Users/steve/code/collections/dist/",
    "1and1:flenniken/site/web/collections/",
  ]
  return child_process.spawn("rsync", parameters, {stdio: 'inherit'});
});

gulp.task('watch', function (cb) {
    gulp.watch('js/*.js', js);
    gulp.watch('images/**', images);
    cb();
});

gulp.task('all', gulp.parallel(['js', 'images', 'templates', 'icons']));

gulp.task('default', gulp.parallel('js'));
