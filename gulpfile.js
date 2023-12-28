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

function ts2js(src, dest, tsOptions=null, debug=true) {
  if (tsOptions === null) {
    tsOptions = {
      noImplicitAny: true,
      lib: ["es7", "dom"],
      target: "es6",
    }
  }

  // When not debugging remove the log functions.
  let pure_funcs = []
  if (debug == false)
    pure_funcs = ["log", "startTimer.log", "logError"]

  const ugOptions = {
    warnings: true,
    compress:{
      pure_funcs: pure_funcs
    }
  }
  return gulp.src(src)
    .pipe(using({prefix:'Compiling', filesize:true, color: "green"}))
    .pipe(ts(tsOptions))
    .pipe(gulp.dest("tmp")) // Make a copy for inspection.
    .pipe(uglify(ugOptions))
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

help.push("* tsindex -- compile index.ts to dist/js/collections.js.")
gulp.task('tsindex', function () {
  return ts2js('ts/index.ts', 'dist/js', null)
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

help.push("* ts -- compile and minimize ts files.")
gulp.task("ts", gulp.parallel(["tsimage", "tsthumbnails", "tsindex", "tssw"]))

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
statictea \
  -t pages/index-tmpl.html \
  -s pages/index.json \
  -o pages/header.tea \
  -r dist/index.html
*/
  log("Compiling index template.")
  const parameters = [
    "-t", "pages/index-tmpl.html",
    "-s", "pages/index.json",
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
statictea \
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

help.push("* syncronize -- Syncronize the template's replace blocks with header.tea.")
gulp.task("syncronize", function (cb) {
  // Syncronize index template's replace blocks with header.tea.
/*
statictea -u -o pages/header.tea -t pages/index-tmpl.html
statictea -u -o pages/header.tea -t pages/image-tmpl.html
statictea -u -o pages/header.tea -t pages/thumbnails-tmpl.html
*/
  log("Syncronize all templates with header.tea.")
  const commands = [
    ["-u", "-o", "pages/header.tea", "-t", "pages/index-tmpl.html"],
    ["-u", "-o", "pages/header.tea", "-t", "pages/image-tmpl.html"],
    ["-u", "-o", "pages/header.tea", "-t", "pages/thumbnails-tmpl.html"],
  ]
  commands.forEach((parameters, ix) => {
    child_process.spawn("statictea", parameters, {stdio: "inherit"});
  })
  cb()
})

help.push("* pages -- create all the pages from templates.")
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

help.push("* run-server -- Run the python server on the dist folder.")
gulp.task("run-server", function(cb) {

/*
cd dist
python3 -m http.server
*/

  log("Run python server on the dist folder.")
  const parameters = [
    "-m",
    "http.server",
  ]
  return child_process.spawn("python3", parameters, {stdio: "inherit", cwd: "dist"});
})

help.push("* readme -- show the readme with glow.")
gulp.task('readme', function () {
  const parameters = [
    "readme.md",
  ]
  return child_process.spawn("glow", parameters, {stdio: "inherit"});
});

help.push("* watch -- watch file changes and call the appropriate task.")
gulp.task("watch", function(cb) {
  // When a source file changes, compile it into the dest folder.

  const gs = gulp.series

  gulp.watch("ts/image.ts", gs(["tsimage", "rsync"]));
  gulp.watch("ts/thumbnails.ts", gs(["tsthumbnails"]));
  gulp.watch("ts/index.ts", gs(["tsindex"]));
  gulp.watch("ts/sw.ts", gs(["tssw"]));

  gulp.watch("pages/collections.css", gs(["css"]));

  const hr = "pages/header.tea"
  const json1 = "pages/collection-1.json"

  gulp.watch([hr], gs("syncronize"))

  gulp.watch(["pages/index-tmpl.html", "pages/index.json", hr], gs("index"))
  gulp.watch(["pages/thumbnails-tmpl.html", json1, hr], gs("thumbnails"))
  gulp.watch(["pages/image-tmpl.html", json1, hr], gs("image"))

  cb();
});

help.push("* all -- run the js, pages, and icon task in parallel then rsync the results")
gulp.task("all", gulp.series([gulp.parallel(["ts", "pages"]), "rsync"]));
