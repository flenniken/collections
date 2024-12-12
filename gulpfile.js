// Build tasks. Type "g" to see the available tasks.

const gulp = require("gulp");
const uglify = require("gulp-uglify");
const log = require("fancy-log");
const child_process = require("child_process");
const cleanCSS = require("gulp-clean-css");
const using = require('gulp-using');
const gulpif = require('gulp-if');
const ts = require('gulp-typescript');
const download = require('gulp-download2')
const fs = require("fs");

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
    thumbnails1 -- Create the thumbnails page for collection 1.
    thumbnails2 -- Create the thumbnails page for collection 2.
    image1 -- Create the image page for collection 1.
    image2 -- Create the image page for collection 2.
* vpages -- Validate all the html files.
    vindex -- Validate index html
    vthumbnails1 -- Validate thumbnails html for collection 1.
    vthumbnails2 -- Validate thumbnails html for collection 2.
    vimage1 -- Validate image html for collection 1.
    vimage2 -- Validate image html for collection 2.
* css -- Minimize the collection.css file.
* syncronize -- Syncronize the template's replace blocks with header.tea content.
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
  // optionally minimize it.

  if (minimize)
    log(`Compile and minimize: ${srcList}`)
  else
    log(`Compile (un-minimized): ${srcList}`)

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

  const tmpPath = `tmp/${destFile}`
  const destPath = `${destDir}/${destFile}`

  return gulp.src(srcList)
    .pipe(using({prefix:'File size:', filesize:true, color: "green"}))
    .pipe(ts(tsOptions))
    .pipe(using({prefix:'Compiled', filesize:true, color: "blue"}))
    .pipe(gulp.dest("tmp"))
    .pipe(gulpif(minimize, uglify()))
    .pipe(gulpif(
      // Only pipe to dest if files are different
      file => {
        const unchanged = compareContents(tmpPath, destPath);
        if (unchanged) {
          log(`${destPath} is unchanged.`);
        }
        return !unchanged;
      },
      gulp.dest(destDir)
    ));
}

// Each of the four resulting js files are made from multiple ts files
// that are concatenated together.  The all.ts file is contactenated
// with all four.  The win.ts file is concatenated with all except
// sw.ts which doesn't have access to the DOM, window or document
// objects.
const image_ts = ["ts/all.ts", "ts/win.ts", "ts/image.ts"]
const thumbnails_ts = ["ts/all.ts", "ts/win.ts", "ts/thumbnails.ts"]
const index_ts = ["ts/all.ts", "ts/win.ts", "ts/login.ts", "ts/download.ts", "ts/index.ts"]
const sw_ts = ["ts/all.ts", 'ts/sw.ts']

// image page
gulp.task('i', function () {
  return ts2js(image_ts, 'image.js', "dist/js", null)
});

// thumbnails page
gulp.task('t', function () {
  return ts2js(thumbnails_ts, 'thumbnails.js', "dist/js", null)
});

// index page
gulp.task('x', function () {
  return ts2js(index_ts, 'index.js', "dist/js", null)
});

