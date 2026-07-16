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

The user stays logged in 30 days.  This is a setting in Cognito.  The
access token expires in an hour but it is refreshed whenever it is
needed and is not noticeable by the user.

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
  -r, --refreshTokens   get new access and id tokens (oauth2/token endpoint). Uses the
                        refresh token in tmp/tokens.json and overwrites the file. Cognito
                        does not return a refresh token unless rotation is enabled; the
                        existing refresh token is kept so you can refresh again.
  -k, --revokeTokens    revoke the refresh token (oauth2/revoke endpoint) in tmp/tokens.json and
                        its related tokens
  -f url filename, --fetchUrl url filename
                        Download the given URL using the saved token and save it to the specified
                        filename.
~~~

[⬇](#Contents)

# Login Url

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

# Get User Tokens

You use the -g option with the login code to fetch the user tokens.
The tokens are written to the file tokens.json in the tmp folder.

~~~
scripts/login-flow -g fba8fc61-3d64-44ba-95e9-788924366569

Wrote the tokens to tmp/tokens.json.
~~~

[⬇](#Contents)

# View Token File

You use the -s option to look at the tokens file.  It is a json file
with three kinds of tokens. Besides the tokens it contains the expire
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

# Decode Token

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

Cognito refresh tokens are encrypted. `-d refresh_token` shows the
token header and length, not a payload like access and id tokens:

~~~
scripts/login-flow -d refresh_token

{
  "token_type": "refresh_token",
  "note": "Cognito refresh tokens are encrypted. Only the header can be read.",
  "length": 1800,
  "header": {
    "kid": "...",
    "alg": "RS256",
    "enc": "A256GCM"
  }
}
~~~

# User

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

# Download Image

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

[⬇](#Contents)

# Token Refresh Test Plan

Use this plan to verify Cognito token refresh for the browser app and
for scripts that read `tmp/tokens.json`. Access tokens expire in about
one hour. The browser refreshes automatically before API calls using
the refresh token stored in `userInfo`.

**Prerequisites**

Get a fresh set of tokens in the `tmp/tokens.json` file using -l then
-g.

~~~
scripts/login-flow -l

Enter the following url ...

https:.../index.html
~~~

Log in, copy the code from the redirect url, then:

~~~
scripts/login-flow -g <code>

/oauth2/token url: '...'
Wrote the tokens to tmp/tokens.json.
...
~~~

Confirm tokens.json contains `access_token`, `refresh_token`,
and `expires_in` using the -s option:

~~~
scripts/login-flow -s

{
  "access_token": ...
  "refresh_token": ...
  "expires_in": 3600,
  ...
}
~~~

**1. Check access token**

Decode and validate the access token.

Make sure the access token decodes using the -d option:

~~~
scripts/login-flow -d access_token

{
  "sub": "...",
  "iss": "...",
  "version": 2,
  "client_id": "...",
  "token_use": "access",
  "exp": ...,
  ...
}
~~~

Validate the access token using the -v option. Invalid tokens show an
error message. Valid tokens show the decoded token.

The `exp` claim in the decoded token should be about an hour in the
future.

~~~
scripts/login-flow -v access_token

{
  "sub": "...",
  "iss": "...",
  "version": 2,
  "client_id": "...",
  "token_use": "access",
  "exp": 1784223543,
  ...
}
~~~

The exp number is a unix timestamp.  You can convert it to human
readable using: https://unixtime.org/.  For exp = 1784223543 the
readable info:

| Format | Seconds |
| -------- | -------- |
| GMT | Thu Jul 16 2026 17:39:03 GMT+0000 |
| Your Time Zone | Thu Jul 16 2026 10:39:03 GMT-0700 (Pacific Daylight Time) |
| Relative | in an hour |


Show the user information using the -u option. This confirms Cognito
accepts the access token. The userInfo response has profile fields, not
JWT claims like `exp`.

~~~
scripts/login-flow -u

url: 'https:...'
{
  "sub": "...",
  "custom:admin": "false",
  "given_name": "Steve",
  "family_name": "Flenniken",
  "email": "...",
  "username": "..."
}
~~~

**2. Refresh token**

Refresh the tokens using the refresh token in `tmp/tokens.json`.

~~~
scripts/login-flow -r

/oauth2/token url: '...'
Wrote the tokens to tmp/tokens.json.
...
~~~

Decode the new access token. Note the `exp` value from step 1. After
refresh, `exp` should be different and about an hour in the future.
That confirms Cognito issued a new access token.

~~~
scripts/login-flow -d access_token

{
  "sub": "...",
  "iss": "...",
  "exp": ...,
  ...
}
~~~

Confirm user info still works:

~~~
scripts/login-flow -u

url: 'https:...'
{
  "sub": "...",
  "given_name": "...",
  ...
}
~~~

**3. Expired access token**

Simulate an expired access token without waiting.

Edit `tmp/tokens.json` and replace only `access_token` with the string
`expired`. Keep the `refresh_token` unchanged.

~~~
nano tmp/tokens.json

{
  "access_token": "expired",
  "expires_in": 3600,
  "id_token": ...
  "token_type": "Bearer",
  "refresh_token": ...
}
~~~

Refresh should still succeed.

~~~
scripts/login-flow -r

/oauth2/token url: '...'
Wrote the tokens to tmp/tokens.json.
...
~~~

The user info should still show:

~~~
scripts/login-flow -u

url: 'https:...'
{
  "sub": "...",
  ...
}
~~~

**4. Revoke token**

A refresh should fail after revoke.

Revoke the refresh token in `tmp/tokens.json`.

~~~
scripts/login-flow -k

url: '...'
The access token was successfully revoked.
~~~

A refresh should now fail with a non-200 response.

~~~
scripts/login-flow -r

/oauth2/token url: ...
Coginto responded with status code: 400
The file was not written. Response text:
{"error":"invalid_grant"}
~~~

**5. Refresh on Saving**

Test that refresh happens when needed before saving a notification
subscription.

Log in on `http://localhost:8000`, enable notifications, and confirm
the subscription saves.

Edit the userInfo using the javascript console.  Paste the following
to expire the access token and clear the saved notification state so
the app tries to save again:

~~~
const userInfo = JSON.parse(localStorage.getItem('userInfo'))
userInfo.access_token = 'expired'
userInfo.access_token_expires_at = Date.now() - 60000
localStorage.setItem('userInfo', JSON.stringify(userInfo))
localStorage.removeItem('notificationsOn')
~~~

Switch tabs away and back. The console should show a refresh followed
by a successful save:

~~~
Notifications: page visible
Notifications: Access token expired, refreshing
Access token refreshed
Notifications: state switched to on, saving subscription
Notifications: subscription saved
~~~

**6. Clear Session**

Test that the browser session is cleared when refresh is impossible.

Log in again if step 5 logged you out. In the Console, remove the
refresh token and expire the access token:

~~~
const userInfo = JSON.parse(localStorage.getItem('userInfo'))
delete userInfo.refresh_token
userInfo.access_token_expires_at = Date.now() - 60000
localStorage.setItem('userInfo', JSON.stringify(userInfo))
~~~

Reload the page.

The app should clear login state and show the login button:

~~~
No refresh token stored, user must log in again
~~~

**7. Notification script refresh**

Test that the notification script refreshes the token.

~~~
scripts/notification -s chrome-subscription.json

Saved subscription for user ....
~~~

<style>body { max-width: 40em}</style>

# Contents

* [Run login-flow](#run-login-flow) -- how to run login-flow and see its options.
* [Login Url](#login-url) -- how to login and get a code.
* [Get User Tokens](#get-user-tokens) -- how to fetch the tokens with the code.
* [View Token File](#view-token-file) -- how to few the token file.
* [Decode Token](#decode-token) -- how to decode the three tokens in the token file.
* [User](#validate-token) -- how to decode and validate three tokens in the token file.
* [User Information](#user-information) -- how to get the user information with the access_token.
* [Download Image](#download-image) -- how to download an image using the access_token.
* [View Logs](#view-logs) -- how to view the logs associated with the download.
* [Token Refresh Test Plan](#token-refresh-test-plan) -- verify Cognito token refresh for the browser and scripts.
