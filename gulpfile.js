// Build tasks. Type "g" to see the available tasks.

const gulp = require("gulp");
const uglify = require("gulp-uglify");
const log = require("fancy-log");
const child_process = require("child_process");
const cleanCSS = require("gulp-clean-css");
const using = require('gulp-using');
const gulpif = require('gulp-if');
const ts = require('gulp-typescript');
const fs = require("fs");
const path = require("path");

// Minimize the javascript.
const minimize = false

let help = `
Tasks:
* ts: Compile and optionally minimize ts files to dist/js.
        i -- Compile image.ts
        t -- Compile thumbnails.ts
        x -- Compile index.ts
       sw -- Compile sw.ts
       cm -- Compile maker.ts

* pages: Create all the pages from templates.
    index -- Create the main index page.
    maker -- Create the collection maker page.
        p -- Create the images and thumbnails pages for the ready collections.

* vpages: Validate all the html files.
   vindex -- Validate index html
   vmaker -- Validate maker html.
        v -- Validate images and thumbnails html for the ready collections.

*     css: Minimize the collection.css file.
*   m-css: Minimize the maker.css file.
*    sync: Sync the template's replace blocks with header.tea content.
*  readme: Show the readme file with glow.
*   clist: Generate the collections.json file from the images folder.
*  unused: Remove unused collection images and thumbnails for the modified collections.
*     tin: Copy the index thumbnail to the shared folder for the modified collections.
*     all: Compile everything in parallel, tasks ts, pages, vpages and css.
`
const target = "es2017"

function removeUnusedImages(num) {
  return
  // Remove unused images and thumbnails for the given collection number.
  // Compare the images in the cjson file with the images in the
  // images folder. Remove the images that are not in the cjson file.
  const imagesDir = path.join(__dirname, 'dist/images/c' + num);
  const cjsonFile = path.join(imagesDir, 'c' + num + '.json');
  if (!fs.existsSync(cjsonFile)) {
    throw new Error(`No cjson file found for collection ${num}. Skipping.`);
  }

  // Read the image and thumbnail basenames from the cjson file. The image
  // comes from the url field and the thumbnail comes from the thumbnail field.
  // "url": "/images/c1/c1-7-p.jpg",
  // "thumbnail": "/images/c1/c1-7-t.jpg",
  const cjson = JSON.parse(fs.readFileSync(cjsonFile, 'utf8'));
  const collectionImages = new Set(cjson.images.map(image => path.basename(image.url)));
  collectionImages.push(...cjson.images.map(image => path.basename(image.thumbnail)));
  log(`Collection ${num} has ${collectionImages.length} images.`);

  // Process all files in the images directory.
  const allFiles = fs.readdirSync(imagesDir);
  allFiles.filter(file => {
    // Remove a JPEG image if it is not a collection image or a thumbnail.
    if (file.endsWith('.jpg') && !collectionImages.has(file)) {
      // Remove the file from the images directory.
      //fs.unlinkSync(path.join(imagesDir, file));
      log(`Removed: ${file}`);
    }
  });
}

function generateCollectionsJson() {
  // Generate the collections.json file from the images folder.
  const imagesDir = path.join(__dirname, 'dist/images');
  const outputFile = path.join(__dirname, 'pages/collections.json');

  // Ensure the images directory exists.
  if (!fs.existsSync(imagesDir))
    throw new Error(`Error: Images directory not found: ${imagesDir}`);

  // Find all collection folders in the images directory.
  const collectionFolders = fs.readdirSync(imagesDir).filter(folder => {
    const folderPath = path.join(imagesDir, folder);
    return fs.statSync(folderPath).isDirectory();
  });

  // Sort collection folders from newest to oldest.
  collectionFolders.sort((a, b) => parseInt(b.slice(1)) - parseInt(a.slice(1)));

  // Create the list of collections.
  const collectionsJson = { collections: [] };
  for (const folder of collectionFolders) {
    const cjsonFile = path.join(imagesDir, folder, `${folder}.json`);
    if (!fs.existsSync(cjsonFile))
      throw new Error(`Error: Missing cjson: ${cjsonFile}`);

    const cinfo = JSON.parse(fs.readFileSync(cjsonFile, 'utf8'));
    console.log(`Processing collection: ${cinfo.collection}`);

    const collection = {
      collection: cinfo.collection,
      cState: cinfo.cState,
      title: cinfo.title,
      indexDescription: cinfo.indexDescription,
      thumbnail: cinfo.indexThumbnail,
      posted: cinfo.posted,
      iCount: cinfo.images.length,
      totalSize: cinfo.images.reduce((total, image) => total + image.size + image.sizet, 0),
      modified: cinfo.modified,
    };
    collectionsJson.collections.push(collection);
  }

  // Write the collections.json file.
  fs.writeFileSync(outputFile, JSON.stringify(collectionsJson, null, 2), 'utf8');
  console.log(`Created the file: ${outputFile}`);
}



