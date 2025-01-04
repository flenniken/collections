# Verify that image requests are made by logged in users.
#
# This AWS lambda handler is called for a CloudFront User Access event
# (not the Origin access event) which happens early in the request
# process.

import json
import base64
from datetime import datetime
import json
import urllib.request
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.serialization import load_pem_public_key
# Lambda@edge doesn't support the importing libraries (layers) not
# already part of its system, for example the jwt library.

# Global variables can be used for caching because AWS Lambda reuses
# the same container for multiple invocations. When the container is
# first started and the handler is called, it's known as a "cold
# start". Subsequent calls to the already running handler are known as
# "warm starts".

# Cache the keys (jwks) so we only have to fetch them on a cold start
# or when the keys change.
cachedJwks = None

# Get the userPoolId from aws_settings.json.
userPoolId = "us-west-2_4czmlJC5x"

def lambda_handler(event, context):
  """
  Verify that image requests are made by logged in users.

  The event parameter is json that contains variables about the
  request. You can determine the request url and the header
  information from it.

  The context parameter is an object that tells about the running
  environment.

  Return a requests dictionary.
  """
  # You can log by printing. You can see logging when using the lambda
  # testing tab, however, requests from the internet are not logged
  # unless you enable it in cloudfront.

  # print("Lambda handler event: ", json.dumps(event))

  # Get the request url and the access_token in the header.
  request = event['Records'][0]['cf']['request']
  url = request['uri']
  headers = request['headers']
  if 'auth' in headers:
    access_token = headers['auth'][0]['value']
  else:
    access_token = None

  # For image requests deny access if the user is not logged in. Do
  # this by checking the url and by validating the access token.
  try:
    message = validateImageRequest(url, access_token)
    if message:
      print(message)
  except Exception as ex:
    print(str(ex))
    message = "Got an unexpected exception."
  if message:
    return {
      'status': '403',
      'statusDescription': 'Forbidden',
      'body': 'Unauthorized access.',
    }
  return request

def validateImageRequest(url, access_token):
  """
  Verify that image requests are made by logged in users.

  Return an empty string when valid, else return a message telling
  what went wrong. It may raise an exception for unexpected cases.
  """
  # Allow all non-image requests.
  if "images/" not in url:
    return ""

  global cachedJwks
  if cachedJwks:
    jwks = cachedJwks
  else:
    print("No cached jwks, cold start.")
    jwks = fetchJwks()
    if jwks is None:
      return "Unable to fetch the jwks."
    cachedJwks = jwks

  return validateAccessToken(jwks, access_token)

def fetchJwks():
  """
  Fetch the Cognito signing keys (jwks) using https and return
  them as a dictionary.
  """
  region = userPoolId.split("_")[0]
  jwksUrl = f"https://cognito-idp.{region}.amazonaws.com/{userPoolId}/.well-known/jwks.json"
  with urllib.request.urlopen(jwksUrl) as response:
    if response.status != 200:
      raise Exception("Unable to fetch the jwks.")
    return json.loads(response.read().decode())

def findJwksKey(kid, jwks):
  """
  Find a key in the jwks list given the key id. Return the key or
  None when not found.
  """
  for k in jwks["keys"]:
    if k['kid'] == kid:
      return k
  return None

def base64_url_decode(data):
  padding = '=' * (4 - len(data) % 4)
  return base64.urlsafe_b64decode(data + padding)

def validateAccessToken(jwks, token):
  """
  Validate the access token.

  Return an empty string when valid, else return a message telling
  what went wrong. It may raise an exception for unexpected cases.
  """
  header_b64, payload_b64, signature_b64 = token.split('.')
  header = json.loads(base64_url_decode(header_b64).decode('utf-8'))
  payload = json.loads(base64_url_decode(payload_b64).decode('utf-8'))
  signature = base64_url_decode(signature_b64)

  # The jwk keys get rotated about every 6 months. If the key is not
  # found, fetch new ones and look again.
  key = findJwksKey(header["kid"], jwks)
  if key is None:
    jwks = fetchJwks()
    key = findJwksKey(header["kid"], jwks)
    if key is None:
      return "Signing key not found."
    print("Keys rotated.")
    global cachedJwks
    cachedJwks = jwks

  if header["alg"] != "RS256":
    return "Unsupported header algorithm."
  if key["alg"] != "RS256":
    return "Unsupported key algorithm."

  # Construct the RSA public key
  n = int.from_bytes(base64_url_decode(key['n']), 'big')
  e = int.from_bytes(base64_url_decode(key['e']), 'big')
  public_key = rsa.RSAPublicNumbers(e, n).public_key()

  # Verify the signature
  try:
    public_key.verify(
      signature,
      f"{header_b64}.{payload_b64}".encode('utf-8'),
      padding.PKCS1v15(),
      hashes.SHA256()
    )
  except Exception as e:
    return "Invalid signature."

  # Validate expiration
  if payload.get('exp') < datetime.utcnow().timestamp():
    return "Token expired."

  return ""
