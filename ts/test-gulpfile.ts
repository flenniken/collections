// test-gulpfile.ts used to test gulpfile.ts

// Run it:
// scripts/test-gulpfile

import * as path from 'path';
import { runSuite, testThrow, test, gotExpected } from "./sweet-tester";
import {
  ImageName,
  UnusedPathsAndImages,
  parseImageName,
  getCollectionImages,
  getUnusedImageFiles,
  removeUnusedImages,
  validateCinfoNoReading,
  validateCinfoImage,
  validateImageName,
  getJpegDimensions,
  getImagePath,
  readCJsonFile,
  validateImageDisk
} from './gulpfile';

if (!process.env.coder_env) {
  console.log("Run from the Collection's docker environment.")
  process.exit(1);
}

function getImageNumbers(cNum: number, images: CJson.Image[]): number[] {
  // Convert the list of images to a list of image numbers.

  let imageNumbers: number[] = []
  images.forEach((image: CJson.Image) => {
    const imageName = parseImageName(image.iPreview)
    if (imageName == null)
      throw new Error(`Invalid image basename: ${image.iPreview}`)
    if (imageName.cNum != cNum)
      throw new Error(`The collection ${cNum} is not part of the preview: ${image.iPreview}`)
    imageNumbers.push(imageName.iNum)
  })
  return imageNumbers
}

function getNumbersFromPaths(cNum: number, paths: string[]): number[] {
  // Convert the list of file paths to a list of image numbers.  Each
  // file has a number, so you will see pairs of numbers for preview
  // and thumbnails. The specified cNum is the collection number. Each
  // image filename must contain it. Non-image files are skipped.

  let imageNumbers: number[] = []
  paths.forEach((fullPath: string) => {
    // Parse the path name.
    const basename = path.basename(fullPath)
    const imageName = parseImageName(basename)

    // Skip non-image files.
    if (imageName === null) {
      return
    }

    // Each image file must be part of the collection.
    if (imageName.cNum !== cNum) {
      throw new Error(`Collection number ${imageName.cNum} does not match ${cNum}.`)
    }

    imageNumbers.push(imageName.iNum)
  })
  return imageNumbers
}

function fakeImagesFromNumbers(cNum: number, iNums: number[]): CJson.Image[] {
  // Create a list of fake images from the given image numbers used
  // for testing.

  const images: CJson.Image[] = []
  iNums.forEach(iNum => {
    const image: CJson.Image = {
      iPreview: `c${cNum}-${iNum}-p.jpg`,
      iThumbnail: `c${cNum}-${iNum}-t.jpg`,
      title: `Image ${iNum}`,
      description: `Description for image ${iNum}`,
      width: 0,
      height: 0,
      size: 0,
      sizet: 0
      // uniqueId: ""
    }
    images.push(image)
  })
  return images
}

function basenamesFromNumbers(cNum: number, iNums: number[]): string[] {
  // Create a list of preview image basenames from the given image
  // numbers.

  const basenames: string[] = []
  iNums.forEach(iNum => {
    const basename = `c${cNum}-${iNum}-p.jpg`
    basenames.push(basename)
  })
  return basenames
}

function testParseImageName(basename: string, eImageName: ImageName | null) {
  // Test the parseBasename function.  The basename is in the form
  // c1-2-p.jpg or c1-2-t.jpg. The expected values are the collection
  // number, image number and type.

  const imageName = parseImageName(basename)
  const message = `parseImageName(${basename})`
  gotExpected(imageName, eImageName, message)
}

function parseImageNameSuite() {
  test(testParseImageName, 'c1-2-p.jpg', {cNum: 1, iNum: 2, pt: 'p'})
  test(testParseImageName, 'c1-2-t.jpg', {cNum: 1, iNum: 2, pt: 't'})
  test(testParseImageName, 'c1-2-q.jpg', null)
  test(testParseImageName, 'c1-2-p.jpgg', null)
  test(testParseImageName, '/images/c1/c1-2-t.jpg', null)
}

function testGetCollectionImages(cNum: number, eImageNumbers: number[]) {
  // Test getCollectionImages.

  const images = getCollectionImages(cNum)

  const msg = `cNum: ${cNum}, eImageNumbers: ${eImageNumbers}`
  const imageNumbers = getImageNumbers(cNum, images)
  gotExpected(imageNumbers, eImageNumbers, msg)
}

function getCollectionImagesSuite() {
  test(testGetCollectionImages, 1, [5,3,1,4,7,2,6,8])
  test(testGetCollectionImages, 2, [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16])
  test(testGetCollectionImages, 3, [1,5,3,7,11,8,16,9,10,14,13,17])
}

