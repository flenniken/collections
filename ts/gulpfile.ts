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
const image_ts = ["ts/all.ts", "ts/win.ts", "ts/cjsonDefinition.ts", "ts/userInfo.ts",
                  "ts/image.ts"]
const thumbnails_ts = ["ts/all.ts", "ts/win.ts", "ts/thumbnails.ts"]
const index_ts = ["ts/all.ts", "ts/win.ts", "ts/cjsonDefinition.ts", "ts/userInfo.ts",
                  "ts/login.ts", "ts/download.ts", "ts/index.ts"]
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
    const thumbnailBasename = indexCollection.iThumbnail
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
  if (!filename)
    return null

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
    imageBasenames.add(image.iPreview);
    imageBasenames.add(image.iThumbnail);
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

function readAndValidateCjson(cjsonFile: string): CJson.Collection {
  // Read the cjson file and validate it. Return a cinfo dictionary
  // with the information. On error throw an exception.

  if (!fs.existsSync(cjsonFile))
    throw new Error(`Error: Missing cjson: ${cjsonFile}`);

  const cinfo = readJsonFile(cjsonFile)
  const basename = path.basename(cjsonFile)
  const folderCNum = parseInt(basename.match(/^c(\d+)\.json$/)?.[1] ?? "")
  validateCinfo(folderCNum, cinfo, true)

  return cinfo
}

function validateCinfo(folderCNum: number, cinfo: CJson.Collection, readFiles = true) {
  // Validate the cinfo. When readFiles is true, open the image files
  // to get their dimensions and file sizes so you can compare them to
  // the cinfo. On error throw an exception.

  validateCinfoNoReading(folderCNum, cinfo)

  if (readFiles) {
    validateCinfoFileInfo(folderCNum, cinfo)
  }
}

function validateCinfoFileInfo(cNum: number, cinfo: CJson.Collection) {
  // todo: implement this
}

export function validateCinfoNoReading(cNum: number, cinfo: CJson.Collection) {

  if (cinfo == null || typeof cinfo !== 'object') {
    throw new Error("No cinfo.")
  }

  // Check that no extra fields exist.
  const requiredFields = [
    "title", "description", "indexDescription", "posted",
    "indexThumbnail", "cNum", "ready", "images", "zoomPoints"
  ]
  const optionalFields = [
    "order", "building", "modified",
  ]
  let extraFields: string[] = []
  Object.keys(cinfo).forEach(field => {
    if (!requiredFields.includes(field) && !optionalFields.includes(field)) {
      extraFields.push(field)
    }
  })
  if (extraFields.length > 0) {
    throw new Error(`Cinfo has extra fields: ${extraFields.join(", ")}.`)
  }

  // Check that all required fields exist.
  let missingFields: string[] = []
  requiredFields.forEach(field => {
    if (!(field in cinfo)) {
      missingFields.push(field)
    }
  })
  if (missingFields.length > 0) {
    throw new Error(`Cinfo missing required fields: ${missingFields.join(", ")}.`)
  }

  // Check that the cNum number matches the folder cNum.
  if (cinfo.cNum !== cNum)
    throw new Error(`Cinfo cNum (${cinfo.cNum}) does not match folder number (${cNum}).`)

  // Check that ready collections have non-empty fields.
  const nonEmptyFields = ["title", "description",
    "indexDescription", "posted"]
  if (cinfo.ready) {
    let emptyFields: string[] = []
    nonEmptyFields.forEach(field => {
      if (cinfo[field as keyof CJson.Collection] === "") {
        emptyFields.push(field)
      }
    })
    if (emptyFields.length > 0) {
      throw new Error(`Cinfo ready collection has empty fields: ${emptyFields.join(", ")}.`)
    }
  }

  // Validate the images field.
  validateCinfoImages(cNum, cinfo, cinfo.ready)

  // Validate the zoomPoints when they exist.
  // They must exist when the collection is ready and not building.
  const zpKeyCount = Object.keys(cinfo.zoomPoints).length
  if (cinfo.ready && zpKeyCount == 0 && !("building" in cinfo)) {
    throw new Error("Cinfo zoomPoints are required for non-building, ready collections.")
  }
  // Validate the zoomPoints when they exist.
  if (zpKeyCount > 0) {
    validateCinfoZoomPoints(cinfo.images.length, cinfo.zoomPoints);
  }

  // todo: implement these checks:
  // If the order field exists, the list has 16 numbers and each
  // number is in the images list.

  // If building exists, it should be true.

}

function validateCinfoZoomPoints(numImages: number,
  zoomPoints: CJson.ZoomPoints) {
  // Validate the zoomPoints.

  // Each zoomPoint key must be in the form wxh where w and h
  // are integers.
  Object.keys(zoomPoints).forEach(key => {
    const widthHeight = key.split("x");
    if (widthHeight.length != 2) {
      throw new Error(`Cinfo zoomPoints key ${key} is not in wxh format.`);
    }
    const width = parseInt(widthHeight[0]);
    const height = parseInt(widthHeight[1]);
    if (isNaN(width) || isNaN(height) || width <= 0 || height <= 0) {
      throw new Error(`Invalid zoomPoints key ${key}.`);
    }
  });

  // Each array of zoom points must have the same number of
  // elements as the number of images in the collection.
  Object.entries(zoomPoints).forEach(([key, zpArray]) => {
    if (zpArray.length !== numImages) {
      throw new Error(`Cinfo zoomPoints ${key} has ${zpArray.length} elements, expected ${numImages}.`);
    }
  });
}

