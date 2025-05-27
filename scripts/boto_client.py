import os
import boto3
import json
from collections import namedtuple

# todo, what to do with the exception parameter of getBotoClient?
def getBotoClient(serviceName, exception=None):
  """
  Return the boto3 client for the given AWS service. Services names
  like 's3', 'cognito-idp', 'ses', 'sts', etc.
  """
  configFilename = "/home/coder/.aws/config"
  credsFilename = "/home/coder/.aws/credentials"
  if not os.path.exists(configFilename) or not os.path.exists(credsFilename):
    if exception is None:
      exception = Exception
    raise exception("""\

Before this script can access your aws services, you need an
AWS account and an IAM user with with the correct permissions.
See the aws-config.md for how to get setup and run "aws configure".
""")
  return boto3.client(serviceName)

awsSettingsPath = '/home/coder/collections/env/aws-settings.json'
def getAwsSettings():
  """
  Return the aws settings from the aws-settings.json file as a dictionary.
  """
  with open(awsSettingsPath, 'r') as file:
    return json.load(file)

def getAwsParameters(filename=None):
  """
  Return a namedtuple containing the aws settings.  If you don't
  pass in the filename, the aws-settings.json file is used.
  """

  # edit me when [aws_settings.json] changes
  requiredParameters = [
    'client_id',
    'redirect_uri',
    'logout_uri',
    'scope',
    'domain',
    'redirect_uri_local',
    'logout_uri_local',
    'pool_name',
    'distribution_id',
    'bucket_name',
    'userPoolId',
  ]

  if filename and not os.path.exists(filename):
    raise Exception(f"""\
The aws settings file is missing. You can create it by running: scripts/cognito -w""")

  if filename is None:
    filename = awsSettingsPath

  # Read the aws parameters from the file.
  awsSettings = readJsonFile(filename)

  if "settings" not in awsSettings:
    raise Exception("Aws settings is missing the settings parameter.")

  settings = awsSettings['settings']

  # Make sure all the parameters we need exist.
  for parameter in requiredParameters:
    if parameter not in settings:
      raise Exception(f"Missing aws settings parameter: {parameter}.")

  AwsParameters = namedtuple('AwsParameters', settings)

  # edit me when [aws_settings.json] changes
  return AwsParameters(
    client_id=settings["client_id"],
    redirect_uri=settings["redirect_uri"],
    logout_uri=settings["logout_uri"],
    scope=settings["scope"],
    domain=settings["domain"],
    redirect_uri_local=settings["redirect_uri_local"],
    logout_uri_local=settings["logout_uri_local"],
    pool_name=settings["pool_name"],
    distribution_id=settings["distribution_id"],
    bucket_name=settings["bucket_name"],
    userPoolId=settings["userPoolId"],
  )

def readJsonFile(filename):
  with open(filename, 'r') as fh:
    return json.load(fh)