function testGetUnusedImageFiles(cNum: number, usedNumbers: number[],
    allNumbers: number[], eUnusedNumbers: number[]) {
  // Test getUnusedImageFiles.

  // * allNumbers is a list of numbers corresponding all image files
  //   in a folder.

  // * eUnusedNumbers is the expected list of unused images.

  const images = fakeImagesFromNumbers(cNum, usedNumbers)
  const allFiles = basenamesFromNumbers(cNum, allNumbers)

  const unusedImages = getUnusedImageFiles(images, allFiles)

  const eUnusedImages = basenamesFromNumbers(cNum, eUnusedNumbers)
  gotExpected(unusedImages, eUnusedImages)

  const imageNumbers = getImageNumbers(cNum, images)
  gotExpected(imageNumbers, usedNumbers)
}

function getUnusedImageFilesSuite() {
  test(testGetUnusedImageFiles, 99, [4, 5], [4, 5], [])
  test(testGetUnusedImageFiles, 99, [1, 2], [1, 2, 3, 4], [3, 4])
  test(testGetUnusedImageFiles, 99, [4, 5], [1, 2, 3, 4, 5], [1, 2, 3])
}

function testRemoveUnusedImages(cNum: number, shouldDelete: boolean,
    eUnusedNumbers: number[], eImageNumbers: number[]) {
  // Test removeUnusedImages.

  // * eUnusedNumbers is the expected list of numbers corresponding to
  //   the unused image files. Each file has a number, so you will see
  //   pairs of numbers for preview and thumbnails

  // * eImageNumbers is the expected list of numbers corresponding to
  //   the image files in the collection. Each image is guarantied to have a preview and
  //   thumbnail with the same number. So one number represents both.

  const unusedPathsAndImages = removeUnusedImages(cNum, shouldDelete)

  const unusedNumbers = getNumbersFromPaths(cNum, unusedPathsAndImages.unusedPaths)
  gotExpected(unusedNumbers, eUnusedNumbers, "unused numbers")

  const imageNumbers = getImageNumbers(cNum, unusedPathsAndImages.images)
  gotExpected(imageNumbers, eImageNumbers, "image numbers")
}

function removeUnusedImagesSuite() {
  test(testRemoveUnusedImages, 1, false, [], [5,3,1,4,7,2,6,8])
  test(testRemoveUnusedImages, 2, false, [],
    [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16])
  test(testRemoveUnusedImages, 3, false,
    [], [1,5,3,7,11,8,16,9,10,14,13,17])
}

interface CinfoOptions {
  cNum?: number;
  numImages?: number;
  zoomPointKeys?: string[];
  order?: number[];
  building?: boolean;
  modified?: boolean;
  ready?: boolean;
}
  // Create a valid test cinfo object for the given collection number.
  // * cNum is the collection number.
  // * numImages is the number of images in the collection.
  // * zoomPointKeys is an array of wxh keys, e.g. ["800x600", "600x800"].

function createTestCinfo(options?: CinfoOptions): CJson.Collection {
  // Create a valid test cinfo object for testing.

  const cNum = options?.cNum ?? 4

  let cinfo: CJson.Collection = {
    title: `Collection ${cNum} Title`,
    description: "Full description.",
    indexDescription: "Index description.",
    indexThumbnail: `c${cNum}-1-t.jpg`,
    posted: "2025-07-12",
    cNum: cNum,
    ready: true,
    images: [],
    zoomPoints: {}
  }

  // Create the images array.
  const numImages = options?.numImages ?? 0
  if (numImages > 0) {
    cinfo.images = Array.from({length: numImages}, (_, i) =>
      createTestImage(cNum, i))
  }

  // Create the zoomPoints object.
  const zoomPointKeys = options?.zoomPointKeys ?? []
  if (zoomPointKeys.length > 0) {
    zoomPointKeys.forEach(wxh => {
      cinfo.zoomPoints[wxh] = Array.from({length: numImages}, (_, i) => ({
        scale: 1.0,
        tx: 0,
        ty: 0
      }))
    })
  }

  if (options?.ready !== undefined)
    cinfo.ready = options.ready
  if (options?.building !== undefined)
    cinfo.building = options.building
  if (options?.modified !== undefined)
    cinfo.modified = options.modified

  // Set the order field when it is specified.
  if (options?.order !== undefined) {
    cinfo.order = options.order
  }
  return cinfo
}

function validateImageNameSuite() {
  const fn = validateImageName
  test(fn, 4, 0, "p", 'c4-1-p.jpg')
  test(fn, 4, 0, 't', 'c4-1-t.jpg')
  testThrow("Collection 4 image 0: invalid p name: bogus.jpg", fn, 4, 0, 'p', 'bogus.jpg')
  testThrow("Collection 4 image 0: invalid p name: c4-1-q.jpg", fn, 4, 0, 'p', 'c4-1-q.jpg')
  testThrow("Collection 4 image 0: invalid p name: c4-1-q.jpeg", fn, 4, 0, 'p', 'c4-1-q.jpeg')
  testThrow("Collection 4 image 0: Invalid cNum: got: 5 expected: 4.", fn, 4, 0, 'p', 'c5-1-p.jpg')
}

