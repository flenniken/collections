// Test gulpfile.ts


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
      sizet: 0,
      uniqueId: ""
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
  testThrow("Image 0: invalid p name: bogus.jpg", fn, 4, 0, 'p', 'bogus.jpg')
  testThrow("Image 0: invalid p name: c4-1-q.jpg", fn, 4, 0, 'p', 'c4-1-q.jpg')
  testThrow("Image 0: invalid p name: c4-1-q.jpeg", fn, 4, 0, 'p', 'c4-1-q.jpeg')
  testThrow("Image 0: Invalid cNum: got: 5 expected: 4.", fn, 4, 0, 'p', 'c5-1-p.jpg')
}

function createTestImage(cNum: number, ix: number): CJson.Image {
  // Create a valid test image object for the given collection and
  // image index.

  const image: CJson.Image = {
    iPreview: `c${cNum}-${ix}-p.jpg`,
    iThumbnail: `c${cNum}-${ix}-t.jpg`,
    title: `Title ${ix}`,
    description: `Description ${ix}`,
    width: 933,
    height: 933,
    size: 123456,
    sizet: 20987,
    uniqueId: `uniqueId ${ix}`
  }
  return image
}

function validateCinfoImageSuite() {
  const fn = validateCinfoImage
  test(fn, 4, 0, false, createTestImage(4, 0))
  testThrow("Image 3: Invalid cNum: got: 4 expected: 5.", fn, 5, 3,
    false, createTestImage(4, 3))

  let image = createTestImage(4, 2)
  image.iPreview = "bogus.jpg"
  testThrow("Image 2: invalid p name: bogus.jpg", fn, 4, 2, false, image)

  image = createTestImage(4, 2)
  image.iThumbnail = "bogus.jpg"
  testThrow("Image 2: invalid t name: bogus.jpg", fn, 4, 2, false, image)

  image = createTestImage(4, 2)
  image.iThumbnail = "c4-0-t.jpg"
  let eMessage = "Image 2: different inum: iPreview c4-2-p.jpg, iThumbnail c4-0-t.jpg"
  testThrow(eMessage, fn, 4, 2, false, image)

  image = createTestImage(4, 2)
  image.width = 932
  eMessage = "Image 2: preview width must be >= 933: got: 932."
  testThrow(eMessage, fn, 4, 2, false, image)

  image = createTestImage(4, 2)
  image.height = 932
  eMessage = "Image 2: preview height must be >= 933: got: 932."
  testThrow(eMessage, fn, 4, 2, false, image)

  image = createTestImage(4, 2)
  image.title = ""
  image.description = ""
  test(fn, 4, 2, false, image)
  testThrow("Image 2: description is required for ready collections.", fn, 4, 2, true, image)

  image = createTestImage(4, 2)
  image.width = 0
  testThrow("Image 2: preview width must be >= 933: got: 0.", fn, 4, 2, true, image)

  image = createTestImage(4, 2)
  image.height = 932
  testThrow("Image 2: preview height must be >= 933: got: 932.", fn, 4, 2, true, image)
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

  message = "The collection is missing required fields: title, description, \
indexDescription, posted, indexThumbnail, cNum, ready, images, zoomPoints."
  testThrow(message, fn, 4, {})

  message = "The collection is missing required fields: description, \
indexThumbnail, zoomPoints."
  testThrow(message, fn, 4,
    {cNum: 4, title: "Title", indexDescription: "Desc",
    posted: true, ready: true, images: []})

  message = "The collection has extra fields: bogus."
  testThrow(message, fn, 4, {bogus: 1})

  message = "Collection 5 does not match folder number 4."
  testThrow(message, fn, 4, createTestCinfo(
    {cNum: 5, numImages: 0}))

  message = "Image 0 has extra fields: bogus2."
  let cinfo = createTestCinfo({numImages: 1});
  (cinfo.images[0] as any).bogus2 = 1
  testThrow(message, fn, 4, cinfo)

  message = "Image 0 is missing required fields: iPreview."
  cinfo = createTestCinfo({numImages: 1});
  delete (cinfo.images[0] as any).iPreview
  testThrow(message, fn, 4, cinfo)

  message = "The ready collection has empty fields: title."
  cinfo = createTestCinfo({numImages: 1})
  cinfo.title = ""
  testThrow(message, fn, 4, cinfo)

  message = "The ready collection has empty fields: title, description, indexDescription, posted."
  cinfo = createTestCinfo({numImages: 1})
  cinfo.title = ""
  cinfo.description = ""
  cinfo.indexDescription = ""
  cinfo.posted = ""
  testThrow(message, fn, 4, cinfo)

  // The building field must be true when it exists.
  message = "The collection building field must be true when it exists."
  cinfo = createTestCinfo({numImages: 1, building: false})
  testThrow(message, fn, 4, cinfo)

  // The modified field must be true when it exists.
  message = "The collection modified field must be true when it exists."
  cinfo = createTestCinfo({numImages: 1, building: true, modified: false})
  testThrow(message, fn, 4, cinfo)

  // Non-modified ready collections must not have an order field.
  message = "The collection order field is not allowed for non-building ready collections."
  cinfo = createTestCinfo({numImages: 1, order: [0],
    zoomPointKeys: ["933x432", "432x933"]})
  testThrow(message, fn, 4, cinfo)
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

}

testGulpfile()
