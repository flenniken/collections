// Test code:

function gotExpected(got: any, expected: any, message?: string) {
  // Check if the got value is the same as the expected value.
  // Convert the values to JSON then compare them.
  const gotJson = JSON.stringify(got);
  const expectedJson = JSON.stringify(expected);

  // Use a default message if none is provided.
  const errorMessage = message || "";

  if (gotJson !== expectedJson) {
    const fullMessage = `
${errorMessage}
Error:
     got: ${gotJson}
expected: ${expectedJson}
`;
    throw new Error(fullMessage);
  }
}

function fail(message: string) {
  throw Error(message)
}

function testGetPreviousNext(collectionImages: number[], imageIndex: number,
    ePrevious: number, eNext: number) {
  const [previous, next] = getPreviousNext(collectionImages, imageIndex)
  gotExpected(previous, ePrevious)
  gotExpected(next, eNext)
}

let testNumber = 1
let errorCount = 0
function test(fn: (...args: any[]) => void, ...args: any[]): void {
  // Run the test function with the provided arguments and log the result.
  try {
    fn(...args);
    log(`${testNumber}: ✅ pass`);
  }
  catch (error) {
    log(`${testNumber}: ❌ fail`);
    log(error instanceof Error ? error.message : error);
    errorCount += 1;
  }
  testNumber += 1;
}

function testExpectedError() {
  // This function is used to test the gotExpected function
  // when the arguments do not match.

  try {
    gotExpected([1], [2], "comparing arrays")
    throw Error("array compare did not throw")
  }
  catch (error) {
    if (!(error instanceof Error))
      throw Error("the error type is not an instance of Error")

    const eMsg = `
comparing arrays
Error:
     got: [1]
expected: [2]
`
    if (error.message != eMsg) {
      log("expected error message, got:")
      log(error.message)
      log("expected:")
      log(eMsg)
      throw Error("error message not as expected")
    }
  }

  // success
}

function gotExpectedSuite() {
  test(gotExpected, [1], [1])
  test(testExpectedError, [1], [2], "comparing arrays")
}

function testShiftImages(orderList: number[], collectionIndex: number,
    eOrder: number[]) {
  const input = `orderList: ${orderList}, collectionIndex: ${collectionIndex}`
  shiftImages(orderList, collectionIndex)
  gotExpected(orderList, eOrder, input)
}

function shiftImagesSuite() {
  const fn = testShiftImages
  test(fn, [0, 1, 2], 0, [0, 1, 2])
  test(fn, [0, 1, 2], 1, [0, 1, 2])
  test(fn, [0, 1, 2], 2, [0, 1, 2])
  test(fn, [-1, 1, 2], 0, [1, 2, -1])
  test(fn, [3, -1, 2], 0, [-1, 3, 2])
  test(fn, [3, 1, -1], 0, [-1, 3, 1])
  test(fn, [3, 1, -1], 1, [3, -1, 1])
  test(fn, [3, 1, -1], 2, [3, 1, -1])
  test(fn, [5, 6, -1, 7, -1, 8], 0, [-1, 5, 6, 7, -1, 8])
  test(fn, [5, 6, -1, 7, -1, 8], 2, [5, 6, 7, -1, 8, -1])
}

function getPreviousNextSuite() {
  const [previous, next] = getPreviousNext([], 0)
  test(gotExpected, previous, -1)
  test(gotExpected, next, -1)

  const fn = testGetPreviousNext
  test(fn, [], 0, -1, -1)
  test(fn, [-1], 0, -1, -1)
  test(fn, [-1,-1], 0, -1, -1)
  test(fn, [1], 6, -1, -1)
  test(fn, [1,-1], 6, -1, -1)
  test(fn, [1], 1, 1, 1)
  test(fn, [8,7], 7, 8, 8)
  test(fn, [8,7], 8, 7, 7)
  test(fn, [1,3,2], 1, 2, 3)
  test(fn, [1,3,2], 2, 3, 1)
  test(fn, [1,3,2], 3, 1, 2)
  test(fn, [-1,5,-1,-1,8,-1,3,-1], 8, 5, 3)
}

function fillBoxes(filledBoxes: number[]) {
  // Return a list of collection boxes filled in with the given list
  // of image indexes. The rest of the boxes are empty (-1).

  if (filledBoxes.length >= 16)
    fail("too many filled boxes")

  // Create an array of 16 numbers all -1.
  let collectionImages: number[]  = []
  for (let ix = 0; ix < 16; ix++) {
    collectionImages.push(-1)
  }

  // Set the boxes that are filled in.
  for (let ix = 0; ix < filledBoxes.length; ix++) {
    const filledIx = filledBoxes[ix]
    if (filledIx < 0 || filledIx >= 16) {
      fail("filled box index is out of range")
    }
    collectionImages[filledIx] = 99
  }
  return collectionImages
}