function createTestImage(cNum: number, ix: number,
  width?: number, height?: number, size?: number, sizet?: number): CJson.Image {
  // Create a valid test image object for the given collection and
  // image index.

  let imageWidth
  if (width === undefined) {
    imageWidth = 933
  }
  else {
    imageWidth = width
  }

  let imageHeight
  if (height === undefined) {
    imageHeight = 933
  }
  else {
    imageHeight = height
  }

  let imageSize
  if (size === undefined) {
    imageSize = 123456
  }
  else {
    imageSize = size
  }

  let imageSizet
  if (sizet === undefined) {
    imageSizet = 20987
  }
  else {
    imageSizet = sizet
  }

  const image: CJson.Image = {
    iPreview: `c${cNum}-${ix}-p.jpg`,
    iThumbnail: `c${cNum}-${ix}-t.jpg`,
    title: `Title ${ix}`,
    description: `Description ${ix}`,
    width: imageWidth,
    height: imageHeight,
    size: imageSize,
    sizet: imageSizet,
  }
  return image
}

function validateCinfoImageSuite() {
  const fn = validateCinfoImage
  test(fn, 4, 0, false, createTestImage(4, 0))
  testThrow("Collection 5 image 3: Invalid cNum: got: 4 expected: 5.", fn, 5, 3,
    false, createTestImage(4, 3))

  let image = createTestImage(4, 2)
  image.iPreview = "bogus.jpg"
  testThrow("Collection 4 image 2: invalid p name: bogus.jpg", fn, 4, 2, false, image)

  image = createTestImage(4, 2)
  image.iThumbnail = "bogus.jpg"
  testThrow("Collection 4 image 2: invalid t name: bogus.jpg", fn, 4, 2, false, image)

  image = createTestImage(4, 2)
  image.iThumbnail = "c4-0-t.jpg"
  let eMessage = "Collection 4 image 2: different inum: iPreview c4-2-p.jpg, iThumbnail c4-0-t.jpg"
  testThrow(eMessage, fn, 4, 2, false, image)

  image = createTestImage(4, 2)
  image.width = 932
  eMessage = "Collection 4 image 2: preview width must be >= 933: got: 932."
  testThrow(eMessage, fn, 4, 2, false, image)

  image = createTestImage(4, 2)
  image.height = 932
  eMessage = "Collection 4 image 2: preview height must be >= 933: got: 932."
  testThrow(eMessage, fn, 4, 2, false, image)

  image = createTestImage(4, 2)
  image.title = ""
  image.description = ""
  test(fn, 4, 2, false, image)
  testThrow("Collection 4 image 2: description is required for ready collections.", fn, 4, 2, true, image)

  image = createTestImage(4, 2)
  image.width = 0
  testThrow("Collection 4 image 2: preview width must be >= 933: got: 0.", fn, 4, 2, true, image)

  image = createTestImage(4, 2)
  image.height = 932
  testThrow("Collection 4 image 2: preview height must be >= 933: got: 932.", fn, 4, 2, true, image)
}

