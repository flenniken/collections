// Test gulpfile.ts

import * as fs from 'fs';
import * as path from 'path';
import { runSuite, testThrow, test, gotExpected } from "./sweet-tester";
import {
  ImageName,
  UnusedPathsAndImages,
  parseImageName,
  getCollectionImages,
  getUnusedImageFiles,
  removeUnusedImages,
} from './gulpfile';

if (!process.env.coder_env) {
  console.log("Run from the Collection's docker environment.")
  process.exit(1);
}

function getImageNumbers(cNum: number, images: CJson.Image[]): number[] {
  // Convert the list of images to a list of image numbers.

  let imageNumbers: number[] = []
  images.forEach((image: CJson.Image) => {
    const basename = path.basename(image.url)
    const imageName = parseImageName(basename)
    if (imageName == null)
      throw new Error("Invalid ${image.url}")
    if (imageName.cNum != cNum)
      throw new Error("The collection ${cNum} is not part of the url: ${image.url}")
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
      url: `c${cNum}-${iNum}-p.jpg`,
      thumbnail: `c${cNum}-${iNum}-t.jpg`,
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

  const imageNumbers = getImageNumbers(cNum, images)
  gotExpected(imageNumbers, eImageNumbers)
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
    [12,12,15,15,18,18,2,2,4,4,6,6], [1,5,3,7,11,8,16,9,10,14,13,17])
}

function testGulpfile() {
  // Run the test suite for the gulpfile.

  console.log("Test gulpfile.ts")

  runSuite(parseImageNameSuite)
  runSuite(getCollectionImagesSuite)
  runSuite(getUnusedImageFilesSuite)
  runSuite(removeUnusedImagesSuite)
}

testGulpfile()