function testIsRequired(filledBoxes: number[], eRequiredTrue: number[]) {

  const eRequired = fillBoxes(eRequiredTrue)

  const collectionImages = fillBoxes(filledBoxes)
  let answers: number[] = []
  for (let ix = 0; ix < 16; ix++) {
    const required = isRequired(collectionImages, ix)
    if (required == true)
      answers.push(99)
    else
      answers.push(-1)
  }
  const msg = `isRequired:
   input: ${JSON.stringify(collectionImages)}`
  gotExpected(answers, eRequired, msg)
}

function isRequireSuite() {
  const fn = testIsRequired

  // Full box is not required.
  // The first 8 boxes are required.
  // Tests cases where there is an empty box before.
  // The collection count must be 8, 10, 12, 14, or 16.

  test(fn, [0], [1,2,3,4,5,6,7])
  test(fn, [0,1], [2,3,4,5,6,7])
  test(fn, [8, 15], [0,1,2,3,4,5,6,7,9,10,11,12,13,14])
  test(fn, [12, 15], [ 0,1,2,3,4,5,6,7,8,9,10,11,13,14])
  test(fn, [8, 9], [0,1,2,3,4,5,6,7])
  test(fn, [9], [0,1,2,3,4,5,6,7,8])
  test(fn, [8], [0,1,2,3,4,5,6,7,9])
}

/// <reference path="./cjsonDefinition.ts" />
function createTestImage(thumbnail: string): CJson.Image {
  let image: CJson.Image = {
    url: "image url",
    thumbnail: thumbnail,
    title: "title",
    description: "description",
    width: 2040,
    height: 1024,
    size: 12345,
    sizet: 9876,
    uniqueId: ""
  }
  return image
}

function createTestImages(imageThumbnails: string[]): CJson.Image[] {

  let images: CJson.Image[] = []
  for (let ix = 0; ix < imageThumbnails.length; ix++) {
    const thumbnail = imageThumbnails[ix]
    const image = createTestImage(thumbnail)
    images.push(image)
  }
  return images
}

function testFindThumbnailIx(imageThumbnails: string[],
    filledBoxes: number[], url: string, eIndex: number) {
  const images = createTestImages(imageThumbnails)
  const collectionImages = fillBoxes(filledBoxes)
  const index = findThumbnailIx(images, collectionImages, url)
  gotExpected(index, eIndex)
}

function findThumbnailInfoSuite() {
  const fn = testFindThumbnailIx

  test(fn, [], [], "url", -1)

  test(fn, ["url"], [], "url", -1)
  test(fn, ["url"], [0], "url", 0)

  test(fn, ["url", "abc"], [0], "url", 0)
  test(fn, ["abc", "url"], [0], "url", -1)
  test(fn, ["url", "abc"], [0,1], "url", 0)
  test(fn, ["abc", "url"], [0,1], "url", 1)

  test(fn, ["url", "abc", "xyz"], [0], "url", 0)

  test(fn, ["abc", "url", "xyz"], [0], "url", -1)
  test(fn, ["abc", "url", "xyz"], [0,1], "url", 1)
  test(fn, ["abc", "url", "xyz"], [0,1,2], "url", 1)

  test(fn, ["abc", "xyz", "url"], [0], "url", -1)
  test(fn, ["abc", "xyz", "url"], [0,1], "url", -1)
  test(fn, ["abc", "xyz", "url"], [0,1,2], "url", 2)
}

function testCreateCollectionOrder(order: number[], availableCount: number, eOrder: number[]) {
  const gotOrder = createCollectionOrder(order, 3, availableCount)
  const msg = `order: ${order}, availableCount: ${availableCount}`
  gotExpected(gotOrder, eOrder, msg)
}

function createCollectionOrderSuite() {
  const fn = testCreateCollectionOrder

  test(fn, undefined, 1, [0, -1, -1])
  test(fn, undefined, 2, [0, 1, -1])
  test(fn, undefined, 3, [0, 1, 2])
  test(fn, undefined, 4, [0, 1, 2])

  test(fn, [0, 2, 1], 3, [0, 2, 1])
  test(fn, [3, -1, 1], 4, [3, -1, 1])
  test(fn, [3, -1, 4], 5, [3, -1, 4])

  test(fn, [3, 2], 3, [-1, 2, -1])
}


function testMaker() {
  gotExpectedSuite()
  getPreviousNextSuite()
  shiftImagesSuite()
  isRequireSuite()
  createCollectionOrderSuite()

  if (errorCount == 0)
    log("All tests passed.")
  else
    log(`❌ ${errorCount} tests failed.`)

  return 0
}