// When modified is true there might be unused images or the tin thumbnail might be wrong.

// Read files on disk and:
// Make sure the preview dimensions make the width and height specified.
// Make sure the thumbnail is 480 by 480
// Make sure the images are jpegs.
// Make sure there are not extra files in the folder other than the collection. cjson, previews, thumbnails, images.html, thumbnails.html.
// Make sure the file sizes match "size" and "tsize".
// Make sure the tin thumbnail exists.

function validateCinfoImages(cNum: number, cinfo: CJson.Collection,
  ready: boolean) {
  // Validate the images field of the cinfo.

  if (cinfo.images.length == 0) {
    return
  }

  // Check that each image object has the required fields.
  const imageRequiredFields = [
    "iPreview", "iThumbnail", "title", "description",
    "width", "height", "size", "sizet", "uniqueId"]

  // Check that the image does not have extra fields.
  cinfo.images.forEach((image, ix) => {
    const imageFields = Object.keys(image)
    let extraImageFields: string[] = []
    imageFields.forEach(field => {
      if (!imageRequiredFields.includes(field)) {
        extraImageFields.push(field)
      }
    })
    if (extraImageFields.length > 0) {
      throw new Error(`Cinfo image ${ix} has extra fields: ${extraImageFields.join(", ")}.`)
    }
  });

  // Check that the image has all required fields.
  cinfo.images.forEach((image, ix) => {
    let missingImageFields: string[] = []
    imageRequiredFields.forEach(field => {
      if (!(field in image)) {
        missingImageFields.push(field)
      }
    })
    if (missingImageFields.length > 0) {
      throw new Error(`Cinfo image ${ix} missing required fields: ${missingImageFields.join(", ")}.`)
    }
  });

  cinfo.images.forEach((image, ix) => {
    validateCinfoImage(cNum, ix, cinfo.ready, image)
  });
}

export function validateImageName(cNum: number, ix: number,
  nameType: string, name: string) {
  // Check that the image name has the form c2-1-p.jpg or c2-1-t.jpg.
  const nameObj = parseImageName(name)
  if (nameObj == null)
    throw new Error(`Image ${ix}: invalid ${nameType} name: ${name}`);
  if (nameObj.cNum !== cNum)
    throw new Error(`Image ${ix}: Invalid cNum: \
got: ${nameObj.cNum} expected: ${cNum}.`);
  if (nameObj.pt !== nameType)
    throw new Error(`Image ${ix}: Invalid ${nameType} type: (${nameObj.pt})`);
}

export function validateCinfoImage(cNum: number, ix: number,
  ready: boolean, image: CJson.Image) {
  // Validate a single image in the cinfo.

  validateImageName(cNum, ix, "p", image.iPreview)
  validateImageName(cNum, ix, "t", image.iThumbnail)

  // Check that iPreview and iThumbnail have the same image number.
  const previewObj = parseImageName(image.iPreview)
  const thumbObj = parseImageName(image.iThumbnail)
  if (previewObj?.iNum !== thumbObj?.iNum) {
    throw new Error(`Image ${ix}: \
different inum: iPreview ${image.iPreview}, iThumbnail ${image.iThumbnail}`)
  }

  // Check that width and height greater than or equal to previewMinDim = 933
  const previewMinDim = 933
  if (image.width < previewMinDim) {
    throw new Error(`Image ${ix}: preview width must be >= ${previewMinDim}: \
got: ${image.width}.`)
  }
  if (image.height < previewMinDim) {
    throw new Error(`Image ${ix}: preview height must be >= ${previewMinDim}: \
got: ${image.height}.`)
  }

  if (ready && (image.description == "")) {
    throw new Error(`Image ${ix}: description is required for ready collections.`)
  }
}

// Check that zoomPoints has at least two fields.
// Check that zoomPoints fields have wxh format.
// Check that zoomPoints list have the same number of elements as the collection.

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

    // Read and validate the cjson file.
    const cinfo: CJson.Collection = readAndValidateCjson(cjsonFile)

    let totalSize = 0
    let iNumList: number[] = []
    for (const image of cinfo.images) {
      totalSize += image.size + image.sizet
      const imageName = parseImageName(image.iPreview)
      if (imageName == null)
        throw new Error(`Error: not a valid image iPreview: ${image.iPreview}`);
      iNumList.push(imageName.iNum)
    }

    const indexCollection: CJson.IndexCollection = {
      cNum: cinfo.cNum,
      building: cinfo.building ?? false,
      ready: cinfo.ready,
      title: cinfo.title,
      modified: cinfo.modified ?? false,
      indexDescription: cinfo.indexDescription,
      iThumbnail: cinfo.indexThumbnail,
      posted: cinfo.posted,
      iCount: cinfo.images.length,
      totalSize: totalSize,
      iNumList: iNumList,
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
