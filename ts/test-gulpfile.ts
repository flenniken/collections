// Test gulpfile.ts

import { runSuite, testThrow, test, gotExpected } from "./sweet-tester";
import * as fs from 'fs';
import * as path from 'path';
// import { getUnusedImages } from 'tmp/gulpfile';

const tempFolder = '/home/coder/collections/tmp/testGulpFile/images'

if (!process.env.coder_env) {
  console.log("Run from the Collection's docker environment.")
  process.exit(1);
}

function createTestCjsonFile(folder: string, cNum: number,
    usedImages: number[]): string {
  // Create a test cjson file in the given folder with the given
  // collection number and images list based on the given image numbers.
  // Return the filename of the cjson file.
  const cinfo = {
    collection: cNum,
    discription: `Description for collection ${cNum}`,
    images: usedImages.map(iNum => {
      return {
        // todo: create function to make the url.
        url: `c${cNum}-${iNum}-p.jpg`,
        thumbnail: `c${cNum}-${iNum}-t.jpg`,
        title: `Image ${iNum}`,
        description: `Description for image ${iNum}`,
     }
    })
  }
  const cjson = JSON.stringify(cinfo, null, 2)
  const cjsonFilename = path.join(folder, `${cNum}.json`)
  fs.writeFileSync(cjsonFilename, cjson, 'utf8')
  return cjsonFilename
}

function createTempFolder(cNum: number): string {
    // Create a temp image folder for the given collection number. The
    // folder name is based on the collection number.
    // The image folder is created in the tempFolder directory.
    const folder = path.join(tempFolder, `c${cNum}`)
    fs.mkdirSync(folder, { recursive: true });
    return folder;
  }

  function removeFolder(folder: string) {
    // Remove the folder and its contents.
    fs.rmSync(folder, { recursive: true });
  }

function createTestImageFolder(cNum: number, usedNumbers: number[],
    unusedNumbers: number[]): string {
  // Create a temp image folder with the given collection number.
  // Inside the folder create a cjson file that contains fake images
  // with the names based on the image numbers. Create unused fake
  // images with names based on the unused numbers.

  // Create the test folder then create a cjson file inside it.
  const testFolder = createTempFolder(cNum)
  const cjsonFilename = createTestCjsonFile(testFolder, cNum, usedNumbers)

  // Create the fake used images using the standard pattern e.g.:
  // c1-2-t.jpg, c1-2-p.jpg
  usedNumbers.forEach(iNum => {
    let filename = path.join(testFolder, `c${cNum}-${iNum}-p.jpg`)
    fs.writeFileSync(filename, 'fake image ${iNum}', 'utf8')
    filename = path.join(testFolder, `c${cNum}-${iNum}-t.jpg`)
    fs.writeFileSync(filename, 'fake thumbnail ${iNum}', 'utf8')  })

  // Create the fake unused images using the standard pattern.
  unusedNumbers.forEach(iNum => {
    let filename = path.join(testFolder, `c${cNum}-${iNum}-p.jpg`)
    fs.writeFileSync(filename, 'fake image ${iNum}', 'utf8')
    filename = path.join(testFolder, `c${cNum}-${iNum}-t.jpg`)
    fs.writeFileSync(filename, 'fake thumbnail ${iNum}', 'utf8')  })

  return testFolder
}

// function imagesToNumbers(gotUnusedImages: string[]): number[] {
//   // Convert the list of image basenames to a list of numbers.
//   // The basenames are in the form c1-2-t.jpg or c1-2-p.jpg.
//   // If either name, t or p exists, the number is returned but only one.
//   // e.g. c1-2-t.jpg -> 2 and c1-2-p.jpg -> 2

// }

//   function testGetUnusedImages(usedNumbers: number[], unusedNumbers: number[]) {
//     // Test the getUnusedImages function.  The used numbers are the
//     // images in the cjson file. The unused numbers are the images
//     // that are in the folder but not in the cjson file.
//     const folder99 = createTestImageFolder(99, usedNumbers, unusedNumbers)
//     const gotUnusedBasenames = getUnusedImages(99, folder99)
//     const gotUnusedNumbers = imagesToNumbers(gotUnusedBasenames)
//     removeFolder(folder99)
//     gotExpected(gotUnusedNumbers, unusedNumbers)
//   }

function getUnusedImagesSuite() {
  // test(testGetUnusedImages, [1, 2], [], [])
  // test(testGetUnusedImages, [1, 2, 3], [], [])
  // test(testGetUnusedImages, [1, 3], [2,4], [2,4])
  // test(testGetUnusedImages, [2, 4], [3,5], [1])
  // test(testGetUnusedImages, [4, 2, 5], [1,3], [1])
}

function testCreateTempFolder(cNum: number, leaveFolder?: boolean) {
  // Test the createTempFolder function.  The folder is created in the
  // tmp/testGulpFile/images directory. The folder name is based on the
  // collection number. It leaveFolder is false, the folder is removed after the test.

  const folder = createTempFolder(cNum)
  const expectedFolder = path.join(tempFolder, `c${cNum}`)
  gotExpected(folder, expectedFolder)
  // Check that the folder was created.
  if (!fs.existsSync(folder))
    throw new Error(`Temporary folder ${folder} was not created.`);

  // Optionally remove the folder after the test.
  if (!leaveFolder) {
    removeFolder(folder)
    // Check that the folder was removed.
    if (fs.existsSync(folder)) {
      throw new Error(`Temporary folder ${folder} was not removed.`);
    }
  }
}

