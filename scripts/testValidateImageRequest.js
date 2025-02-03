"use strict";

// Test the validateImageRequest.js file's functions.
//
// Run from the collections container:
// cd ~/collections
// node scripts/testValidateImageRequest.js

(async () => {

  if (!process.env.coder_env) {
    console.log("Run from the Collection's docker environment.")
    return
  }

  function logProgress(message) {
    console.log("* " + message)
  }

  // Import the functions to test.
  const { getJwks, verifyJwt, handler, region, parseQueryString,
          validateRequest, userPoolId, client_id, iss } = require('./validateImageRequest');

  const fs = require('fs');

  // The test token comes from running login-flow.
  const tokenFilename = '/home/coder/collections/tmp/tokens.json'

  const awsSettingsFilename = '/home/coder/collections/env/aws-settings.json'

  let errorCount = 0
  function error(message) {
    console.error(`\x1b[31mError\x1b[0m: ${message}`)
    errorCount += 1
  }

  function readJsonKey(filename, key) {
    // Read a json file which is a dictionary then return the give
    // key's value.
    const data = fs.readFileSync(filename);
    const json = JSON.parse(data);
    return json[key];
  }

  function gotExpected(got, expected, message) {
    // Generate a console error when the got value doesn't equal the
    // expected value. When not equal the given message is printed
    // along with the got and expected values.
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

  function makeEvent(url, token, queryString) {
    // Return an lambda viewer access event for testing.
    return {
      Records: [
        {
          cf: {
            request: {
              uri: url,
              querystring: queryString,
              headers: {
                auth: [
                  {
                    key: 'auth',
                    value: token
                  },
                ],
              },
            },
          },
        },
      ],
    };
  }

  async function testVerifyJwt(token, ignoreExpiration, eMsg) {
    // Call verifyJwk with the given token and return the decoded
    // payload. You can ignore the expiration date. If the token is
    // invalid, the error message must match the expected message
    // (eMsg).
    let payload = null
    try {
      payload = await verifyJwt(token, ignoreExpiration);
    } catch (err) {
      gotExpected(err.message, eMsg)
    }
    return payload
  }

  function testParseQueryString(queryString, expected) {
    // Test parseQueryString. If the result is unexpected, the
    // values are shown and the test fails.
    const result = parseQueryString(queryString)
    gotExpected(toString(result), toString(expected), `parsing: "${queryString}"`)
  }

  async function testHandler(event, context, eValid) {
    // Test the handler function with the given event and context.
    // You pass true for eValid when you expect the handler to return
    // a success response and false when you expect an error response.
    const request = event.Records[0].cf.request
    const response = await handler(event, context);
    const uri = request.uri

    if (eValid) {
      gotExpected(toString(response), toString(request))
    }
    else {
      const errorResponse = {
        "status": "401",
        "statusDescription": "Unauthorized",
      }
      gotExpected(toString(response), toString(errorResponse))
    }
  }

  async function testValidateRequest(url, access_token, id, user, ignoreExpiration, eRet) {
    const got = await validateRequest(url, access_token, id, user, ignoreExpiration)
    gotExpected(toString(got), toString(eRet))
  }

  // Begin running the tests.

  logProgress('Test that the file globals match the aws-settings.json.');
  const awsSettings = readJsonKey(awsSettingsFilename, 'settings')
  if (!userPoolId.startsWith(region))
    error("The region doesn't start the userPoolId.")
  gotExpected(userPoolId, awsSettings.userPoolId)
  gotExpected(client_id, awsSettings.client_id)

  logProgress('Test reading the access token.');
  const access_token = readJsonKey(tokenFilename, "access_token")
  // console.log(access_token.length) length = 1041
  if (access_token.length < 100)
    error("The access token string is to short.")

  logProgress('Test getJwks.');
  try {
    const keys = await getJwks();
    // console.log('JWKS:', keys);

    if (!keys || keys.length == 0)
      error('JWKS keys should not be empty');

    if (!keys[0].kid)
      error('JWKS key should have a kid');

  } catch (err) {
    error('Problem fetching JWKS:', err.message);
  }

  // function runSplit(input) {
  //   const params = input.split('&');
  //   console.log(`"${input}".split(&): => ${JSON.stringify(params)}`)
  // }
  // runSplit("a=b")
  // runSplit("a=b&d=c")
  // runSplit("")
  // runSplit("&")
  // runSplit("&&")
  // runSplit("a&")
  // runSplit("&a")
  // runSplit("&a&")

  logProgress('Test parseQueryString');

  testParseQueryString("name=Test", {name: "Test"})
  testParseQueryString("first=Test&last=Tester", {first: "Test", last: "Tester"})

  testParseQueryString("", {})
  testParseQueryString("name", {})
  testParseQueryString("name=", {})
  testParseQueryString("=", {})
  testParseQueryString("==", {})
  testParseQueryString("=a", {})
  testParseQueryString("a=b", {a: "b"})
  testParseQueryString("a=b&", {a: "b"})
  testParseQueryString("&a=b", {a: "b"})
  testParseQueryString("&a=b&", {a: "b"})

  const result = parseQueryString()
  if (toString(result) != "{}") {
    console.log(result)
    error("a missing arg did not return an empty dictionary")
  }

  let payload = null
  logProgress('Test verifyJwt without a token.');
  payload = await testVerifyJwt(null, false, 'Missing token.')

  logProgress('Test verifyJwt with an expired access token.');
  payload = await testVerifyJwt(access_token, false, 'jwt expired')
  if (payload !== null)
    error('Returned a payload for an expired token.')

  logProgress('Test verifyJwt with an access token.');
  payload = await testVerifyJwt(access_token, true, 'jwt expired')
  if (payload === null)
    error('Did not return a payload for a valid token.')
  // console.log(`payload: ${toString(payload)}`)
  if (payload.iss != iss)
    error('Payload missing iss.')

  // Get the test token's user value.
  const atp = await testVerifyJwt(access_token, true, 'jwt expired')
  const testUser = atp.username

  // You can ignore expiration for testing.  That way we can use a
  // valid but expired token for testing. Normal means don't ignore.
  const ignoreExpiration = true
  const normal = false

  // Allow means you expect the handler to allow the https
  // request. Forbidden mean you expect the request to not be allowed
  // and return a status code of not 200.
  const allow = true
  const forbidden = false

  logProgress('Test validateRequest with non-image.');
  await testValidateRequest("/test.html", 'access_token', "id", "user",
    ignoreExpiration, allow)

  logProgress('Test validateRequest with image but no query parameters.');
  await testValidateRequest("/images/asdf.jpg", 'access_token', undefined, undefined,
    ignoreExpiration, forbidden)

  logProgress('Test validateRequest with image but no user query parameter.');
  await testValidateRequest("/images/asdf.jpg", 'access_token', "id", undefined,
    ignoreExpiration, forbidden)

  logProgress('Test validateRequest with image but no id query parameter.');
  await testValidateRequest("/images/asdf.jpg", 'access_token', undefined, "user",
    ignoreExpiration, forbidden)

  logProgress('Test validateRequest with image but no token.');
  await testValidateRequest("/images/asdf.jpg", '', "id", "user",
    ignoreExpiration, forbidden)

  logProgress('Test validateRequest with image and an invalid token.');
  await testValidateRequest("/images/asdf.jpg", 'bad_token', "id", "user",
    ignoreExpiration, forbidden)

  logProgress('Test validateRequest with image and a mismatched user.');
  await testValidateRequest("/images/asdf.jpg", access_token, "id", "user",
    ignoreExpiration, forbidden)

  logProgress('Test validateRequest with image, good case.');
  await testValidateRequest("/images/asdf.jpg", access_token, "id", testUser,
    ignoreExpiration, allow)

  logProgress('Test validateRequest with image but expired token.');
  await testValidateRequest("/images/asdf.jpg", access_token, "id", testUser,
    normal, forbidden)


  logProgress('Test handler without an images url.');
  // makeEvent(url, token, queryString)
  let event = makeEvent("/test.html", "", "")
  await testHandler(event, normal, allow)

  logProgress('Test handler with an images url but no token.');
  event = makeEvent("/images/test.html", "", "id=asdf&user=fasdf")
  await testHandler(event, normal, forbidden)

  logProgress('Test good case.');
  event = makeEvent("/images/test.html", access_token, `id=12345678&user=${testUser}`)
  await testHandler(event, ignoreExpiration, allow)



  // error('Test for red.')
  if (errorCount)
    console.log(`${errorCount} errors`)
  else
    console.log("\x1b[32mSuccess\x1b[0m")
})();
