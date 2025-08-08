// Suite Test Framework (sweet-tester.ts)

export { gotExpected, fail, getFunctionName, testThrow,
  test, runSuite };

const log = console.log

function gotExpected(got: any, expected: any, message?: string) {
  // Verify the got value matches the expected value. When they don't
  // show the differences and throw an exception. Convert the values
  // to JSON to compare them.  The optional message is shown when the
  // values are different.

  const gotJson = JSON.stringify(got);
  const expectedJson = JSON.stringify(expected);

  // Use a blank line message when none is provided.
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
  // Fail a test with the given message.
  throw Error(message)
}

function getFunctionName(fn: Function): string {
  // Return the specified function's name.
  const fnString = fn.toString();
  // log(fnString)
  // function shiftImagesSuite() {...
  const argsMatch = fnString.match(/^[\s]*function[\s]*([^(]*)/);
  let name = "unknown"
  if (argsMatch && argsMatch.length > 1) {
    const matchName = argsMatch[1]
    if (matchName)
    name = matchName
  }
  return name
}

// Keep track of the current test number and the number of errors.
let testNumber = 1
let errorCount = 0

function feedback(message: string) {
  // Tell whether the test passed or failed and keep stats. If the
  // specified message is "", the test passed, otherwise it failed and
  // the message tells why.
  if (message == "")
    log(`✅ ${testNumber} pass`)
  else {
    log(`❌ ${testNumber} fail`)
    log(message)
    errorCount += 1;
  }
  testNumber += 1;
}

function testThrow(eMessage: string, fn: (...args: any[]) => void, ...args: any[]): void {
  // Run the function and verify it throws an error exception with the
  // given message and log the result.
  const message = testThrow2(eMessage, fn, ...args)
  feedback(message)
}

function testThrow2(eMessage: string, fn: (...args: any[]) => void, ...args: any[]): string {
  // Run the test function with the provided arguments and return an
  // error message. If the error message is "", the test passed.
  // The function passes when it generates an exception with the
  // expected message.

  let passed = false
  try {
    fn(...args);
    return "The test did not generate the expected exception."
  }
  catch (error) {
    if (! (error instanceof Error)) {
      return "The exception object is not an instance of Error."
    }
    // Verify the error message is the same as the expected message.
    try {
      gotExpected(error.message, eMessage, "Unexpected error message:")
    }
    catch (error) {
      if (error instanceof Error) {
        return error.message
      }
      else
        return "Unexpected error."
    }
    return "" // success
  }
}

function test(fn: (...args: any[]) => void, ...args: any[]): void {
  // Run the test function with the provided arguments and log the result.
  // The function passes when it doesn't generate an exception.
  let message = ""
  try {
    fn(...args);
  }
  catch (error) {
    message = (error instanceof Error ? error.message : "Unexpected exception type.")
  }
  feedback(message)
}

function runSuite(fn: () => void) {
  // Log the suite name then run its set of tests.
  log("🏃‍♂️‍➡️ " + getFunctionName(fn));
  fn();
}