function createTempFolderSuite() {
  test(testCreateTempFolder, 1)
}

function urlToNumber(url: string): number {
  // Convert the url basename to a number.  The url is in the form
  // c1-2-p.jpg and its corresponding number is 2.
  const match = url.match(/c\d+-(\d+)-p\.jpg/)
  if (match && match.length > 1) {
    return parseInt(match[1])
  }
  throw new Error(`Invalid image url: ${url}.`)
}

function testCreateTestCjson(cNum: number, usedImages: number[]) {
  const folder = createTempFolder(cNum)
  const cjsonFilename = createTestCjsonFile(folder, cNum, usedImages)
  const expectedFilename = path.join(folder, `${cNum}.json`)
  gotExpected(cjsonFilename, expectedFilename)

  // Check that the cjson file was created.
  if (!fs.existsSync(cjsonFilename))
    throw new Error(`Cjson file ${cjsonFilename} was not created.`);

  // Read the cjson file and make a list of the image numbers. Convert
  // the url basename to a number.  The url is in the form c1-2-p.jpg
  // and its corresponding number is 2.
  const cinfo = JSON.parse(fs.readFileSync(cjsonFilename, 'utf8'))
  let gotImages = cinfo.images.map((image: any) => {
    const iNum = urlToNumber(image.url)
    return iNum
  })
  // Check that the image numbers are the same as the used images.
  gotExpected(gotImages, usedImages)

  // Remove the folder after the test.
  removeFolder(folder)
}

function createTestCjsonFileSuite() {
  // Test the createTestCjsonFile function.
  test(testCreateTestCjson, 1, [1, 2])
  test(testCreateTestCjson, 2, [1, 2, 3])
}

function testUrlToNumber(url: string, expected: number) {
  const gotNumber = urlToNumber(url)
  const message = `urlToNumber(${url})`
  gotExpected(gotNumber, expected, message)
}

function urlToNumberSuite() {
  // Test the urlToNumber function.
  test(testUrlToNumber, 'c1-2-p.jpg', 2)
  test(testUrlToNumber, 'c1-3-p.jpg', 3)
  testThrow("Invalid image url: asdf.", testUrlToNumber, 'asdf')
  testThrow("Invalid image url: c1-3-t.jpg.", testUrlToNumber, 'c1-3-t.jpg')
}

// function createTestImageFolder(cNum: number, usedNumbers: number[],
//   unusedNumbers: number[]): string {

function testCreateTestImageFolder(cNum: number, usedNumbers: number[],
  unusedNumbers: number[]) {

  const testFolder = createTestImageFolder(cNum, usedNumbers, unusedNumbers)

  const expectedFolder = path.join(tempFolder, `c${cNum}`)
  gotExpected(testFolder, expectedFolder)

  // Check that the folder was created.
  if (!fs.existsSync(testFolder))
    throw new Error(`Temporary folder ${testFolder} was not created.`);

  // Check that the cjson file was created.
  const cjsonFilename = path.join(testFolder, `${cNum}.json`)
  if (!fs.existsSync(cjsonFilename))
    throw new Error(`Cjson file ${cjsonFilename} was not created.`);

  // Read the cjson file and make a list of the image numbers.
  const cinfo = JSON.parse(fs.readFileSync(cjsonFilename, 'utf8'))
  let gotImages = cinfo.images.map((image: any) => {
    const iNum = urlToNumber(image.url)
    return iNum
  })
  // Check that the image numbers are the same as the used images.
  gotExpected(gotImages, usedNumbers)

  // todo: make functions for the following
  // Check that the unused images are in the folder.
  unusedNumbers.forEach(iNum => {
    const filename = path.join(testFolder, `c${cNum}-${iNum}-p.jpg`)
    if (!fs.existsSync(filename))
      throw new Error(`Unused image ${filename} was not created.`);
    const filename2 = path.join(testFolder, `c${cNum}-${iNum}-t.jpg`)
    if (!fs.existsSync(filename2))
      throw new Error(`Unused image ${filename2} was not created.`);
  })
  // Check that the used images are in the folder.
  usedNumbers.forEach(iNum => {
    const filename = path.join(testFolder, `c${cNum}-${iNum}-p.jpg`)
    if (!fs.existsSync(filename))
      throw new Error(`Used image ${filename} was not created.`);
    const filename2 = path.join(testFolder, `c${cNum}-${iNum}-t.jpg`)
    if (!fs.existsSync(filename2))
      throw new Error(`Used image ${filename2} was not created.`);
  })
  // Remove the folder after the test.
  removeFolder(testFolder)
}


function createTestImageFolderSuite() {
  test(testCreateTestImageFolder, 1, [1, 2], [3, 4])
}

function testGulpfile() {
  // Run the test suite for the gulpfile.
  console.log("Test gulpfile.ts")
  runSuite(urlToNumberSuite)
  runSuite(createTempFolderSuite)
  runSuite(createTestCjsonFileSuite)
  runSuite(createTestImageFolderSuite)
}

testGulpfile()