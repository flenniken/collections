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

import { TaskCallback } from "undertaker";

// Minimize the javascript.
const minimize = false

let help = `
* ts: Compile and optionally minimize ts files to dist/js.

        i -- Compile image.ts
        t -- Compile thumbnails.ts
        x -- Compile index.ts
       sw -- Compile sw.ts
       cm -- Compile maker.ts

* pages: Create all the pages from templates.

    index -- Create the main index page.
    maker -- Create the collection maker page.
    ready -- Create the images and thumbnails pages for ready collections.
 modified -- Update index thumbnails and remove unused images for modified colections.
      css -- Minimize the collection.css file.
    m-css -- Minimize the maker.css file.
    tsync -- Update the template's replace blocks in sync with the header.tea content.

* vpages: Validate all the html files.

   vindex -- Validate index html
   vmaker -- Validate maker html.
   vready -- Validate images and thumbnails pages for the ready collections.

* all: Compile most everything in parallel: ts, pages, vpages (not tsync).
`
// * Miscellaneous:
// *  readme: Show the readme file with glow.
// *  csjson: Generate the collections.json file from the images folder.

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
        return !compareContentsLog(tmpPath, destPath);
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

gulp.task("vready", function (cb) {
  // Validate the ready collection thumbnails and images pages.
  const readyCollections = getReadyCollections()
  fancyLog(`${readyCollections.length} ready collections`)
  for (let ix = 0; ix < readyCollections.length; ix++) {
    const cNum = readyCollections[ix].cNum
    fancyLog(`Validate: ${cNum}`)
    validateHtml(`dist/images/c${cNum}/image-${cNum}.html`)
    validateHtml(`dist/images/c${cNum}/thumbnails-${cNum}.html`)
  }
  cb()
})

gulp.task("vmaker", function (cb) {
  // Validate the maker html file.
  validateHtml("dist/maker.html")
  cb()
})

