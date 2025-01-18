const https = require('https');
const jwt = require('jsonwebtoken');
const jwkToPem = require('jwk-to-pem');

// Set these values from the values in aws-settings.json.
const userPoolId = "us-west-2_4czmlJC5x"
const client_id = '47ahgb3e4jqhk86o7gugvbglf8'

const region = userPoolId.split("_")[0]
const jwksUrl = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}/.well-known/jwks.json`;

// Cache the keys (jwks) so we only have to fetch them on a cold start.
jwks = null

async function getJwks() {
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
  if (!token) {
    throw new Error('No token provided.');
  }

  // Decode JWT header
  const { header } = jwt.decode(token, { complete: true });
  if (!header || !header.kid || !header.alg)
    throw new Error('Invalid token');
  // console.log(header)

  // If we don't have the jwks, get and cache them.
  if (jwks === null) {
    console.log("Cold start.")
    jwks = await getJwks();
  }

  // Find the matching key
  const key = jwks.find((key) => key.kid === header.kid);
  if (!key) {
    // When the keys roll over there is a transition period where the
    // old keys still exist. As long as this code gets a cold start in that
    // period, the new keys get cached.
    throw new Error('Signing key not found.');
  }
  // console.log(`key: ${JSON.stringify(key, null, 2)}`)

  if (key.kty != "RSA") {
    console.log(`key.kty: ${key.kty}`)
    throw new Error('Algorithm not supported.');
  }

  // Convert the jwk key to a PEM public key.
  var pem = jwkToPem(key);

  // Verify the token was created with the Cognito public key.

  iss = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`

  options = {
    algorithms: ['RS256'],
    issuer: iss,
  }

  // Ignore expiration is used for testing. Lambda passes a context
  // object not a boolean, so ignoreExpiration will never be true
  // there.
  if (ignoreExpiration === true) {
    console.log("Ignoring token expiration for testing.")
    options['ignoreExpiration'] = ignoreExpiration
  }

  // See https://www.npmjs.com/package/jsonwebtoken for docs.
  const payload = jwt.verify(token, pem, options)

  if (payload.client_id != client_id)
    throw new Error('Wrong client_id.')

  return payload;
}

async function handler(event, context) {

  // Get the request url and the access_token in the header.
  const request = event.Records[0].cf.request;
  const url = request.uri
  const headers = request['headers']

  // Allow all non-image requests.
  if (!url.startsWith('/images/')) {
    delete headers.auth
    return request
  }

  let access_token = null
  if (headers.auth)
    access_token = headers.auth[0].value
  else {
    console.log("No auth header. Create a Cloudfront Cache policy with auth.");
    console.log(`Event: ${JSON.stringify(event, null, 2)}`);
  }

  try {
    const payload = await verifyJwt(access_token, context);

    console.log(`Passes: user: ${payload.username} url: %{url}`);

    // Remove auth header.
    delete headers.auth

    // console.log(`Return request: ${JSON.stringify(request, null, 2)}`);
    return request;

  } catch (err) {
    console.log(`Fails: image: %{url}`);

    console.error(err.message);

    return {
      'status': '401',
      'statusDescription': 'Unauthorized',
    }
  }
}

module.exports = { getJwks, verifyJwt, handler, region, userPoolId, client_id };
