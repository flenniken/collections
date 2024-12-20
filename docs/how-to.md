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

# Create or Edit User

You create or edit a Collections user with the aws cognito console.

todo:
* temp password user must change on login
* you can delete or disable users
* there are options for verifying a users email

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

# Contents

* [Create or Edit User](#create-or-edit-user) -- how to create a new user or edit an existing one.
* [Deploy](#deploy) -- how to deploy and and invalidate files and how the cloudfront cache works.
* [Login-flow Script](#login-flow-script) -- authentication testing tool
