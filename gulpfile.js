// Build tasks. Type "g" to see the available tasks.

const gulp = require("gulp");
const uglify = require("gulp-uglify");
const log = require("fancy-log");
const child_process = require("child_process");
const cleanCSS = require("gulp-clean-css");
const using = require('gulp-using');
const gulpif = require('gulp-if');
const ts = require('gulp-typescript');

// Minimize the javascript.
const minimize = false

// Remove the logging functions. Minimize must be on too since uglify
// removes the functions.
const removeLogging = false

let help = `
Tasks:
* ts -- Compile and minimize ts files to dist/js.
    i -- Compile image.ts
    t -- Compile thumbnails.ts
    x -- Compile index.ts
    sw -- Compile sw.ts
* pages -- Create all the pages from templates.
    index -- Create the main index page.
    thumbnails -- Create the thumbnails page.
    image -- Create the image page.
* vpages -- Validate all the html files.
    vindex -- Validate index html
    vthumbnails -- Validate thumbnails html
    vimage -- Validate image html
* css -- Minimize the collection.css file.
* syncronize -- Syncronize the template's replace blocks with header.tea.
* run-server -- (alias gr) Run a test server exposing the dist folder on port
    8000. You can run it in the background with alias gr.
    Access files in your browser with: http://localhost:8000/index.html
* watch -- (alias gw) Watch file changes and call the appropriate task. You can
    run it in the background with alias gw.
* readme -- Show the readme file with glow.
* all -- Compile everything in parallel, tasks ts, pages and css.
`

const target = "es6"

gulp.task("default", function(cb){
  console.log(help)
  cb()
});

function ts2js(srcList, destFile, destDir, tsOptions=null) {
  // Compile a list of typescript files to one javascript file and
  // minimize it.

  if (tsOptions === null) {
    tsOptions = {
      "noImplicitAny": true,
      "lib": ["es7", "dom"],
      "target": target,
      "strict": true,
      "outFile": `${destFile}`
    }
  }

  // When specified remove the log functions.
  let pure_funcs = []
  if (removeLogging) {
    log("Remove log functions")
    pure_funcs = ["log", "startTimer.log", "logError"]
  }

  const ugOptions = {
    warnings: true,
    compress:{
      pure_funcs: pure_funcs
    }
  }
  log(`Minimize ${minimize}`)
  return gulp.src(srcList)
    .pipe(using({prefix:'Compiling', filesize:true, color: "green"}))
    .pipe(ts(tsOptions))
    .pipe(using({prefix:'Compiled', filesize:true, color: "blue"}))
    // Make a copy of the typescript js in the tmp folder for inspection.
    .pipe(gulp.dest("tmp"))
    .pipe(gulpif(minimize, uglify()))
    .pipe(gulp.dest(destDir));
}

gulp.task('i', function () {
  return ts2js(["ts/shared.ts", "ts/image.ts"], 'image.js', "dist/js", null)
});

gulp.task('t', function () {
  return ts2js(["ts/shared.ts", 'ts/thumbnails.ts'], 'thumbnails.js', "dist/js", null)
});

gulp.task('x', function () {
  return ts2js(["ts/shared.ts", "ts/index.ts"], 'index.js', "dist/js", null)
});

gulp.task('sw', function () {
  options = {
    "noImplicitAny": true,
    "target": target,
    "lib": ["esnext", "webworker"],
    "strict": true,
    "outFile": "sw.js"
  }
  return ts2js(['ts/sw.ts'], 'sw.js', "dist", options)
});

gulp.task("ts", gulp.parallel(["i", "t", "x", "sw"]))

function validateHtml(filename) {
  // Validate an html file.

  log(`Validating html file: ${filename}.`)

  // See https://www.npmjs.com/package/w3c-html-validator
  // You can use a file "--ignore-config=valid-ignore.txt".
  // You can also support multiple with | regex.

  // html-validator '--ignore=/Consider/' dist/pages/thumbnails-1.html

  const ignore = "Consider avoiding viewport values that prevent users from resizing documents."
  const parameters = [
    `--ignore=/${ignore}/`,
    `${filename}`
  ]
  return child_process.spawn("html-validator", parameters, {stdio: "inherit"});
}

gulp.task("vindex", function (cb) {
  // Validate the index html file.
  return validateHtml("dist/index.html")
})

gulp.task("vimage", function (cb) {
  // Validate the image html file.
  return validateHtml("dist/pages/image-1.html")
})

gulp.task("vthumbnails", function (cb) {
  // Validate the thumbnails html file.
  return validateHtml("dist/pages/thumbnails-1.html")
})

gulp.task("vpages", gulp.parallel("vindex", "vthumbnails", "vimage"));

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
  // When a source file changes, compile it into the dist folder.

  const gs = gulp.series
  const shared = "ts/shared.ts"

  gulp.watch([shared, "ts/image.ts"], gs(["i"]));
  gulp.watch([shared, "ts/thumbnails.ts"], gs(["t"]));
  gulp.watch([shared, "ts/index.ts"], gs(["x"]));
  gulp.watch([shared, "ts/sw.ts"], gs(["sw"]));

  gulp.watch("pages/collections.css", gs(["css"]));

  const hr = "pages/header.tea"
  const json1 = "pages/collection-1.json"

  gulp.watch([hr], gs("syncronize"))

  gulp.watch(["pages/index-tmpl.html", "pages/index.json", hr], gs(["index", "vindex"]))
  gulp.watch(["pages/thumbnails-tmpl.html", json1, hr], gs(["thumbnails", "vthumbnails"]))
  gulp.watch(["pages/image-tmpl.html", json1, hr], gs(["image", "vimage"]))

  cb();
});

gulp.task("pages-folder", function (cb) {
  // Create the pages folder. It is missing the first time you run
  // after making a new docker container.
  return gulp.src('*.*', {read: false})
    .pipe(gulp.dest('./dist/pages'))
})

gulp.task("all", gulp.series(["pages-folder", gulp.parallel(["ts", "pages", "css", "vpages"])]));