gulp.task("default", function(cb){
  console.log(help)
  cb()
});

function ts2js(srcList, destFile, destDir, tsOptions=null) {
  // Compile a list of typescript files to one javascript file and
  // optionally minimize it.

  if (tsOptions === null) {
    tsOptions = {
      "noImplicitAny": true,
      "lib": ["ES2017", "dom"],
      "target": target,
      "strict": true,
      "outFile": `${destFile}`
    }
  }

  const tmpPath = `tmp/${destFile}`
  const destPath = `${destDir}/${destFile}`

  return gulp.src(srcList)
    .pipe(using({prefix:'File size:', filesize:true, color: "green"}))
    .pipe(ts(tsOptions))
    .pipe(using({prefix:'Compiled', filesize:true, color: "blue"}))
    .pipe(gulpif(minimize, uglify()))
    .pipe(gulpif(minimize, using({prefix:'Minimized', filesize:true, color: "blue"})))
    .pipe(gulp.dest("tmp"))
    .pipe(gulpif(
      // Only copy to dest if files are different
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
const image_ts = ["ts/all.ts", "ts/win.ts", "ts/cjsonDefinition.ts", "ts/image.ts"]
const thumbnails_ts = ["ts/all.ts", "ts/win.ts", "ts/thumbnails.ts"]
const index_ts = ["ts/all.ts", "ts/win.ts", "ts/login.ts", "ts/download.ts", "ts/index.ts"]
const sw_ts = ["ts/all.ts", 'ts/sw.ts']

let maker_ts = ["ts/all.ts", "ts/win.ts", "ts/cjsonDefinition.ts", "ts/maker.ts"]
if (!minimize)
  maker_ts.push("ts/test-maker.ts");

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
    "lib": ["ES2017", "webworker"],
    "strict": true,
    "outFile": "sw.js"
  }
  // Store sw.js in the root so it has control of all files in the
  // root and subfolders below.
  return ts2js(sw_ts, 'sw.js', "dist", options)
});

// Compile maker ts
gulp.task('cm', function () {
  return ts2js(maker_ts, 'maker.js', "dist", null)
});

gulp.task("ts", gulp.parallel(["i", "t", "x", "sw", "cm"]))

