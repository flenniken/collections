// Test code:

/// <reference path="./win.ts" />
/// <reference path="./all.ts" />
/// <reference path="./cjsonDefinition.ts" />
/// <reference path="./maker.ts" />

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
  log("gotExpectedSuite")
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
  log("shiftImagesSuite")
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
  log("getPreviousNextSuite")
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

function boxes99(filledBoxes: number[]) {
  // Create a collection of 16 boxes.
  // Each element of filledBoxes is the index to set to the value 99.
  // The rest of the boxes are set empty (-1).

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

function testBoxes99(filledBoxes: number[], eOrder: number[]) {
  const collectionImages = boxes99(filledBoxes)
  const msg = `boxes99:
   input: ${JSON.stringify(filledBoxes)}`
  gotExpected(collectionImages, eOrder, msg)
}

function testBoxes99Suite() {
  log("testBoxes99Suite")
  const fn = testBoxes99
  test(fn, [], [-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1])
  test(fn, [0], [99,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1])
  test(fn, [1], [-1,99,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1])
  test(fn, [0, 1], [99, 99,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1])
  test(fn, [2, 3], [-1,-1,99,99,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1])
  test(fn, [15], [-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,99])
}

function testIsRequired(filledBoxes: number[], eRequiredTrue: number[]) {

  const eRequired = boxes99(eRequiredTrue)

  const collectionImages = boxes99(filledBoxes)
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
  log("isRequireSuite")
  const fn = testIsRequired

  // Full box is not required.
  // The first 8 boxes are required.
  // Tests cases where there is an empty box before.
  // The collection count must be 8, 10, 12, 14, or 16.

  test(fn, [0], [1,2,3,4,5,6,7])
  test(fn, [0,1], [2,3,4,5,6,7])
  test(fn, [8, 15], [0,1,2,3,4,5,6,7,9,10,11,12,13,14])
  test(fn, [12, 15], [0,1,2,3,4,5,6,7,8,9,10,11,13,14])
  test(fn, [8, 9], [0,1,2,3,4,5,6,7])
  test(fn, [9], [0,1,2,3,4,5,6,7,8])
  test(fn, [8], [0,1,2,3,4,5,6,7,9])
}

function createTestImage(unique: number): CJson.Image {
  let image: CJson.Image = {
    url: `image url ${unique}`,
    thumbnail: `thumbnail ${unique}`,
    title: `title ${unique}`,
    description: `description ${unique}`,
    width: 2040+unique,
    height: 1024+unique,
    size: 10000+unique,
    sizet: 5000+unique,
    uniqueId: `${unique}`,
  }
  return image
}

function testCreateTestImage(unique: number) {
  const image = createTestImage(unique)
  const msg = `image: ${JSON.stringify(image, null, 2)}`
  gotExpected(image.thumbnail, `thumbnail ${unique}`, msg)
  gotExpected(image.url, `image url ${unique}`, msg)
  gotExpected(image.width, 2040 + unique, msg)
  gotExpected(image.uniqueId, `${unique}`, msg)
}

function createTestImageSuite() {
  log("createTestImageSuite")
  test(testCreateTestImage, 0)
  test(testCreateTestImage, 1)
  test(testCreateTestImage, 2)
  test(testCreateTestImage, 99)
}

function createTestImages(count: number): CJson.Image[] {
  let images: CJson.Image[] = []
  for (let ix = 0; ix < count; ix++) {
    const image = createTestImage(ix)
    images.push(image)
  }
  return images
}

function testFindThumbnailIx(order: number[], images: CJson.Image[],
    url: string, eIndex: number) {
  const index = findThumbnailIx(order, images, url)
  gotExpected(index, eIndex)
}

function findThumbnailIxSuite() {
  log("findThumbnailIxSuite")
  const fn = testFindThumbnailIx
  let order = [0, 2]
  const images = createTestImages(3)
  test(fn, order, images, "thumbnail 0", 0)
  test(fn, order, images, "thumbnail 1", -1)
  test(fn, order, images, "thumbnail 2", 2)

  order = [-1, 0]
  test(fn, order, images, "thumbnail 0", 0)
  test(fn, order, images, "thumbnail 1", -1)
  test(fn, order, images, "thumbnail 2", -1)

  order = [-1, -1]
  test(fn, order, images, "thumbnail 0", -1)
  test(fn, order, images, "thumbnail 1", -1)
  test(fn, order, images, "thumbnail 2", -1)
}

function testCreateCollectionOrder(order: number[], availableCount: number, eOrder: number[]) {
  const gotOrder = createCollectionOrder(order, 3, availableCount)
  const msg = `order: ${order}, availableCount: ${availableCount}`
  gotExpected(gotOrder, eOrder, msg)
}

function createCollectionOrderSuite() {
  log("createCollectionOrderSuite")
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

function testParseNonNegativeInt(numberStr: string, eNumber: number) {
  const num = parseNonNegativeInt(numberStr)
  gotExpected(num, eNumber, `numberStr: ${numberStr}`)
}

function testParseNonNegativeIntError(numberStr: string) {
  try {
    const num = parseNonNegativeInt(numberStr)
    throw Error("parseNonNegativeInt did not generate an exception")
  }
  catch (error) {
    if (!(error instanceof Error))
      throw Error("invalid error type")
    const eMsg = "not a valid non-negative integer"
    gotExpected(error.message, eMsg, `numberStr: ${numberStr}`)
  }
}

function parseNonNegativeIntSuite() {
  log("parseNonNegativeIntSuite")
  const fn = testParseNonNegativeInt
  test(fn, "0", 0)
  test(fn, "3", 3)
  test(fn, "12", 12)
  const errorFn = testParseNonNegativeIntError
  test(errorFn, "")
  test(errorFn, "abc")
  test(errorFn, "3abc")
  test(errorFn, "abc3")
  test(errorFn, "3.14")
  test(errorFn, "-1")
  test(errorFn, "1-1")
  test(errorFn, ".1")
}

function isRequiredStatus(requiredId: RequiredIdType, eStatus: boolean) {
  // Validate that the element's required status matches the expected
  // status.
  if (requiredId == null)
    return
  const classes = get(requiredId).classList
  const required = classes.contains("required")
  const good = classes.contains("good")
  const msg = `${requiredId} classes: ${classes}`
  if (required && good)
    fail("both required and good classes are set")
  if (eStatus)
    gotExpected(required, true, msg)
  else
    gotExpected(good, true, msg)
}

function testSetRequired(requiredId: RequiredIdType, status: boolean) {
  setRequired(requiredId, status)
  isRequiredStatus(requiredId, status)
}

function setRequiredSuite() {
  log("setRequiredSuite")
  const requiredIds: RequiredIdType[] = [
    "image-details-required",
    "image-description-required",
    "collection-title-required",
    "post-date-required",
    "description-required",
    "index-thumbnail-required",
    "index-description-required",
    "image-details-required",
    "image-description-required",
  ]
  for (const requiredId of requiredIds) {
    isRequiredStatus(requiredId, true)
  }
  const requiredId = "collection-title-required"
  const fn = testSetRequired
  test(fn, requiredId, false)
  test(fn, requiredId, false)
  test(fn, requiredId, true)
  test(fn, requiredId, true)
}

function isElementText(elementId: string, text: string) {
  // Validate that the given element has the given text.
  const element = get(elementId) as HTMLElement
  let gotText: string
  if (element instanceof HTMLInputElement ||
      element instanceof HTMLTextAreaElement) {
    gotText = element.value
  } else {
    gotText = element.textContent || ''
  }
  gotExpected(gotText, text, `${elementId} text`)
}

function testSetText(elementId: string, requiredId: RequiredIdType, text: string) {
  setText(elementId, requiredId, text)
  isElementText(elementId, text)
  if (text == "")
    isRequiredStatus(requiredId, true)
  else
    isRequiredStatus(requiredId, false)
}

function setTextSuite() {
  log("setTextSuite")
  const fn = testSetText
  test(fn, "collection-title", "collection-title-required", "the title")
  test(fn, "post-date", "post-date-required", "2025-04-12")
  test(fn, "description", "description-required", "the description")
  test(fn, "image-title", null, "image title")

  test(fn, "collection-title", "collection-title-required", "")
  test(fn, "post-date", "post-date-required", "")
  test(fn, "description", "description-required", "")
  test(fn, "image-title", null, "")
}

function testEncoding(elementId: string, text: string) {
  setText(elementId, null, text)
  isElementText(elementId, text)
}

function encodingSuite() {
  log("encodingSuite")
  const fn = testEncoding
  test(fn, "test-paragraph", "This is a test & < > \" '")
  test(fn, "test-paragraph2", "<h1>hello</h1>")
}

function testReorderImages(order: number[], images: CJson.Image[],
  eIds: number[]) {
  // Test the reorderImages function.
  let imageIds: number[] = []
  for (const image of images) {
    imageIds.push(parseInt(image.uniqueId))
  }
  const gotImages = reorderImages(order, images)
  let gotIds: number[] = []
  for (const image of gotImages) {
    gotIds.push(parseInt(image.uniqueId))
  }
  const msg = `order: ${JSON.stringify(order)}, images: ${JSON.stringify(imageIds)}`
  gotExpected(gotIds, eIds, msg)
}

function reorderImagesSuite() {
  log("reorderImagesSuite")
  const fn = testReorderImages
  const images = createTestImages(3)
  test(fn, [0, 1, 2], images, [0, 1, 2])
  test(fn, [-1, 1, 2], images, [1, 2])
  test(fn, [-1, 1, -1], images, [1])
  test(fn, [-1, 2, -1], images, [2])
  test(fn, [-1, -1, -1], images, [])
}

interface TestZoomPoint {
  num: number;
}

interface TestZoomPoints {
  [wxh: string]: TestZoomPoint[];
}

function tzpsToZps(tzps: TestZoomPoints): CJson.ZoomPoints {
  // Convert the TestZoomPoints object to a ZoomPoints object.
  let zoomPoints: CJson.ZoomPoints = {};
  for (const [key, points] of Object.entries(tzps)) {
    zoomPoints[key] = points.map(point => ({
      scale: point.num,
      tx: 0,
      ty: 0,
    }));
  }
  return zoomPoints;
}

function zpsToTzps(zps: CJson.ZoomPoints): TestZoomPoints {
  // Convert the ZoomPoints object to a TestZoomPoints object.
  let tzps: TestZoomPoints = {};
  for (const [key, points] of Object.entries(zps)) {
    tzps[key] = points.map(point => ({
      num: point.scale,
    }));
  }
  return tzps;
}

function testZps() {
  const tzps = {"2x3": [{ num: 1 }, { num: 2 }, { num: 3 }]}
  const gZps = tzpsToZps(tzps)
  gotExpected(gZps,
    {"2x3":[{"scale":1,"tx":0,"ty":0},{"scale":2,"tx":0,"ty":0},{"scale":3,"tx":0,"ty":0}]})
  const gotTzps = zpsToTzps(gZps)
  gotExpected(tzps, gotTzps)
}

function testZps2() {
  const tzps = {
    "2x3": [{ num: 1 }, { num: 2 }, { num: 3 }],
    "3x2": [{ num: 4 }, { num: 5 }, { num: 6 }]
  }
  const gZps = tzpsToZps(tzps)
  gotExpected(gZps, {
    "2x3": [
      {"scale":1,"tx":0,"ty":0},
      {"scale":2,"tx":0,"ty":0},
      {"scale":3,"tx":0,"ty":0}
    ],
    "3x2": [
      {"scale":4,"tx":0,"ty":0},
      {"scale":5,"tx":0,"ty":0},
      {"scale":6,"tx":0,"ty":0}
    ]
  })
  const gotTzps = zpsToTzps(gZps)
  gotExpected(tzps, gotTzps)
}

function createZoomPointsSuite() {
  // Test the tzpsToZps and zpsToTzps functions.
  log("createZoomPointsSuite")
  test(testZps)
  test(testZps2)
}

function testReorderZoomPoints(order: number[], tzps: TestZoomPoints,
    eTzps: TestZoomPoints) {
  // Test the reorderZoomPoints function.
  const zps = tzpsToZps(tzps)
  const gotZps = reorderZoomPoints(order, zps)
  const gotTzps = zpsToTzps(gotZps)
  const msg = `order: ${JSON.stringify(order)}, zoomPoints: ${JSON.stringify(tzps)}`
  gotExpected(gotTzps, eTzps, msg)
}

function reorderZoomPointsSuite() {
  // Test the reorderZoomPoints function.
  log("reorderZoomPointsSuite")
  const fn = testReorderZoomPoints
  test(fn, [0, 1],
    {"2x3": [{ num: 1 }, { num: 2 }, { num: 3 }], "3x2": [{ num: 4 }, { num: 5 }, { num: 6 }]},
    {"2x3": [{ num: 1 }, { num: 2 }], "3x2": [{ num: 4 }, { num: 5 }]});
  test(fn, [1, 0],
    {"2x3": [{ num: 0 }, { num: 1 }], "3x2": [{ num: 4 }, { num: 5 }]},
    {"2x3": [{ num: 1 }, { num: 0 }], "3x2": [{ num: 5 }, { num: 4 }]});
  test(fn, [1, 0],
    {"2x3": [{ num: 0 }, { num: 1 }]},
  {"2x3": [{ num: 1 }, { num: 0 }]});
  test(fn, [1, -1],
    {"2x3": [{ num: 0 }, { num: 1 }], "3x2": [{ num: 4 }, { num: 5 }]},
    {"2x3": [{ num: 1 }], "3x2": [{ num: 5 }]});
  test(fn, [0, -1],
    {"2x3": [{ num: 0 }, { num: 1 }], "3x2": [{ num: 4 }, { num: 5 }]},
    {"2x3": [{ num: 0 }], "3x2": [{ num: 4 }]});
}

function testMaker() {
  log("Running testMaker...")
  gotExpectedSuite()
  getPreviousNextSuite()
  shiftImagesSuite()
  testBoxes99Suite()
  isRequireSuite()
  createTestImageSuite()
  findThumbnailIxSuite()
  createCollectionOrderSuite()
  parseNonNegativeIntSuite()
  setRequiredSuite()
  setTextSuite()
  encodingSuite()
  reorderImagesSuite();
  createZoomPointsSuite();
  reorderZoomPointsSuite();

  if (errorCount == 0)
    log("All tests passed.")
  else
    log(`❌ ${errorCount} tests failed.`)

  return 0
}

function appendTestContent() {
  // Add a test elements to the end of the page for testing
  // that text is encoded correctly.

  const container = document.createElement("div");
  container.id = "test-container";
  document.body.appendChild(container);

  // Create a test heading in the test container.
  const testHeading = document.createElement("h1");
  testHeading.textContent = "Test Encoding";
  container.appendChild(testHeading);

  const testParagraph = document.createElement("p");
  testParagraph.id = "test-paragraph";
  testParagraph.textContent = "p";
  container.appendChild(testParagraph);

  const testParagraph2 = document.createElement("p");
  testParagraph2.id = "test-paragraph2";
  testParagraph2.textContent = "p2";
  container.appendChild(testParagraph2);
}

document.addEventListener("DOMContentLoaded", () => {
  appendTestContent()
  testMaker();
});
