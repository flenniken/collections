"use strict";

const https = require('https');
const jwt = require('jsonwebtoken');
const jwkToPem = require('jwk-to-pem');

// Set these values from the values in aws-settings.json.
const userPoolId = "us-west-2_4czmlJC5x"
const client_id = '47ahgb3e4jqhk86o7gugvbglf8'

const region = userPoolId.split("_")[0]
const jwksUrl = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}/.well-known/jwks.json`;
const iss = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`

// Cache the keys (jwks) so we only have to fetch them on a cold start.
let jwks = null

async function getJwks() {
  // Fetch the cognito public keys used to encrypt tokens.
  return new Promise((resolve, reject) => {
    https.get(jwksUrl, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve(JSON.parse(data).keys));
      res.on('error', reject);
    });
  });
}

async function verifyJwt(token, ignoreExpiration=false) {
  // Verify the token is valid for our cognito user.

  if (!token) {
    throw new Error('No token provided.');
  }

  // Decode JWT header
  const { header } = jwt.decode(token, { complete: true });
  if (!header || !header.kid || !header.alg)
    throw new Error('Invalid token');
  // console.log(header)

  // If we don't have the keys (jwks), get and cache them.
  if (jwks === null) {
    console.log("MyData: Cold start.")
    jwks = await getJwks();
  } else {
    console.log("MyData: Warm start.")
  }

  // Find the key used to encrypt the token.
  const key = jwks.find((key) => key.kid === header.kid);
  if (!key) {
    // When the keys roll over there is a transition period where the
    // old keys still exist. As long as this code gets a cold start in that
    // period, the new keys get cached.
    throw new Error('Signing key not found.');
  }
  // console.log(`key: ${JSON.stringify(key, null, 2)}`)

  if (key.kty != "RSA") {
    console.log(`MyData: key.kty: ${key.kty}`)
    throw new Error('Algorithm not supported.');
  }

  // Convert the jwk key to a PEM public key.
  var pem = jwkToPem(key);

  // Verify that the token was for our cognito pool and the RS256
  // algorithm was used.
  const options = {
    algorithms: ['RS256'],
    issuer: iss,
  }

  // Ignore expiration is used for testing. Lambda passes a context
  // object not a boolean, so ignoreExpiration will never be true
  // there.
  if (ignoreExpiration === true) {
    console.log("MyData: Ignoring token expiration for testing.")
    options['ignoreExpiration'] = ignoreExpiration
  }

  // Verify the token was created with the Cognito public key.
  // See https://www.npmjs.com/package/jsonwebtoken for docs.
  const payload = jwt.verify(token, pem, options)

  if (payload.client_id != client_id)
    throw new Error('Wrong client_id.')

  return payload;
}

async function handler(event, context) {
  // Validate the request. For image requests make sure the user is
  // logged in.

  // Make sure this code is handling the viewer request event.
  const cf = event.Records[0].cf
  if (cf.config && cf.config.eventType) {
    const eventType = cf.config.eventType
    if (eventType && eventType != "viewer-request") {
      console.error(`MyData: this code is connected to the wrong event: ${eventType}`)
      return {
        'status': '400',
        'statusDescription': 'Bad Request',
      }
    }
  }

  const request = cf.request;
  const url = request.uri
  const headers = request['headers']

  // Allow all non-image requests.
  if (!url.startsWith('/images/')) {
    delete headers.auth
    return request
  }

  // Get the access token from the auth header of the image request.
  let access_token = null
  if (headers.auth)
    access_token = headers.auth[0].value
  else {
    console.log("MyData: No auth header. Create a Cloudfront Cache policy with auth.");
    console.log(`MyData: Event: ${JSON.stringify(event, null, 2)}`);
  }

  // Validate the access token.
  try {
    const payload = await verifyJwt(access_token, context);

    console.log(`MyData: Passed: user: ${payload.username} url: ${url}`);

    // Remove auth header.
    delete headers.auth

    // console.log(`MyData: Return request: ${JSON.stringify(request, null, 2)}`);
    return request;

  } catch (err) {
    console.log(`MyData: Failed: url: ${url}`);

    console.error(`MyData: error: ${err.message}`);

    return {
      'status': '401',
      'statusDescription': 'Unauthorized',
    }
  }
}

module.exports = { getJwks, verifyJwt, handler, region, userPoolId, client_id, iss };