function validateHtml(filename) {
  // Validate an html file.

  log(`Validating html file: ${filename}.`)

  // See https://www.npmjs.com/package/w3c-html-validator

  // To ignore multiple warnings:
  //   * use a file "--ignore-config=valid-ignore.txt".
  //   * use | regex
  //   * you cannot specify more than one --ignore option.

  // Ignore these:
  // Consider avoiding viewport values that prevent users from resizing documents.
  // Empty heading

  const parameters = [
    "--ignore=/Consider avoiding viewport values that|Empty heading/",
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

function getReadyCollections() {
  // Return a list of the ready collections by reading the collections.json file.
  const filename = "pages/collections.json"
  const data = JSON.parse(fs.readFileSync(filename, "utf8"));
  let readyCollections = [];
  data.collections.forEach(collection => {
    if (collection.cState === "ready") {
      readyCollections.push(collection.collection);
    }
  });
  return readyCollections;
}

gulp.task("v", function (cb) {
  // Validate the ready collection thumbnails and images pages.
  const readyCollections = getReadyCollections()
  log(`${readyCollections.length} ready collections`)
  for (let ix = 0; ix < readyCollections.length; ix++) {
    const num = readyCollections[ix]
    log(`Validate: ${num}`)
    validateHtml(`dist/images/c${num}/image-${num}.html`)
    validateHtml(`dist/images/c${num}/thumbnails-${num}.html`)
  }
  cb()
})

gulp.task("vmaker", function (cb) {
  // Validate the maker html file.
  validateHtml("dist/maker.html")
  cb()
})

gulp.task("vpages", gulp.parallel("vindex", "vmaker", "v"));

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
      log(`${distFilename} is unchanged.`)
    else {
      fs.copyFile(tmpFilename, distFilename, (err) => {
        if (err)
          throw err
        log(`Copied ${path.basename(tmpFilename)} to dist folder.`)
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
  -s pages/collections.json \
  -o pages/header.tea \
  -o pages/index.tea \
  -s env/aws-settings.json
  -r tmp/index.html
*/
  log("Compiling index template.")
  const parameters = [
    "-t", "pages/index-tmpl.html",
    "-s", "pages/collections.json",
    "-o", "pages/header.tea",
    "-o", "pages/index.tea",
    "-s", "env/aws-settings.json",
    "-r", "tmp/index.html",
  ]
  runStaticteaTask(parameters, "tmp/index.html", "dist/index.html", cb)
})

gulp.task("p", function (cb) {
  // Create the thumbnails and image pages for the ready collections.
  const readyCollections = getReadyCollections()
  const numReady = readyCollections.length
  log(`${numReady} ready collections`)
  if (numReady == 0)
    return cb()
  for (let ix = 0; ix < numReady; ix++) {
    const num = readyCollections[ix]
    // log(`collection number: ${num}`)
    thumbnailsPage(num, ()=>{})
    imagePage(num, ()=>{})
  }
  cb()
})

function thumbnailsPage(collectionNumber, cb) {
  // Create the thumbnails page for the given collection.

/*
statictea \
  -t pages/thumbnails-tmpl.html \
  -s dist/images/cx/cx.json \
  -o pages/header.tea \
  -r dist/images/cx/thumbnails-x.html
*/

  const num = collectionNumber
  log(`Building thumbnails page ${num}.`)
  const tmpFilename = `tmp/thumbnails-${num}.html`
  const distFilename = `dist/images/c${num}/thumbnails-${num}.html`
  const parameters = [
    "-t", "pages/thumbnails-tmpl.html",
    "-s", `dist/images/c${num}/c${num}.json`,
    "-o", "pages/header.tea",
    "-r", tmpFilename,
  ]
  runStaticteaTask(parameters, tmpFilename, distFilename, cb)
}

function imagePage(collectionNumber, cb) {
  // Create the image page for the given collection.

/*
statictea \
  -t pages/image-tmpl.html \
  -s dist/images/cx/cx.json \
  -o pages/header.tea \
  -r dist/images/cx/image-x.html
*/

  const num = collectionNumber
  log(`Building images page ${num}.`)
  const tmpFilename = `tmp/image-${num}.html`
  const distFilename = `dist/images/c${num}/image-${num}.html`
  const parameters = [
    "-t", "pages/image-tmpl.html",
    "-s", `dist/images/c${num}/c${num}.json`,
    "-o", "pages/header.tea",
    "-r", tmpFilename,
  ]
  runStaticteaTask(parameters, tmpFilename, distFilename, cb)
}

gulp.task("maker", function (cb) {
  // Create the maker page.

/*
statictea \
  -t pages/maker-tmpl.html \
  -s pages/collections.json \
  -o pages/header.tea \
  -r dist/maker.html
*/

  log('Compiling the maker template')
  const tmpFilename = 'tmp/maker.html'
  const distFilename = 'dist/maker.html'
  const parameters = [
    "-t", "pages/maker-tmpl.html",
    "-s", `pages/collections.json`,
    "-o", "pages/header.tea",
    "-r", tmpFilename,
  ]
  // Compile maker-tmpl.html into the tmp dir then copy it to the dist
  // dir.
  runStaticteaTask(parameters, tmpFilename, distFilename, cb)

})

gulp.task("sync", function (cb) {
  // Syncronize index template's replace blocks with header.tea.
/*
statictea -u -o pages/header.tea -t pages/index-tmpl.html
statictea -u -o pages/header.tea -t pages/image-tmpl.html
statictea -u -o pages/header.tea -t pages/thumbnails-tmpl.html
statictea -u -o pages/header.tea -t pages/maker-tmpl.html
*/
  log("Syncronize all templates with header.tea.")
  const commands = [
    ["-u", "-o", "pages/header.tea", "-t", "pages/index-tmpl.html"],
    ["-u", "-o", "pages/header.tea", "-t", "pages/image-tmpl.html"],
    ["-u", "-o", "pages/header.tea", "-t", "pages/thumbnails-tmpl.html"],
    ["-u", "-o", "pages/header.tea", "-t", "pages/maker-tmpl.html"],
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

gulp.task("m-css", function (cb) {
  return gulp.src(["pages/maker.css"])
    .pipe(using({prefix:'Compiling', filesize:true, color: "green"}))
    .pipe(cleanCSS({compatibility: "ie8"}))
    .pipe(using({prefix:'Copy', path:'relative', filesize: true}))
    .pipe(gulp.dest("dist/"));
})

gulp.task("pages", gulp.parallel("index", "maker", "p"));

gulp.task('readme', function () {
  const parameters = [
    "-p",
    "readme.md",
  ]
  return child_process.spawn("glow", parameters, {stdio: "inherit"});
});

gulp.task("missing-folders", function (cb) {
  // Create the images folders, it is missing the first time you run
  // after making a new docker container.
  gulp.src('*.*', {read: false}).pipe(gulp.dest('./dist/images'))
  return cb()
})

gulp.task("clist", function (cb) {
  // Generate the collections.json file from the images folder.
  generateCollectionsJson();
  return cb()
})

gulp.task("unused", function (cb) {
  // Remove unused collection images and thumbnails for the modified collections.
  const readyCollections = getReadyCollections()
  // todo: get the modified collections not the ready ones.`
  for (let ix = 0; ix < readyCollections.length; ix++) {
    const num = readyCollections[ix]
    log(`Removing unused images for collection ${num}.`)
    removeUnusedImages(num)
  }
  return cb()
});

gulp.task("all", gulp.series(["missing-folders", gulp.parallel(
  ["ts", "pages", "css", "m-css", "vpages"])]));
