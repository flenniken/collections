# Verify that image requests are made by logged in users.
#
# This AWS lambda handler is called for a CloudFront User Access event
# (not the Origin access event) which happens early in the request
# process.

import json
import boto3
# Lambda@edge doesn't support third party modules.

def lambda_handler(event, context):
  """
  Verify that image requests are made by logged in users.

  The event parameter is json that contains variables about the
  request. You can determine the request url and the header
  information from it.

  The context parameter is an object that tells about the running
  environment.
  """
  client = boto3.client('cognito-idp')
  return lambda_handler_client(client, event, context)

def lambda_handler_client(client, event, context):
  """
  Verify that image requests are made by logged in users.

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

  # For image requests deny access if the user is not logged in.
  try:
    message = validateImageRequest(client, url, access_token)
  except Exception as ex:
    print(str(ex))
    message = "Raised an unexpected exception."
  if message:
    # print(message)
    return {
      'status': '403',
      'statusDescription': 'Forbidden',
      'body': 'Unauthorized access.',
    }
  return request

def validateImageRequest(client, url, access_token):
  """
  Verify that image requests are made by logged in users.

  Return an empty string when valid, else return a message telling
  what went wrong. It may raise an exception for unexpected cases.
  """
  # Allow all non-image requests.
  if "images/" not in url:
    return ""

  # If the access token can be used to get user info, then it is valid.
  try:
    response = client.get_user(AccessToken=access_token)
    # if response:
    #   print(response)
    if 'Username' not in response:
      return "Invalid user."
  except client.exceptions.NotAuthorizedException:
    return "Not authorized."
  except client.exceptions.UserNotFoundException:
    return "User not found."
  except client.exceptions.ResourceNotFoundException:
    return "Resource not found."
  except client.exceptions.InvalidParameterException:
    return "Invalid parameter."
  except client.exceptions.TooManyRequestsException:
    return "Too many requests."
  except client.exceptions.PasswordResetRequiredException:
    return "Password reset required."
  except client.exceptions.UserNotConfirmedException:
    return "User not confirmed."
  except client.exceptions.InternalErrorException:
    return "Internal error."
  except client.exceptions.ForbiddenException:
    return "Forbidden."

  return ""
