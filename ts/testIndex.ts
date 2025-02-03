"use strict";

// Test the index.js file's functions.
//
// Build with gulp (g).
//
// Run from the collections container:
// cd ~/collections
// node tmp/testIndex.js

(async () => {

  if (!process.env.coder_env) {
    console.log("Run from the Collection's docker environment.")
    return
  }

  function logProgress(message) {
    console.log("* " + message)
  }

  // Import the functions to test.
  const {getRandom8} = require('./index.js');

  const fs = require('fs');

  const tokenFilename = '/home/coder/collections/tmp/tokens.json'
  const awsSettingsFilename = '/home/coder/collections/env/aws-settings.json'

  let errorCount = 0
  function error(message) {
    console.error(`\x1b[31mError\x1b[0m: ${message}`)
    errorCount += 1
  }
  function gotExpected(got, expected, message) {
    // Generate a console error when the got message doesn't equal the
    // expected message.
    if (got != expected) {
      if (!message)
        message = ""
      error(`${message}
     got: ${got}
expected: ${expected}
`)
    }
  }

  function toString(obj) {
    // Convert the given obj to a json string.
    return JSON.stringify(obj, null, 2)
  }

  logProgress('Test me.');

  if (errorCount)
    console.log(`${errorCount} errors`)
  else
    console.log("\x1b[32mSuccess\x1b[0m")
})();
