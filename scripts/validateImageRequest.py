# Verify that image requests are made by logged in users.
#
# This AWS lambda handler is called when a CloudFront https request
# happens. It responds to the User Access event (not the Origin access
# event) which happens early in the request process.

import json
import jwt
import time
from jwt import PyJWKClient

# You can get the client id, region and user pool id with the cognito
# script:
#
# scripts/cognito -s | grep 'client_id\|Id'

client_id = '47ahgb3e4jqhk86o7gugvbglf8'
region = "us-west-2"
userPoolId = "us-west-2_4czmlJC5x"

# JWKS stands for JSON Web Key Set, which is a collection of public
# cryptographic keys that are used to verify the authenticity and
# integrity of JSON Web Tokens (JWTs)

def getCognitoJwksUrls():
  """
  Return the cognito issuer and jwks urls for the user pool.
  """
  issuer = f"https://cognito-idp.{region}.amazonaws.com/{userPoolId}"
  jwksUrl = f"{issuer}/.well-known/jwks.json"
  return issuer, jwksUrl

def lambda_handler(event, context):
  """
  Verify that image requests are made by logged in users.

  The event parameter is json that contains variables about the
  request. You can determine the request url and the header
  information from it.

  The context parameter is an object that tells about the running
  environment.
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
    access_token = headers['user-id'][0]['value']
  else:
    access_token = None

  # If the user is not logged in, deny access.
  try:
    message = validateImageRequest(url, access_token)
  except Exception as ex:
    print(str(ex))
    message = "Raised an unexpected exception."
  if message:
    print(message)
    return {
      'status': '403',
      'statusDescription': 'Forbidden',
      'body': 'Unauthorized access.',
    }

  return request

def validateImageRequest(url, access_token):
  """
  Verify that image requests are made by logged in users. Return
  an empty string when valid, else return a message telling what went
  wrong. It may raise an exception for expected cases.
  """
  # Allow all non-image requests.
  if "image/" not in url:
    return ""

  # If the access_token is valid, assume the user is logged in.

  if not isinstance(access_token, str):
    return "Access token not a string."
  if len(access_token) > 5000:
    return "Access token is too big."

  # Get who issued the access token and the key used to sign it.
  issuer, jwksUrl = getCognitoJwksUrls()
  jwkClient = jwt.PyJWKClient(jwksUrl)
  signing_key = jwkClient.get_signing_key_from_jwt(access_token)

  try:
    # Decode and validate the access token.
    decoded_token = jwt.decode(access_token, signing_key.key,
      algorithms=["RS256"], audience=client_id, issuer=issuer)
  except jwt.ExpiredSignatureError:
    return("Token has expired.")
  except jwt.InvalidSignatureError:
    return("Invalid token signature.")
  except jwt.InvalidTokenError:
    return("Invalid token.")

  return ""