gulp.task("vpages", gulp.parallel("vindex", "vmaker", "vready"));

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
    if (!compareContentsLog(tmpFilename, distFilename)) {
      fs.copyFile(tmpFilename, distFilename, (err) => {
        if (err)
          throw err;
      });
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
  generateCollectionsJsonOnce()
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

gulp.task("ready", function (cb) {
  // Create the thumbnails and image pages for the ready collections.
  const readyCollections = getReadyCollections()
  const numReady = readyCollections.length
  fancyLog(`${numReady} ready collections`)
  if (numReady == 0)
    return cb()
  for (let ix = 0; ix < numReady; ix++) {
    const cNum = readyCollections[ix].cNum
    // log(`collection number: ${cNum}`)
    thumbnailsPage(cNum, ()=>{})
    imagePage(cNum, ()=>{})
  }
  cb()
})

function thumbnailsPage(cNum: number, cb: TaskCallback) {
  // Create the thumbnails page for the given collection.

/*
statictea \
  -t pages/thumbnails-tmpl.html \
  -s dist/images/cx/cx.json \
  -o pages/header.tea \
  -r dist/images/cx/thumbnails-x.html
*/

  fancyLog(`Building collection ${cNum} thumbnails page.`)
  const tmpFilename = `tmp/thumbnails-${cNum}.html`
  const distFilename = `dist/images/c${cNum}/thumbnails-${cNum}.html`
  const parameters = [
    "-t", "pages/thumbnails-tmpl.html",
    "-s", `dist/images/c${cNum}/c${cNum}.json`,
    "-o", "pages/header.tea",
    "-r", tmpFilename,
  ]
  runStaticteaTask(parameters, tmpFilename, distFilename, cb)
}

function imagePage(cNum: number, cb: TaskCallback) {
  // Create the image page for the given collection.

/*
statictea \
  -t pages/image-tmpl.html \
  -s dist/images/cx/cx.json \
  -o pages/header.tea \
  -r dist/images/cx/image-x.html
*/

  fancyLog(`Building collection ${cNum} images page.`)
  const tmpFilename = `tmp/image-${cNum}.html`
  const distFilename = `dist/images/c${cNum}/image-${cNum}.html`
  const parameters = [
    "-t", "pages/image-tmpl.html",
    "-s", `dist/images/c${cNum}/c${cNum}.json`,
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
  generateCollectionsJsonOnce()
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

gulp.task("modified", function (cb) {
  // Update index thumbnails and remove unused images for ready and
  // modified collections. Remove the modified flag when done.

  const readyCollections = getReadyCollections()

  for (let ix = 0; ix < readyCollections.length; ix++) {
    const indexCollection = readyCollections[ix]
    if (!("modified" in indexCollection))
      continue
    const cNum = indexCollection.cNum

    fancyLog(`Clean up modified collection: ${cNum}`)

    const unusedPathsAndImages = removeUnusedImages(cNum, true)
    unusedPathsAndImages.unusedPaths.forEach(path => {
      let msg: string
      fancyLog(`Removed: ${path}`)
    })

    // Copy the collection's index thumbnail when missing.
    const thumbnailBasename = path.basename(indexCollection.thumbnail)
    const destFilename = path.join("dist/tin", thumbnailBasename)
    if (!fs.existsSync(destFilename)) {
      const srcFilename = path.join(`dist/images/c${cNum}`, thumbnailBasename)
      fs.copyFile(srcFilename, destFilename, (err) => {
        if (err)
          throw err
        fancyLog(`Copied ${thumbnailBasename} to tin folder.`)
      })
    }

    // Remove the old collection's index thumbnail if it exists.
    const tinFolder = path.join("dist/tin")
    fs.readdirSync(tinFolder).filter(file => {
      if (file.startsWith(`c${cNum}-`) && file != thumbnailBasename) {
        const fullPath = path.join(tinFolder, file)
        fs.unlinkSync(fullPath);
        fancyLog(`Removed old ${fullPath} from the tin folder.`)
      }
    });

    // Remove the modified field from the cjson.
    removeModifiedFlag(cNum)
  }
  return cb()
});

gulp.task("pages", gulp.parallel("index", "maker", "ready", "modified",
  "css", "m-css"));

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

gulp.task("all", gulp.series(["missing-folders", gulp.parallel(
  ["ts", "pages", "css", "m-css", "vpages"])]));


let builtOnce = false
function generateCollectionsJsonOnce() {
  // Build the collections.json file once per gulp run.
  if (builtOnce)
    return
  // Create pages/collections.json.
  generateCollectionsJson()
  builtOnce = true
}

export interface ImageName {
  // The image name is a string that contains the collection number,
  // image number and image type, for example: c1-4-p.jpg or
  // c1-4-t.jpg.  c{cNum}-{iNum}-[pt].jpg
  cNum: number,
  iNum: number,
  pt: string,
}

export function parseImageName(filename: string): ImageName | null {
  // Return the collection number (cNum) and the image number (iNum)
  // and the image type (p or t) when the name is a valid image
  // basename, else return null.

  const match = filename.match(/^c(\d+)-(\d+)-([pt])\.jpg$/)
  let imageName = null
  if (match && match.length == 4) {
    imageName = {
      cNum: parseInt(match[1]),
      iNum: parseInt(match[2]),
      pt: match[3],
    }
  }
  return imageName
}

function getCollectionFiles(cNum: number): string[] {
  // Return a list of all the files in the collection folder.

  const folder = `dist/images/c${cNum}`
  return fs.readdirSync(folder);
}

function readJsonFile(filename: string) {
  return JSON.parse(fs.readFileSync(filename, 'utf8'))
}

export function getCollectionImages(cNum: number): CJson.Image[] {
  // Return the images in the collection.

  const cjsonFilename = `dist/images/c${cNum}/c${cNum}.json`
  const cjson: CJson.Collection = readJsonFile(cjsonFilename)
  return cjson.images;
}

export function getUnusedImageFiles(images: CJson.Image[], allFiles: string[]): string[] {
  // Return the image files from allFiles that are not part of the
  // image list. The allFiles items do not have path information.

  // Add the image and thumbnail names to a set for fast lookup.
  const imageBasenames = new Set();
  images.forEach(image => {
    imageBasenames.add(path.basename(image.url));
    imageBasenames.add(path.basename(image.thumbnail));
  });

  let unusedImages: string[] = []
  allFiles.filter(basename => {
    const imageName = parseImageName(basename)

    // Skip non-image files.
    if (imageName == null)
      return

    // Skip files in the collection.
    if (imageBasenames.has(basename))
      return

    unusedImages.push(basename)
  });
  return unusedImages
}

export interface UnusedPathsAndImages {
  // The unused images files and the images in the collection.
  unusedPaths: string[],
  images: CJson.Image[],
}

export function removeUnusedImages(cNum: number, shouldDelete: boolean):
    UnusedPathsAndImages {
  // Remove unused images and thumbnails for the given collection
  // number. Return the full paths of the deleted files and the
  // images in the collection.  When shouldDelete is
  // false, the files not deleted.

  // Get the unused image files.
  const allFiles = getCollectionFiles(cNum);
  const images = getCollectionImages(cNum);
  const unusedImages = getUnusedImageFiles(images, allFiles);

  // Remove the unused images when specified.
  const imagesDir = `dist/images/c${cNum}`
  let unusedPaths: string[] = []
  const imageFiles = unusedImages.filter(filename => {
    const fullPath = path.join(imagesDir, filename);
    if (shouldDelete)
      fs.unlinkSync(fullPath);
    unusedPaths.push(fullPath);
  });

  // Return the unused image files and the collection's images.
  return {"unusedPaths": unusedPaths, "images": images}
}

function generateCollectionsJson() {
  // Generate the pages/collections.json file from the cjson files.

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
  const csjson: CJson.Csjson = { indexCollections: [] };
  for (const folder of collectionFolders) {
    const cjsonFile = path.join(imagesDir, folder, `${folder}.json`);
    if (!fs.existsSync(cjsonFile))
      throw new Error(`Error: Missing cjson: ${cjsonFile}`);

    const cinfo = readJsonFile(cjsonFile)

    const indexCollection: CJson.IndexCollection = {
      cNum: cinfo.cNum,
      building: "building" in cinfo ? cinfo.building : false,
      ready: cinfo.ready,
      title: cinfo.title,
      indexDescription: cinfo.indexDescription,
      thumbnail: cinfo.indexThumbnail,
      posted: cinfo.posted,
      iCount: cinfo.images.length,
      totalSize: cinfo.images.reduce(
        (total: number, image: { size: number; sizet: number; }) =>
          total + image.size + image.sizet, 0),
      modified: "modified" in cinfo ? cinfo.modified : false,
    };
    csjson.indexCollections.push(indexCollection);
  }

  // Write the collections.json file.
  fs.writeFileSync(outputFile, JSON.stringify(csjson, null, 2), 'utf8');
}

function getReadyCollections(): CJson.IndexCollection[] {
  // Return a list of the ready collections by reading the collections.json file.

  // Create pages/collections.json.
  generateCollectionsJsonOnce()
  const filename = "pages/collections.json"

  // Read the collections.json file and find all the ready collection numbers.
  const csjson: CJson.Csjson = readJsonFile(filename)
  if (! ("indexCollections" in csjson) ) {
    throw new Error(`indexCollections field missing from ${filename}`)
  }
  let readyCollections: CJson.IndexCollection[] = [];
  csjson.indexCollections.forEach(indexCollection => {
    if (indexCollection.ready) {
      readyCollections.push(indexCollection);
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

function compareContentsLog(srcPath: string, destPath: string): boolean {
  // Compare the contents of two files and log the result. Return true
  // when the files are the same, false when they are different.

  const same = compareContents(srcPath, destPath);
  if (same) {
    fancyLog(`${destPath} is unchanged.`);
  } else {
      fancyLog(`---> Copy to ${destPath}`);
  }
  return same;
}

function removeModifiedFlag(cNum: number) {
  // Remove the modified flag from the cjson file.

  const cjsonFilename = `dist/images/c${cNum}/c${cNum}.json`
  const cjson: CJson.Collection = readJsonFile(cjsonFilename)
  delete cjson.modified
  fs.writeFileSync(cjsonFilename, JSON.stringify(cjson, null, 2), 'utf8');
}
