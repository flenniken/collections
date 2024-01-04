const gulp = require("gulp");
const uglify = require("gulp-uglify");
const log = require("fancy-log");
const child_process = require("child_process");
const cleanCSS = require("gulp-clean-css");
const using = require('gulp-using');
const ts = require('gulp-typescript');
// const jest = require('gulp-jest').default;

let help = `Tasks:
* ts -- compile and minimize ts files to dist/js.
    tsimage -- compile image.ts
    tsthumbnails -- compile image.ts
    tsindex -- compile index.ts
    tssw -- compile sw.ts
* pages -- create all the pages from templates.
    index -- create the main index page.
    thumbnails -- create the thumbnails page.
    image -- create the image page.
* css -- minimize the collection.css file.
* syncronize -- Syncronize the template's replace blocks with header.tea.
* run-server -- Run a test server exposing the dist folder on port
    8000. You can run it in the background with: "g run-server &" or "b1".
    Access in your browser with: http://localhost:8000/index.html
* watch -- watch file changes and call the appropriate task. You can
    run it in the background with: "g watch &" or "b2".
* readme -- show the readme file with glow.
* all -- run the js, pages and css tasks in parallel`

gulp.task("default", function(cb){
  console.log("")
  console.log("gulp tasks:")
  console.log("")
  console.log(help)
  console.log("")
  cb()
});

function ts2js(src, dest, tsOptions=null, debug=true) {
  // Compile a typescript file to javascript and minimize it.

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
    .pipe(gulp.dest("tmp")) // Make a copy in the tmp folder for inspection.
    .pipe(uglify(ugOptions))
    .pipe(using({prefix:'Copy', path:'relative', filesize: true}))
    .pipe(gulp.dest(dest));
}

gulp.task('tsimage', function () {
  return ts2js('ts/image.ts', 'dist/js/', null)
});

gulp.task('tsthumbnails', function () {
  return ts2js('ts/thumbnails.ts', 'dist/js/', null)
});

gulp.task('tsindex', function () {
  return ts2js('ts/index.ts', 'dist/js', null)
});

gulp.task('tssw', function () {
  options = {
    noImplicitAny: true,
    target: "es6",
    lib: ["esnext", "webworker"],
  }
  return ts2js('ts/sw.ts', 'dist/', options)
});

gulp.task("ts", gulp.parallel(["tsimage", "tsthumbnails", "tsindex", "tssw"]))

gulp.task("index", function (cb) {
  // Create the main index page from the index template.

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

gulp.task("css", function (cb) {
  return gulp.src(["pages/collections.css"])
    .pipe(using({prefix:'Compiling', filesize:true, color: "green"}))
    .pipe(cleanCSS({compatibility: "ie8"}))
    .pipe(using({prefix:'Copy', path:'relative', filesize: true}))
    .pipe(gulp.dest("dist/"));
})

gulp.task("pages", gulp.parallel("index", "thumbnails", "image"));

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

gulp.task('readme', function () {
  const parameters = [
    "-p",
    "readme.md",
  ]
  return child_process.spawn("glow", parameters, {stdio: "inherit"});
});

gulp.task("watch", function(cb) {
  // When a source file changes, compile it into the dest folder.

  const gs = gulp.series

  gulp.watch("ts/image.ts", gs(["tsimage"]));
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

gulp.task("all", gulp.series([gulp.parallel(["ts", "pages", "css"])]));