gulp.task('sw', function () {
  options = {
    "noImplicitAny": true,
    "target": target,
    "lib": ["es7", "webworker"],
    "strict": true,
    "outFile": "sw.js"
  }
  // Store sw.js in the root so it has control of all files in the
  // root and subfolders below.
  return ts2js(sw_ts, 'sw.js', "dist", options)
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

  const validator = child_process.spawn("html-validator", parameters, {stdio: "inherit"});
  validator.on('close', (code) => {
    if (code !== 0) {
      log(`validator exited with code ${code}`);
      error() // todo: fail more elegantly.
    }
  });

  return 0
}

gulp.task("vindex", function (cb) {
  // Validate the index html file.
  validateHtml("dist/index.html")
  cb()
})

gulp.task("vimage1", function (cb) {
  // Validate the image html file.
  validateHtml("dist/pages/image-1.html")
  cb()
})

gulp.task("vimage2", function (cb) {
  // Validate the image html file.
  validateHtml("dist/pages/image-2.html")
  cb()
})

gulp.task("vthumbnails1", function (cb) {
  // Validate the thumbnails html file.
  validateHtml("dist/pages/thumbnails-1.html")
  cb()
})

gulp.task("vthumbnails2", function (cb) {
  // Validate the thumbnails html file.
  validateHtml("dist/pages/thumbnails-2.html")
  cb()
})

gulp.task("vpages", gulp.parallel(
  "vindex", "vthumbnails1", "vthumbnails2", "vimage1", "vimage2"));

function compareContents(sourceFilename, destFilename) {
  // Return true when two files contain the same bytes. The source
  // file is required but the destination can be missing. Both files
  // are read into memory then compared.

  // Return false when the destination file is missing.
  if (!fs.existsSync(destFilename)) {
    return false
  }
  const sourceContent = fs.readFileSync(sourceFilename)
  const destContent = fs.readFileSync(destFilename)
  return sourceContent.equals(destContent)
}

function runStaticteaTask(parameters, tmpFilename, distFilename, cb) {
  // Run a statictea task and copy the result to the dist folder when it
  // changes.

  const child = child_process.spawn("statictea", parameters, {stdio: "inherit"});

  child.on('exit', (code) => {
    // Error out when statictea returns a non-zero return code.
    if (code !== 0)
      throw new Error("statictea template error")

    // Copy the template result to the dist folder when it is
    // different than before.
    if (compareContents(tmpFilename, distFilename))
      // log(`${path.basename(distFilename)} is unchanged.`)
      log(`${distFilename} is unchanged.`)
    else {
      fs.copyFile(tmpFilename, distFilename, (err) => {
        if (err)
          throw err
        log("Copied file to dist folder.")
      })
    }
    cb()
  })
}

gulp.task("index", function (cb) {
  // Create the main index page from the index template.

/*
statictea \
  -t pages/index-tmpl.html \
  -s pages/index.json \
  -o pages/header.tea \
  -s env/cognito-settings.json
  -r tmp/index.html
*/
  log("Compiling index template.")
  const parameters = [
    "-t", "pages/index-tmpl.html",
    "-s", "pages/index.json",
    "-o", "pages/header.tea",
    "-s", "env/cognito-settings.json",
    "-r", "tmp/index.html",
  ]
  runStaticteaTask(parameters, "tmp/index.html", "dist/index.html", cb)
})

gulp.task("thumbnails1", function (cb) {
  // Create the thumbnails page for collection 1.
  thumbnailsPage(1, cb)
})

gulp.task("thumbnails2", function (cb) {
  // Create the thumbnails page for collection 2.
  thumbnailsPage(2, cb)
})

function thumbnailsPage(collectionNumber, cb) {
  // Create the thumbnails page for the given collection.

/*
statictea \
  -t pages/thumbnails-tmpl.html \
  -s pages/collection-x.json \
  -o pages/header.tea \
  -r dist/pages/thumbnails-x.html
*/

  const num = collectionNumber
  log(`Compiling the thumbnails template for collection ${num}.`)
  const tmpFilename = `tmp/thumbnails-${num}.html`
  const distFilename = `dist/pages/thumbnails-${num}.html`
  const parameters = [
    "-t", "pages/thumbnails-tmpl.html",
    "-s", `pages/collection-${num}.json`,
    "-o", "pages/header.tea",
    "-r", tmpFilename,
  ]
  runStaticteaTask(parameters, tmpFilename, distFilename, cb)
}

gulp.task("image1", function (cb) {
  // Create the image page for collection 1.
  imagePage(1, cb)
  cb()
})

gulp.task("image2", function (cb) {
  // Create the image page for collection 2.
  imagePage(2, cb)
  cb()
})

function imagePage(collectionNumber, cb) {
  // Create the image page for the given collection.

/*
statictea \
  -t pages/image-tmpl.html \
  -s pages/collection-x.json \
  -o pages/header.tea \
  -r dist/pages/image-x.html
*/

  const num = collectionNumber
  log(`Compiling image template for collection ${collectionNumber}.`)
  const tmpFilename = `tmp/image-${num}.html`
  const distFilename = `dist/pages/image-${num}.html`
  const parameters = [
    "-t", "pages/image-tmpl.html",
    "-s", `pages/collection-${num}.json`,
    "-o", "pages/header.tea",
    "-r", tmpFilename,
  ]
  runStaticteaTask(parameters, tmpFilename, distFilename, cb)
}

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

gulp.task("pages", gulp.parallel("index", "thumbnails1", "thumbnails2", "image1", "image2"));

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

  gulp.watch(image_ts, gs(["i"]));
  gulp.watch(thumbnails_ts, gs(["t"]));
  gulp.watch(index_ts, gs(["x"]));
  gulp.watch(sw_ts, gs(["sw"]));

  gulp.watch("pages/collections.css", gs(["css"]));

  const hr = "pages/header.tea"
  const json1 = "pages/collection-1.json"
  const json2 = "pages/collection-2.json"

  gulp.watch([hr], gs("syncronize"))

  gulp.watch(["pages/index-tmpl.html", "pages/index.json", hr], gs(["index", "vindex"]))
  gulp.watch(["pages/thumbnails-tmpl.html", json1, json2, hr], gs([
    "thumbnails1", "thumbnails2", "vthumbnails1", "vthumbnails2"]))
  gulp.watch(["pages/image-tmpl.html", json1, json2, hr], gs([
    "image1", "image2", "vimage1", "vimage2"]))

  // todo: it is hard to tell whether the watch ran or not because the
  // time is in utc and it is not clear what the current time is.
  // Show the current time when the watch process finishes using
  // log(`${Date()}`)?

  cb();
});

gulp.task("missing-folders", function (cb) {
  // Create the pages and images folders, they are missing the first time you run
  // after making a new docker container.
  gulp.src('*.*', {read: false}).pipe(gulp.dest('./dist/pages'))
  gulp.src('*.*', {read: false}).pipe(gulp.dest('./dist/images'))
  return cb()
})

gulp.task("all", gulp.series(["missing-folders", gulp.parallel(["ts", "pages", "css", "vpages"])]));
