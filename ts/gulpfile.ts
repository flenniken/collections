// Build tasks. Type "g" to see the available tasks.

/// <reference path="./cjsonDefinition.ts" />

"use strict";

import gulp from "gulp";
import uglify from "gulp-uglify";
import fancyLog from "fancy-log";
import child_process from "child_process";
import cleanCSS from "gulp-clean-css";
import using from 'gulp-using';
import gulpif from 'gulp-if';
import ts from 'gulp-typescript';
import fs from "fs";
import path from "path";
//import { testGulpfile } from "./test-gulpfile";

import { TaskCallback } from "undertaker";

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
      css -- Minimize the collection.css file.
    m-css -- Minimize the maker.css file.
    tsync -- Update the template's replace blocks in sync with the header.tea content.

* vpages: Validate all the html files.
   vindex -- Validate index html
   vmaker -- Validate maker html.
        v -- Validate images and thumbnails html for the ready collections.

* all: Compile most everything in parallel: ts, pages, vpages (not tsync).

* Miscellaneous:
*  readme: Show the readme file with glow.
*  csjson: Generate the collections.json file from the images folder.
*  unused: Remove unused collection images and thumbnails for the modified collections.
*     tin: Copy the index thumbnail to the shared folder for the modified collections.
`
const target = "es2017"



gulp.task("default", function(cb){
  console.log(help)
  cb()
});

function ts2js(srcList: string[], destFile: string, destDir: string,
  tsOptions: ts.Settings | null) {
  // Compile a list of typescript files to one javascript file and
  // optionally minimize it.

  if (tsOptions === null) {
    tsOptions = {
      "noImplicitAny": true,
      "lib": ["ES2017", "dom"],
      "target": target,
      "strict": true,
      "outFile": `${destFile}`,
      skipLibCheck: true,
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
          fancyLog(`${destPath} is unchanged.`);
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
  const options: ts.Settings = {
    "noImplicitAny": true,
    "target": target,
    "lib": ["ES2017", "webworker"],
    "strict": true,
    "outFile": "sw.js",
    skipLibCheck: true,
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

function validateHtml(filename: string) {
  // Validate an html file.

  fancyLog(`Validating html file: ${filename}.`)

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
      const msg = `html-validator exited with code ${code}.`;
      fancyLog(msg);
      throw new Error(msg)
    }
  });
}

gulp.task("vindex", function (cb) {
  // Validate the index html file.
  validateHtml("dist/index.html")
  cb()
})

gulp.task("v", function (cb) {
  // Validate the ready collection thumbnails and images pages.
  const readyCollections = getReadyCollections()
  fancyLog(`${readyCollections.length} ready collections`)
  for (let ix = 0; ix < readyCollections.length; ix++) {
    const num = readyCollections[ix]
    fancyLog(`Validate: ${num}`)
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

function runStaticteaTask(parameters: string[], tmpFilename: string,
  distFilename: string, cb: TaskCallback) {
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
      fancyLog(`${distFilename} is unchanged.`)
    else {
      fs.copyFile(tmpFilename, distFilename, (err) => {
        if (err)
          throw err
        fancyLog(`Copied ${path.basename(tmpFilename)} to dist folder.`)
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
  fancyLog("Compiling index template.")
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
  fancyLog(`${numReady} ready collections`)
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

function thumbnailsPage(collectionNumber: number, cb: TaskCallback) {
  // Create the thumbnails page for the given collection.

/*
statictea \
  -t pages/thumbnails-tmpl.html \
  -s dist/images/cx/cx.json \
  -o pages/header.tea \
  -r dist/images/cx/thumbnails-x.html
*/

  const num = collectionNumber
  fancyLog(`Building thumbnails page ${num}.`)
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

function imagePage(collectionNumber: number, cb: TaskCallback) {
  // Create the image page for the given collection.

/*
statictea \
  -t pages/image-tmpl.html \
  -s dist/images/cx/cx.json \
  -o pages/header.tea \
  -r dist/images/cx/image-x.html
*/

  const num = collectionNumber
  fancyLog(`Building images page ${num}.`)
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

  fancyLog('Compiling the maker template')
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

gulp.task("tsync", function (cb) {
  // Syncronize index template's replace blocks with header.tea.
/*
statictea -u -o pages/header.tea -t pages/index-tmpl.html
statictea -u -o pages/header.tea -t pages/image-tmpl.html
statictea -u -o pages/header.tea -t pages/thumbnails-tmpl.html
statictea -u -o pages/header.tea -t pages/maker-tmpl.html
*/
  fancyLog("Syncronize all templates with header.tea.")
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

gulp.task("pages", gulp.parallel("index", "maker", "p", "css", "m-css"));

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

gulp.task("csjson", function (cb) {
  // Generate the collections.json file from the cjson files in the images folder.
  generateCollectionsJson();
  return cb()
})

gulp.task("unused", function (cb) {
  // Remove unused collection images and thumbnails for the modified collections.
  const readyCollections = getReadyCollections()
  // todo: get the modified collections not the ready ones.`
  for (let ix = 0; ix < readyCollections.length; ix++) {
    const num = readyCollections[ix]
    fancyLog(`Removing unused images for collection ${num}.`)
    removeUnusedImages(num)
  }
  return cb()
});

