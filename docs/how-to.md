# How To

[![icon](rounded-icon.png)](#)

This page tells you how to perform common collections tasks like
deploying the app and creating new users.

[⬇](#Contents) (table of contents at the bottom)

# Deploy

The deploy script updates the server with your changes.  It copies the
changed files to S3 and invalidates them in the cloudfront cache.

The CloudFront cache control setting determine how long the file is
pulled from the cloudfront cache. The default is 24 hours. Once the
time has expired, cloudfront looks in S3 for new content.

You can issue CloudFront invalidation requests every time your site is
updated so the new files are removed from the cache.  The deploy
script does this.

You run the deploy script from the collections folder. It shows the
files it copies.

~~~
# from docker container
scripts/deploy -s
~~~

You can use the deploy script to list the modified files without
copying them with the -m option. You can also list the collections s3
bucket contents with the -l option.

You can tell when your code is deployed by using the -w option. It
polls the distribution status and tells you when the code has been
fully deployed.  It checks every five seconds and outputs a dot.

~~~
deploy —w

deploying……
deployed in 20 seconds
~~~

[⬇](#Contents)

# Create User

You add a new user using the AWS Cognito console in two steps, first
create the user then set their name.

Step 1:

Create a user specifying their email address and a temporary
password. In the console find the "Create user" button at this path:

~~~
Amazon Cognito > User pools > collections-pool > Users > Create user
~~~

* select "Send an email invitation"
* add email: e.g. steve.Flenniken+steps@gmail.com
* enter a temporary password: e.g. Password1$
* push "Create user" button

Step 2:

Edit the user and set their name.

* User attributes > Edit
* click "Add Attribute"
* in the Attribute Name editbox type "given_name"
* in the Value edit box type name, e.g. "Steve"
* Click add another
* in the Attribute Name editbox type their "family_name"
* in the Value edit box type their name, e.g. "Flenniken"
* push the Save button

The user will receive an email telling them their email address and
password.  The password will expire if not used in 7 days.  The first
time they login, they set a permanent password.

Note: You can use the plus sign in emails for testing so multiple
unique email addresses go to the same place. For example:
steve.flenniken+testme@gmail.com

[⬇](#Contents)

# Login-flow Script

The login-flow script is a testing and diagnostic tool for
Collections' AWS Cognito authentication system. It helps you verify
the authentication flow and troubleshoot issues.

It provides a command-line interface to exercise and verify all
aspects of the OAuth 2.0 authentication flow, including login, logout,
token management, and user profile access.

The script allows you to test the complete authentication lifecycle:
generating login/logout URLs, exchanging authorization codes for
tokens, inspecting JWT tokens (access, ID, and refresh tokens), and
retrieving user information from Cognito's endpoints. All tokens are
persisted in a JSON file, allowing for subsequent operations like
token refresh and revocation.

[⬇](#Contents)

# Contents

* [Create User](#create-user) -- how to create a new user using the AWS console.
* [Deploy](#deploy) -- how to deploy and and invalidate files and how the cloudfront cache works.
* [Login-flow Script](#login-flow-script) -- authentication testing tool.
* [Http Logging](#http-logging) -- how to turn on http request logging.
