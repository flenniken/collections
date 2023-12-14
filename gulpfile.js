const gulp = require("gulp");
const uglify = require("gulp-uglify");
const log = require("fancy-log");
const child_process = require("child_process");
const cleanCSS = require("gulp-clean-css");
const using = require('gulp-using');
const ts = require('gulp-typescript');

let help = []

gulp.task("default", function(cb){
  console.log("")
  console.log("gulp tasks:")
  console.log("")
  help.forEach((message, ix) => {
    console.log(message)
  })
  console.log("")
  cb()
});

function ts2js(src, dest, options=null) {
  if (options === null) {
    options = {
      noImplicitAny: true,
      target: "es6",
    }
  }
  return gulp.src(src)
    .pipe(using({prefix:'Compiling', filesize:true, color: "green"}))
    .pipe(ts(options))
    .pipe(uglify())
    .pipe(using({prefix:'Copy', path:'relative', filesize: true}))
    .pipe(gulp.dest(dest));
}

help.push("* tsimage -- compile image.ts to dist/js/image.js.")
gulp.task('tsimage', function () {
  return ts2js('ts/image.ts', 'dist/js/', null)
});

help.push("* tsthumbnails -- compile image.ts to dist/js/thumbnails.js.")
gulp.task('tsthumbnails', function () {
  return ts2js('ts/thumbnails.ts', 'dist/js/', null)
});

help.push("* tscollections -- compile collections.ts to dist/js/collections.js.")
gulp.task('tscollections', function () {
  return ts2js('ts/collections.ts', 'dist/js', null)
});

help.push("* tssw -- compile sw.ts to dist/sw.js.")
gulp.task('tssw', function () {
  options = {
    noImplicitAny: true,
    target: "es6",
    lib: ["esnext", "webworker"],
  }
  return ts2js('ts/sw.ts', 'dist/', options)
});

help.push("* js -- compile all ts files to js.")
gulp.task("js", gulp.parallel(["tsimage", "tsthumbnails", "tscollections", "tssw"]))

help.push("* css -- minimize the css files.")
gulp.task("css", function (cb) {
  return gulp.src(["pages/collections.css"])
    .pipe(using({prefix:'Compiling', filesize:true, color: "green"}))
    .pipe(cleanCSS({compatibility: "ie8"}))
    .pipe(using({prefix:'Copy', path:'relative', filesize: true}))
    .pipe(gulp.dest("dist/"));
})

help.push("* index -- create the main index page.")
gulp.task("index", function (cb) {
  // Create the main index page.

/*
statictea
  -t pages/index-tmpl.html \
  -s pages/collections.json \
  -o pages/header.tea \
  -r dist/index.html
*/
  log("Compiling index template.")
  const parameters = [
    "-t", "pages/index-tmpl.html",
    "-s", "pages/collections.json",
    "-o", "pages/header.tea",
    "-r", "dist/index.html",
  ]
  return child_process.spawn("statictea", parameters, {stdio: "inherit"});
})

help.push("* thumbnails -- create the thumbnails page.")
gulp.task("thumbnails", function (cb) {
  // Create the thumbnails page.

/*
statictea \
  -t pages/thumbnails-tmpl.html \
  -s pages/collection-1.json \
  -o pages/header.tea \
  -r dist/pages/thumbnails-1.html
*/

  log("Compiling thumbnails template.")
  const parameters = [
    "-t", "pages/thumbnails-tmpl.html",
    "-s", "pages/collection-1.json",
    "-o", "pages/header.tea",
    "-r", "dist/pages/thumbnails-1.html",
  ]
  return child_process.spawn("statictea", parameters, {stdio: "inherit"});
})

help.push("* image -- create the image page.")
gulp.task("image", function (cb) {
  // Create the image page.

/*
statictea
  -t pages/image-tmpl.html \
  -s pages/collection-1.json \
  -o pages/header.tea \
  -r dist/pages/image-1.html
*/

  log("Compiling image template.")
  const parameters = [
    "-t", "pages/image-tmpl.html",
    "-s", "pages/collection-1.json",
    "-o", "pages/header.tea",
    "-r", "dist/pages/image-1.html",
  ]
  return child_process.spawn("statictea", parameters, {stdio: "inherit"});
})

help.push("* pages -- create all the pages.")
gulp.task("pages", gulp.parallel("index", "thumbnails", "image"));

help.push("* rsync -- rsync the dist folder to flenniken.net/collections/.")
gulp.task("rsync", function(cb) {
  // Rsync the dest folder to flenniken.net.

/*
rsync -a --delete --progress \
  /Users/steve/code/collections/dist/ \
  1and1:flenniken/site/web/collections/
*/

  log("Rsync dist to flenniken.net/collections/")
  const parameters = [
    "--delete",
    "--progress",
    "-a",
    "/Users/steve/code/collections/dist/",
    "1and1:flenniken/site/web/collections/",
  ]
  return child_process.spawn("rsync", parameters, {stdio: "inherit"});
});

function onChange(pattern, task) {
  gulp.watch(pattern).on("change", function(file) {
    log(`Compiling changed: ${file}`)
    gulp.series([task]);
  })
}

help.push("* watch -- watch file changes and call the appropriate task.")
gulp.task("watch", function(cb) {
  // When a source file changes, compile it into the dest folder.

  const hr = "pages/header.tea"
  const json1 = "pages/collections-1.json"

  onChange("ts/*.ts", "ts")
  onChange("pages/collections.css", "css");
  onChange(["pages/index-tmpl.html", "pages/collections.json", hr], "index");
  onChange(["pages/thumbnails-1-tmpl.html", json1, hr], "thumbnails");
  onChange(["pages/image-1-tmpl.html", json1, hr], "image");

  cb();
});

help.push("* all -- run the js, pages, and icon task in parallel then rsync the results")
gulp.task("all", gulp.series([gulp.parallel(["js", "pages"]), "rsync"]));
