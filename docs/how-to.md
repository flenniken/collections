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

# Http Logging

You can turn on http request logging. CloudFront will copy log files
to your bucket.  It costs a little so it is off by default.

You turn it on in the cloud front console. Look for "Standard log
destinations" and log to your bucket e.g. sflennikco using the
Partitioning "/log".

You need to wait about a minute after making a request before logs
appear.

Copy the logs locally to analyze them:

~~~
# from docker container
cd ~/collections
aws s3 sync s3://slennikco/logs logs
~~~

33 fields appear on each log line and it’s hard to read. You can view
the data one field per line using the following command:

~~~
# from container
file= EHLMG1T8SOX48.2024-11-23-21.e30560f4.gz # variable
zcat logs/$file\
  | awk '{for(i=1; i<=NF; i++) {printf "%20s: %s\n", f[i], $i}; \
  {print "\n"}}\
  /#Fields: / {for(i=1; i<=NF; i++) {f[i] = $(i+1)}}' \
  | less
~~~

# Contents

* [Create or Edit User](#create-or-edit-user) -- how to create a new user or edit an existing one.
* [Deploy](#deploy) -- how to deploy and and invalidate files and how the cloudfront cache works.
* [Login-flow Script](#login-flow-script) -- authentication testing tool.
* [Http Logging](#http-logging) -- how to turn on http request logging.
