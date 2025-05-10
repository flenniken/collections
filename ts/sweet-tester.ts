// Suite Test Framework (sweet-tester.ts)

export { gotExpected, fail, getFunctionName, testThrow, test, runSuite };

const log = console.log

function gotExpected(got: any, expected: any, message?: string) {
  // Check if the got value is the same as the expected value.
  // Convert the values to JSON then compare them.  The optional
  // message is shown when the values are different.

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

let testNumber = 1
let errorCount = 0

function testThrow(eMessage: string, fn: (...args: any[]) => void, ...args: any[]): void {
  // Run the test function with the provided arguments.
  // The function passes when it generates an exception with the expected
  // message.
  try {
    fn(...args);
    log(`❌ ${testNumber} fail`);
    log("No error was thrown");
    errorCount += 1;
  }
  catch (error) {
    // Check if the error message is the same as the expected message.
    if (! (error instanceof Error)) {
      log(`❌ ${testNumber} fail`);
      errorCount += 1;
      log("Error is not an instance of Error");
      return;
    }
    try {
      gotExpected(error.message, eMessage, "Unexpected error message:");
    }
    catch (error) {
      log(`❌ ${testNumber} fail`);
      log(error instanceof Error ? error.message : error);
      errorCount += 1;
      return
    }
    log(`✅ ${testNumber} pass`);
  }
  testNumber += 1;
}

function test(fn: (...args: any[]) => void, ...args: any[]): void {
  // Run the test function with the provided arguments and log the result.
  // The function passes when it doesn't generate an exception.
  try {
    fn(...args);
    log(`✅ ${testNumber} pass`);
  }
  catch (error) {
    log(`❌ ${testNumber} fail`);
    log(error instanceof Error ? error.message : error);
    errorCount += 1;
  }
  testNumber += 1;
}

function runSuite(fn: () => void) {
  // Log then run a function that runs a set of tests.
  log("🏃‍♂️‍➡️ " + getFunctionName(fn));
  fn();
}