function validateCinfoNoReadingSuite() {
  const fn = validateCinfoNoReading

  test(fn, 4, createTestCinfo({building: true}))
  test(fn, 4, createTestCinfo({building: true, numImages: 1}))
  test(fn, 4, createTestCinfo({numImages: 1,
    zoomPointKeys: ["933x432", "432x933"]}))

  let message = "No cinfo."
  testThrow(message, fn, 4, null)
  testThrow(message, fn, 4, 8)

  message = "The collection 4 is missing required fields: title, description, \
indexDescription, posted, indexThumbnail, cNum, ready, images, zoomPoints."
  testThrow(message, fn, 4, {})

  message = "The collection 4 is missing required fields: description, \
indexThumbnail, zoomPoints."
  testThrow(message, fn, 4,
    {cNum: 4, title: "Title", indexDescription: "Desc",
    posted: true, ready: true, images: []})

  message = "Collection 4 has extra fields: bogus."
  testThrow(message, fn, 4, {bogus: 1})

  message = "Collection 5 does not match folder number 4."
  testThrow(message, fn, 4, createTestCinfo(
    {cNum: 5, numImages: 0}))

  message = "Collection 4 image 0 has extra fields: bogus2."
  let cinfo = createTestCinfo({numImages: 1});
  (cinfo.images[0] as any).bogus2 = 1
  testThrow(message, fn, 4, cinfo)

  message = "Collection 4 image 0 is missing required fields: iPreview."
  cinfo = createTestCinfo({numImages: 1});
  delete (cinfo.images[0] as any).iPreview
  testThrow(message, fn, 4, cinfo)

  message = "The ready collection 4 has empty fields: title."
  cinfo = createTestCinfo({numImages: 1})
  cinfo.title = ""
  testThrow(message, fn, 4, cinfo)

  message = "The ready collection 4 has empty fields: title, description, \
indexDescription, posted."
  cinfo = createTestCinfo({numImages: 1})
  cinfo.title = ""
  cinfo.description = ""
  cinfo.indexDescription = ""
  cinfo.posted = ""
  testThrow(message, fn, 4, cinfo)

  // The building field must be true when it exists.
  message = "The collection 4 building field must be true when it exists."
  cinfo = createTestCinfo({numImages: 1, building: false})
  testThrow(message, fn, 4, cinfo)

  // The modified field must be true when it exists.
  message = "The collection 4 modified field must be true when it exists."
  cinfo = createTestCinfo({numImages: 1, building: true, modified: false})
  testThrow(message, fn, 4, cinfo)

  // Non-modified ready collections must not have an order field.
  message = "The collection 4 order field is not allowed for non-building ready collections."
  cinfo = createTestCinfo({numImages: 1, order: [0],
    zoomPointKeys: ["933x432", "432x933"]})
  testThrow(message, fn, 4, cinfo)
}

function validateCollections() {
  // Validate the collections in the images folder.

  // Read the cinfo for each collection and validate it.
  const cNums = [1, 2, 3, 4, 5]
  const fn = validateCinfoNoReading
  cNums.forEach(cNum => {
    const cjsonFile = `dist/images/c${cNum}/c${cNum}.json`
    const cinfo = readCJsonFile(cjsonFile)
    test(fn, cNum, cinfo)
  })
}

function testGetImagePath(basename: string, ePath: string) {
  const path = getImagePath(basename)
  gotExpected(path, ePath)
}

function getImagePathSuite() {
  const fn = testGetImagePath

  test(fn, "c1-1-p.jpg", "dist/images/c1/c1-1-p.jpg")
  test(fn, "c4-10-p.jpg", "dist/images/c4/c4-10-p.jpg")
  testThrow("Invalid basename name: bogus.jpg", fn, "bogus.jpg")
  test(fn, "c4-10-t.jpg", "dist/images/c4/c4-10-t.jpg")
}

function testGetJpegDimensions(filename: string, eDims: { width: number, height: number }) {
  // Test the getJpegDimensions function.

  const dims = getJpegDimensions(filename)
  gotExpected(dims, eDims)
}

function getJpegDimensionsSuite() {
  const fn = testGetJpegDimensions

  test(fn, "dist/images/c1/c1-1-p.jpg", {"width":3024,"height":4032})
  test(fn, "dist/images/c1/c1-1-t.jpg", {"width":480,"height":480})
  testThrow("Invalid JPEG file: dist/icons/icon-128.png", fn, "dist/icons/icon-128.png")
  testThrow("Unable to read: bogusfile", fn, "bogusfile")
}

function validateImageDiskSuite() {
  const fn = validateImageDisk

  test(fn, createTestImage(1, 2, 4032, 3024, 3871458, 70466))
  testThrow("c1-2-p.jpg dimensions (4032x3024) do not match cjson: (4031x3024).",
    fn, createTestImage(1, 2, 4031, 3024, 3871458, 70466))
  testThrow("c1-2-p.jpg file size (3871458 bytes) does not match cjson: 12345 bytes.",
    fn, createTestImage(1, 2, 4032, 3024, 12345, 70466))
  testThrow("c1-2-t.jpg file size (70466 bytes) does not match cjson: 888 bytes.",
    fn, createTestImage(1, 2, 4032, 3024, 3871458, 888))

  // exif orientation swap
  test(fn, createTestImage(8, 1, 3024, 4032, 1578565, 63852))
}

function testGulpfile() {
  // Run the test suite for the gulpfile.

  console.log("Test gulpfile.ts")

  runSuite(parseImageNameSuite)
  runSuite(getCollectionImagesSuite)
  runSuite(getUnusedImageFilesSuite)
  runSuite(removeUnusedImagesSuite)
  runSuite(validateImageNameSuite)
  runSuite(validateCinfoImageSuite)
  runSuite(validateCinfoNoReadingSuite)
  runSuite(validateCollections)
  runSuite(getImagePathSuite)
  runSuite(getJpegDimensionsSuite)
  runSuite(validateImageDiskSuite)
}

testGulpfile()