gulp.task("all", gulp.series(["missing-folders", gulp.parallel(
  ["ts", "pages", "css", "m-css", "vpages"])]));


interface IndexCollection {
  // These fields come from the cjson file directly or are
  // derived from it.
  collection: number,
  cState: string,
  title: string,
  indexDescription: string,
  thumbnail: string,
  posted: string,
  iCount: number,
  totalSize: number,
  modified: boolean,
};

interface IndexCollections {
  indexCollections: IndexCollection[];
}

function removeUnusedImages(num: number) {
  // Remove unused images and thumbnails for the given collection number.

  // Remove the file from the images directory.
  //fs.unlinkSync(path.join(imagesDir, file));
}

function getUnusedImages(num: number, imageFolder: string): string[] {
  // Return a list of unused images in the given collection's folder.
  // num is the collection number.
  // Compare the images in the cjson file with the images in the
  // image folder.
  const cjsonFilename = path.join(imageFolder, `${num}.json`);
  if (!fs.existsSync(cjsonFilename)) {
    throw new Error(`The cjson file is missing: ${cjsonFilename}`);
  }
  if (!fs.existsSync(imageFolder)) {
    throw new Error(`The cjson folder is missing: ${imageFolder}`);
  }

  // Read the image and thumbnail basenames from the cjson file. The image
  // comes from the url field and the thumbnail comes from the thumbnail field.
  // "url": "/images/c1/c1-7-p.jpg",
  // "thumbnail": "/images/c1/c1-7-t.jpg",
  const cjson: CJson.Collection = JSON.parse(fs.readFileSync(cjsonFilename, 'utf8'));

  // Add the image and thumbnail names to a set for fast lookup.
  const imageNames = new Set();
  cjson.images.forEach(image => {
    imageNames.add(path.basename(image.url));
    imageNames.add(path.basename(image.thumbnail));
  });

  // Read all files in the folder.
  const allFiles = fs.readdirSync(imageFolder);

  // Make a list of the unused jpg files.
  let unusedImages: string[] = []
  allFiles.filter(file => {
    const basename = path.basename(file)
    if (basename.endsWith('.jpg') && !imageNames.has(basename)) {
      unusedImages.push(basename)
    }
  });
  return unusedImages
}

function generateCollectionsJson() {
  // Generate the collections.json file from the images folder.
  const imagesDir = 'dist/images'
  const outputFile = 'pages/collections.json'

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
  const indexCollections: IndexCollections = { indexCollections: [] };
  for (const folder of collectionFolders) {
    const cjsonFile = path.join(imagesDir, folder, `${folder}.json`);
    if (!fs.existsSync(cjsonFile))
      throw new Error(`Error: Missing cjson: ${cjsonFile}`);

    const cinfo = JSON.parse(fs.readFileSync(cjsonFile, 'utf8'));
    console.log(`Processing collection: ${cinfo.collection}`);

    const indexCollection: IndexCollection = {
      collection: cinfo.collection,
      cState: cinfo.cState,
      title: cinfo.title,
      indexDescription: cinfo.indexDescription,
      thumbnail: cinfo.indexThumbnail,
      posted: cinfo.posted,
      iCount: cinfo.images.length,
      totalSize: cinfo.images.reduce(
        (total: number, image: { size: number; sizet: number; }) =>
          total + image.size + image.sizet, 0),
      modified: cinfo.modified,
    };
    indexCollections.indexCollections.push(indexCollection);
  }

  // Write the collections.json file.
  fs.writeFileSync(outputFile, JSON.stringify(indexCollections, null, 2), 'utf8');
  console.log(`Created the file: ${outputFile}`);
}

function getReadyCollections(): number[] {
  // Return a list of the ready collections by reading the collections.json file.
  const filename = "pages/collections.json"
  if (!fs.existsSync(filename)) {
    throw new Error(`missing: ${filename}`)
  }

  // Read the collections.json file and find all the ready collection numbers.
  const indexCollections: IndexCollections = JSON.parse(fs.readFileSync(filename, "utf8"));
  if (! ("indexCollections" in indexCollections) ) {
    throw new Error(`indexCollections field missing from ${filename}`)
  }
  let readyCollections: number[] = [];
  indexCollections.indexCollections.forEach(indexCollection => {
    if (indexCollection.cState === "ready") {
      readyCollections.push(indexCollection.collection);
    }
  });
  return readyCollections;
}

function compareContents(sourceFilename: string, destFilename: string) {
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
