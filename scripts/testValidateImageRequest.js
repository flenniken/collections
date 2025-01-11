// Test the validateImageRequest.js file's functions.
// Run from the collections container:
//
// cd ~/collections
// node scripts/testValidateImageRequest.js

(async () => {

  if (!process.env.coder_env) {
    console.log("Run from the Collection's docker environment.")
    return
  }

  const { getJwks, verifyJwt, handler, region,
  userPoolId, client_id } = require('./validateImageRequest');
  const fs = require('fs');

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

  function gotExpected(got, expected) {
    // Generate a console error when the got message doesn't equal the
    // expected message.
    if (got != expected) {
      error(`
     got: ${got}
expected: ${expected}
`)
    }
  }

  function toString(obj) {
    // Convert the given obj to a json string.
    return JSON.stringify(obj, null, 2)
  }

  function makeEvent(url, token) {
    // Return an lambda viewer access event for testing.
    return {
      Records: [
        {
          cf: {
            request: {
              uri: url,
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

  async function testHandler(url, token, context, valid) {
    let event = makeEvent(url, token)
    const request = event['Records'][0]['cf']['request']
    // console.log(toString(event))
    const response = await handler(event, context);

    if (valid) {
      gotExpected(response, request)
    }
    else {
      const errorResponse = {
        "statusCode": "403",
        "statusDescription": "Forbidden",
        "body": "Unauthorized access."
      }
      gotExpected(toString(response), toString(errorResponse))
    }
  }

  console.log('Test that the file globals match the aws-settings.json.');
  const awsSettings = readJsonKey(awsSettingsFilename, 'settings')
  
  if (!userPoolId.startsWith(region))
    error("The region doesn't start the userPoolId.")
    
  gotExpected(userPoolId, awsSettings.userPoolId)
  gotExpected(client_id, awsSettings.client_id)
  
  console.log('Test reading the access token.');
  const access_token = readJsonKey(tokenFilename, "access_token")
  if (access_token.length < 100)
    error("The access token string is to short.")

  console.log('Test getJwks.');
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

  let payload = null
  console.log('Test verifyJwt without a token.');
  payload = await testVerifyJwt(null, false, 'No token provided.')

  console.log('Test verifyJwt with an expired access token.');
  payload = await testVerifyJwt(access_token, false, 'jwt expired')
  if (payload !== null)
    error('Returned a payload for an expired token.')

  console.log('Test verifyJwt with an access token.');
  payload = await testVerifyJwt(access_token, true, 'jwt expired')
  if (payload === null)
    error('Did not return a payload for a valid token.')
  // console.log(`payload: ${toString(payload)}`)
  if (payload.iss != iss)
    error('Payload missing iss.')

  // You can ignore expiration for testing.  That way we can use a
  // valid but expired token for testing. Normal means don't ignore.
  const ignoreExpiration = true
  const normal = false

  // Allow means you expect the handler to allow the https
  // request. Forbidden mean you expect the request to not be allowed
  // and return a status code of 403.
  const allow = true
  const forbidden = false
  
  console.log('Test handler without an images url or a token.');
  await testHandler("/test.html", null, normal, allow)

  console.log('Test handler without an images url.');
  await testHandler("/test.html", access_token, normal, allow)

  console.log('Test handler with an images url but no token.');
  await testHandler("/images/test.html", null, normal, forbidden)

  console.log('Test handler with an images url but and an expired token.');
  await testHandler("/images/test.html", access_token, normal, forbidden)

  console.log('Test handler with an images url with a good token.');
  await testHandler("/images/test.html", access_token, ignoreExpiration, allow)


  // error('Test for red.')
  if (errorCount)
    console.log(`${errorCount} errors`)
  else
    console.log("\x1b[32mSuccess\x1b[0m")
})();
