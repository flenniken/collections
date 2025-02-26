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

[⬇](#Contents) (table of contents at the bottom)

# Run login-flow

You run the command without options to see the available options:

~~~
scripts/login-flow
~~~

The output:

~~~
usage: PROG [-h] [-t] [-l] [-o] [-g code] [-s] [-d token] [-v token] [-u] [-r] [-k]
            [-f url filename]

This script is for testing the login flow that Collections uses.

options:
  -h, --help            show this help message and exit
  -t, --test            run internal unit tests. Use alone to run all tests.
  -l, --showLoginUrl    show the login url (oauth2/authorize endpoint)
  -o, --showLogoutUrl   show the logout url (logout endpoint)
  -g code, --getTokens code
                        get the cognito tokens (oauth2/token endpoint) and write them to
                        tmp/tokens.json. Specify a login code.
  -s, --showTokens      show the tmp/tokens.json file
  -d token, --decodeToken token
                        decode a token from the tmp/tokens.json file, specify id_token,
                        access_token, or refresh_token
  -v token, --decodeAndValidate token
                        decode and validate a token from the tmp/tokens.json file, specify
                        id_token, access_token, or refresh_token
  -u, --getUserInfo     show the user information (oauth2/userInfo endpoint) given an access token
                        in tmp/tokens.json.
  -r, --refreshTokens   get a new access and id token but not a refresh token (oauth2/token
                        endpoint). It uses the refresh token in tmp/tokens.json and overwrites the
                        file with the new tokens. Since the refresh token is not in the file,
                        calling refresh again will fail.
  -k, --revokeTokens    revoke the refresh token (oauth2/revoke endpoint) in tmp/tokens.json and
                        its related tokens
  -f url filename, --fetchUrl url filename
                        Download the given URL using the saved token and save it to the specified
                        filename.
~~~

[⬇](#Contents)

# Login Url (-l)

Get the login url with the -l option. You follow the instructions to
login.

~~~
scripts/login-flow -l

Enter the following url into your browser to login.  After logging in
it will redirect to the redirect_uri which will contain a code and a
state of "loggedInTest". You have a few minutes to use the code to get
tokens with the -g option.

https://pool18672788.auth.us-west-2.amazoncognito.com/oauth2/authorize?client_id=47ahgb3e4jqhk86o7gugvbglf8&state=loggedInTest&response_type=code&scope=openid%20profile%20aws.cognito.signin.user.admin&redirect_uri=https://collections.sflennik.com/index.html
~~~

After you login the redirect url contains a code that you copy and
paste for the -g option:

~~~
https://collections.sflennik.com/index.html?code=fba8fc61-3d64-44ba-95e9-788924366569&state=loggedInTest
~~~

[⬇](#Contents)

# Get User Tokens (-g)

You use the -g option with the login code to fetch the user tokens.
The tokens are written to the file tokens.json in the tmp folder.

~~~
scripts/login-flow -g fba8fc61-3d64-44ba-95e9-788924366569

Wrote the tokens to tmp/tokens.json.
~~~

[⬇](#Contents)

# View Token File (-s)

You use the -s option to look at the tokens file.  It is a json file
with three kinds for tokens. Besides the tokens it contains the expire
time in seconds and the token type:

~~~
{
  "id_token": "eyJraWQiOiJuYnR...",
  "access_token": "eyJraWQiOiJIam1tN...",
  "refresh_token": "eyJjdHkiOiJKV1Qi...",
  "expires_in": 3600,
  "token_type": "Bearer"
}
~~~

[⬇](#Contents)

# Decode Token (-d)

You can decode each token with the -d option. The example command
decodes the id_token:

~~~
scripts/login-flow -d id_token

{
  "at_hash": "...",
  "sub": "...",
  "custom:admin": "true",
  "iss": "...",
  "cognito:username": "...",
  "given_name": "Logan",
  "origin_jti": "...",
  "aud": "...",
  "event_id": "...",
  "token_use": "...",
  "auth_time": ...,
  "exp": ...,
  "iat": ...,
  "family_name": "Flow",
  "jti": ...
  "email": ...
}
~~~

# Validate Token (-v)

You can validate each token with the -v option. In the example the
id_token has expired:

~~~
scripts/login-flow -v id_token

Signature has expired
~~~

[⬇](#Contents)

# User Information (-u)

This -u option calls the coginto oauth2/userInfo endpoint with the
access_token to get the user attribute information.

~~~
scripts/login-flow -u

{
  "sub": "...",
  "custom:admin": "true",
  "given_name": "Logan",
  "family_name": "Flow",
  "email": "steve.flenniken+logan@gmail.com",
  "username": "..."
}
~~~

[⬇](#Contents)

# Refresh Tokens (-r)

todo: document Refresh Tokens

[⬇](#Contents)

# Revoke Tokens (-k)

todo: document Revoke Tokens

[⬇](#Contents)

# Download Image (-f)

You can download an image using the stored token for authentication.
It downloads to the specified filename.  It tells you the time and
download id so you can find the associated log lines.

~~~
scripts/login-flow -f https://collections.sflennik.com/images/c1/c1-1-p.jpg image.jpg

Wrote file: image.jpg

   day     download id             user
----------  --------  ------------------------------------
2025-02-25  O4YGRbu1  f86103f0-7021-705f-290b-aa443e8605c2
~~~

[⬇](#Contents)

# View Logs

You can view the associated cloudfront and lambda logs for the
download.

**Cloudfront log**

Wait about 5 minutes for the Cloudfront log to get copied to the S3 bucket, then sync the files locally and run the view-download command. It will show you the download log line:

~~~
# wait about 5 minutes
scripts/sync-logs
scripts/view-download 2025-02-25 O4YGRbu1

2025-02-25 05:09:30 SEA900-P1 200 O4YGRbu1 f86103f0       Miss 1.540 /images/c1/c1-1-p.jpg
No lambda log files found with that day.
~~~

**Lambda log**

Since the edge location was SEA900-P1 the region is probably
us-west2. Go to the AWS lambda console for Oregon region (us-west2)
and copy the logs to s3. (See the full procedure in the logging
doc). Then sync the logs locally and run the view-download command:

~~~
scripts/sync-logs
scripts/view-download 2025-02-25 O4YGRbu1

2025-02-25 05:09:30 SEA900-P1 200 O4YGRbu1 f86103f0       Miss 1.540 /images/c1/c1-1-p.jpg
2025-02-25 05:09:29.036 b6ae6c2d
2025-02-25 05:09:29.036 b6ae6c2d Version: 32
2025-02-25 05:09:29.049 b6ae6c2d url: /images/c1/c1-1-p.jpg
2025-02-25 05:09:29.069 b6ae6c2d id: O4YGRbu1
2025-02-25 05:09:29.069 b6ae6c2d user: f86103f0-7021-705f-290b-aa443e8605c2
2025-02-25 05:09:29.070 b6ae6c2d jwks: Cold start.
2025-02-25 05:09:29.472 b6ae6c2d key: Hjmm61kvuj9K4xFRIfXxWCvhjHNNxy49CwSPfbBZUr0=
2025-02-25 05:09:29.569 b6ae6c2d warning: Ignoring token expiration for testing.
2025-02-25 05:09:29.572 b6ae6c2d auth: Passed
2025-02-25 05:09:29.572 b6ae6c2d expires: 2025-02-25 05:54:27.000
2025-02-25 05:09:29.670 b6ae6c2d 633.95 ms
~~~

* [Run login-flow](#run-login-flow) -- how to run login-flow and see its options.
* [Login Url (-l)](#login-url-l) -- how to login and get a code.
* [Get User Tokens (-g)](#get-user-tokens-g) -- how to fetch the tokens with the code.
* [View Token File (-s)](#view-token-file-s) -- how to few the token file.
* [Decode Token (-d)](#decode-token-d) -- how to decode the three tokens in the token file.
* [Validate Token (-v)](#validate-token-v) -- how to decode and validate three tokens in the token file.
* [User Information (-u)](#user-information-u) -- how to get the user information with the access_token.
* [Download Image (-f)](#download-image-f) -- how to download an image using the access_token.
* [View Logs](#view-logs-f) -- how to view the logs associated with the download.
