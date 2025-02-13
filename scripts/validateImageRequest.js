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

function parseQueryString(qs) {
  // Function to parse the request query string into an object.
  if (qs == undefined)
    return {}
  const params = qs.split('&');
  const result = {};
  for (const param of params) {
    if (param === "") continue
    let [key, value] = param.split('=');
    if (key === "" || value == "") continue
    result[decodeURIComponent(key)] = value;
  }
  return result;
}

async function verifyJwt(token, ignoreExpiration) {
  // Verify the token is valid for our cognito user.

  if (!token) {
    throw new Error('Missing token.');
  }
  if (ignoreExpiration == undefined) {
    throw new Error('Missing ignoreExpiration.');
  }

  // Decode JWT header.
  const { header } = jwt.decode(token, { complete: true });
  if (!header || !header.kid || !header.alg)
    throw new Error('Invalid token.');

  // If we don't have the keys (jwks), get and cache them.
  if (jwks === null) {
    console.log("jwks: Cold start.")
    jwks = await getJwks();
  }
  else {
    console.log("jwks: Warm start.")
  }

  // Find the key used to encrypt the token.
  const key = jwks.find((key) => key.kid === header.kid);
  if (key) {
    console.log(`key: ${key.kid}`)
  }
  else {
    // When the keys roll over there is a transition period where the
    // old keys still exist. As long as this code gets a cold start in that
    // period, the new keys get cached.
    throw new Error('Signing key not found.');
  }

  if (key.kty != "RSA") {
    throw new Error(`Algorithm not supported. key.kty: ${key.kty}`);
  }

  // Convert the jwk key to a PEM public key.
  var pem = jwkToPem(key);

  // Verify that the token was for our cognito pool and the RS256
  // algorithm was used.
  const options = {
    algorithms: ['RS256'],
    issuer: iss,
  }

  // Ignore expiration when testing.
  if (ignoreExpiration === true) {
    console.log("warning: Ignoring token expiration for testing.")
    options['ignoreExpiration'] = ignoreExpiration
  }

  // Verify the token was created with the Cognito public key.
  // See https://www.npmjs.com/package/jsonwebtoken for docs.
  const payload = jwt.verify(token, pem, options)

  if (payload.client_id != client_id)
    throw new Error('Wrong client_id.')

  // Log the expire date when we are ignoring it.
  if (ignoreExpiration === true) {
    const expires = new Date(payload.exp * 1000)
    const dateString = expires.toISOString()
    const formattedString = dateString.replace(/[TZ]/g, ' ');
    console.log(`Expires: ${formattedString}`);
  }

  return payload;
}

async function validateRequest(url, token, id, user, ignoreExpiration) {
  // Return true when the request is valid.

  // Allow all non-image requests.
  if (!url.startsWith('/images/')) {
    return true
  }

  // Make sure the id and user exist.
  if (!id && !user) {
    console.error("No query parameters.");
    return false
  }
  if (!user) {
    console.error("Missing user query parameter.")
    return false
  }
  if (!id) {
    console.error("The id query parameter is missing.")
    return false
  }

  // Make sure the token exists.
  if (!token) {
    // Most likely this is a direct request outside the website for an
    // image.  If you get this, it could be because you need to allow
    // auth header in Cloudfront Cache policy.
    console.error("No token in the auth header.")
    return false
  }

  // Validate the token.
  let payload = {}
  try {
    payload = await verifyJwt(token, ignoreExpiration);
  }
  catch (err) {
    console.error(`VerifyJwt: ${err.message}`);
    return false
  }

  // Validate that the user name on the url is the same as the token
  // user name.
  if (user != payload.username) {
    console.error("Users do not match.")
    console.log(`Url user: ${user}`)
    console.log(`Token user: ${payload.username}`)
    return false
  }

  return true
}

async function handler(event, context) {
  // Validate the request. For image requests make sure the user is
  // logged in.

  // Make sure this code is handling the viewer request event not some
  // other event.
  const cf = event.Records[0].cf
  if (cf.config && cf.config.eventType) {
    const eventType = cf.config.eventType
    if (eventType && eventType != "viewer-request") {
      console.error(`This code is connected to the wrong event: ${eventType}`)
      return {
        'status': '400',
        'statusDescription': 'Bad Request',
      }
    }
  }

  const request = cf.request;
  const url = request.uri
  const headers = request['headers']
  const queryParams = parseQueryString(request.querystring);
  const id = queryParams.id

  console.log(`url: ${url}`);
  console.log(`id: ${queryParams.id}`);
  console.log(`user: ${queryParams.user}`);

  // Get the access token from the auth header. It only exists on
  // image requests.
  let access_token = ""
  if (headers.auth)
    access_token = headers.auth[0].value

  // todo: change this to false after testing.
  const ignoreExpiration = true

  const ok = await validateRequest(url, access_token, queryParams.id,
                                   queryParams.user, ignoreExpiration)

  if (ok) {
    console.log("auth: Passed");
    return request;
  }
  else {
    console.error("auth: Failed");
    return {
      'status': '401',
      'statusDescription': 'Unauthorized',
    }
  }
}

module.exports = { getJwks, verifyJwt, handler, region, userPoolId, client_id, iss,
                   parseQueryString, validateRequest};
