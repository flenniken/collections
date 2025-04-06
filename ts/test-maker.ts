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

function testMaker() {
  gotExpectedSuite()
  getPreviousNextSuite()
  shiftImagesSuite()
  if (errorCount == 0)
    log("All tests passed.")
  else
    log(`❌ ${errorCount} tests failed.`)

  return 0
}
