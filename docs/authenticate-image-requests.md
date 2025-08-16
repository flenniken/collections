# Authenticate Image Requests

Images can only be downloaded by logged in users.

The server does the validation to prevent non-logged in users from
downloading images with direct urls and from scripts.

When the user requests a collection the code adds the user’s access
token to the image's https requests. The validImageRequest lambda
function is called by Cloudfront for every https request and it checks
that the token is valid. Since only logged in users have valid tokens,
only logged in users can download images.

[⬇](#Contents) (table of contents at the bottom)

# Main Steps

Here are the main steps for deploying a lambda edge function:

* test locally
* create zip file
* install in AWS
* test in lambda
* deploy to lambda edge
* test in production
* verify using the logs

[⬇](#Contents)

# Test Locally

You can run the testValidateImageRequest script to test the
validateImageRequest lambda function:

~~~
# from the container
node scripts/testValidateImageRequest.js
~~~

The output from the test is shown below. Each line that starts with *
is a test. The lines between the * lines are the log lines. The logs
lines appear in the lambda logs. The tests use the token file created
by login-flow.

~~~
* Test that the file globals match the aws-settings.json.
* Test reading the access token.
* Test getJwks.
* Test parseQueryString
* Test verifyJwt without a token.
* Test verifyJwt with an expired access token.
jwks: Cold start.
key: Hjmm61kvuj9K4xFRIfXxWCvhjHNNxy49CwSPfbBZUr0=
* Test verifyJwt with an access token.
jwks: Warm start.
key: Hjmm61kvuj9K4xFRIfXxWCvhjHNNxy49CwSPfbBZUr0=
warning: Ignoring token expiration for testing.
expires: 2025-02-19 06:40:17.000
jwks: Warm start.
key: Hjmm61kvuj9K4xFRIfXxWCvhjHNNxy49CwSPfbBZUr0=
warning: Ignoring token expiration for testing.
expires: 2025-02-19 06:40:17.000
* Test validateRequest with non-image.
* Test validateRequest with image but no query parameters.
No query parameters.
* Test validateRequest with image but no user query parameter.
Missing user query parameter.
* Test validateRequest with image but no id query parameter.
The id query parameter is missing.
* Test validateRequest with image but no token.
No token in the auth header.
* Test validateRequest with image and an invalid token.
VerifyJwt: Cannot destructure property 'header' of 'jwt.decode(...)' as it is null.
* Test validateRequest with image and a mismatched user.
jwks: Warm start.
key: Hjmm61kvuj9K4xFRIfXxWCvhjHNNxy49CwSPfbBZUr0=
warning: Ignoring token expiration for testing.
expires: 2025-02-19 06:40:17.000
Users do not match.
Url user: user
Token user: f86103f0-7021-705f-290b-aa443e8605c2
* Test validateRequest with image, good case.
jwks: Warm start.
key: Hjmm61kvuj9K4xFRIfXxWCvhjHNNxy49CwSPfbBZUr0=
warning: Ignoring token expiration for testing.
expires: 2025-02-19 06:40:17.000
* Test validateRequest with image but expired token.
jwks: Warm start.
key: Hjmm61kvuj9K4xFRIfXxWCvhjHNNxy49CwSPfbBZUr0=
VerifyJwt: jwt expired
* Test handler without an images url.
url: /test.html
id: undefined
user: undefined
auth: Passed
* Test handler with an images url but no token.
url: /images/test.html
id: asdf
user: fasdf
No token in the auth header.
auth: Failed
* Test good case.
url: /images/test.html
id: 12345678
user: f86103f0-7021-705f-290b-aa443e8605c2
jwks: Warm start.
key: Hjmm61kvuj9K4xFRIfXxWCvhjHNNxy49CwSPfbBZUr0=
warning: Ignoring token expiration for testing.
expires: 2025-02-19 06:40:17.000
auth: Passed
Success
~~~

[⬇](#Contents)

# Make Zip File

You run the make-js-lambda-zip script to make the lambda zip file. The
zip file contains the dependent external modules.

~~~
env/lambda/make-js-lambda-zip
~~~

The output of the script is shown below. Notice the zip file is named
after the node version number which is 22.18.0:

~~~
Remove existing /home/coder/collections/env/lambda/js directory
Copy validateImageRequest.js to the /home/coder/collections/env/lambda/js folder.
Install the dependent node modules.

added 26 packages, and audited 27 packages in 1s

1 package is looking for funding
  run `npm fund` for details

found 0 vulnerabilities
Create lambda-js-22.18.0.zip.
  adding: node_modules/ (stored 0%)
  adding: node_modules/.bin/ (stored 0%)
...
  adding: node_modules/semver/ranges/valid.js (deflated 38%)
  adding: package-lock.json (deflated 70%)
  adding: package.json (deflated 14%)
  adding: validateImageRequest.js (deflated 63%)
Success: created zip file:
-rw-r--r-- 1 coder coder 311104 Aug 16 04:05 lambda-js-22.18.0.zip
~~~

[⬇](#Contents)

# Upload Zip File

You upload the zip file which contains the lambda function and all its
dependent modules.  You specify the node runtime to use to match the
locally version that you tested with.

* login to aws
* select the N. Virgina region
* select the lambda service
* select the existing function validateImageRequest
* select the code tab and upload the new version
* enter node runtime 22.x to match the version tested
* deploy to lambda edge
* use viewer request

[⬇](#Contents)

# Update Node

The node versions don't last very long so you need to update them
frequently. The version that comes with Debian will be out-of-date in
18 months, way before Debian needs to be updated.  Instead of using
the Debian node package you use the PPA repository for the version you
want, for example 22. The Dockerfile installs node this way.

When it is time to install a new version, determine the new version
number and change a line in the dockerfile:

~~~
- && curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
+ && curl -fsSL https://deb.nodesource.com/setup_23.x | bash - \
~~~

Build a new container. Exit the current container, delete it, then
build a new one:

~~~
runenv d
runenv r
runenv r
~~~

Rebuild the gulp code and test it.

~~~
scripts/build-gulpfile
scripts/test-gulpfile
~~~

Update the version number in make-js-lambda-zip. In the example we are
updating from 18.19 to 22.18:

~~~
env/lambda/make-js-lambda-zip

-# v18.19.0
-version=18.19.0
+# v22.18.0
+version=22.18.0
~~~

Then go though the normal test and deploy steps explained in this
document.

[⬇](#Contents)

# Lambda Function

An AWS lambda function is called by Cloudfront for every https request
and it checks that the requests associated token is valid.

You associate the lambda function with the cloudfront distribution
using the "Behavior" tab.

You define the lambda function in the N. Virginia (us-east-1) region
since it is the only region that has access to the the edge locations
and it has the button to deploy to the edges.

The function responds to the Viewer Access event (not the Origin
access event).  This is the first event in the request process.

The function has two parameters, event and context.  The event
parameter contains variables about the request. The context parameter
tells about the running environment.

The event contains the request url and the token needed for
authentication.

The event structure is documented here:

https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/lambda-event-structure.html#request-event-fields

[⬇](#Contents)

# Edge Differences

Lambda@edge functions have a number of limitations and differences
compared to normal lambda functions. I had running and tested code in
lambda that failed when deploy to lambda edge.  I was attempting to
write a python lambda function since the existing login-flow script is
written in it. I ran into these issues:

* layers are not supported in lambda edge.

You can use external packages by using a zip file.

* the uncompressed zip file is limited to 1MB.

This rules out writing the lambda function in python since the
cryptography packages are about 15 MB. Use node js instead, their
package is small.

* it is slow to go outside the edge location.

This rules out using the Cognito get_user api for authentication.
Perform authenticate at the edge with node js.

* only the x86 platform is supported.

This is another strike against python when you’re developing on a new
mac since the cryptography packages are compiled rust binaries. Use
node js.

* finding the logs.

Since logging happens at the edge and are copied to the nearest
region. You need to learn how to find them for analysis.

* http return code variable.

The lambda sample shows the return code variable name as statusCode,
but this doesn't work in lambda edge.  Use the status variable.

* many headers are stripped by default.

The auth header used for holding the token is stripped by default. You
need to specify the ones you use so they don't get scripted.

<style>body { max-width: 40em}</style>

# Contents

* [Main Steps](#main-steps) -- steps to create a lambda function.
* [Test Locally](#test_locally) -- how to test the lambda function.
* [Make Zip File](#make_zip_file) -- how to make a lambda zip file of the code and modules.
* [Upload Zip File](#upload_zip_file) -- how to upload a new lambda function code.
* [Update Node](#update_node) -- how to update the version of node that lambda uses.
* [Lambda Function](#lambda-function) -- what the lambda function does and how to configure it.
* [Edge Differences](#edge-differences) -- differences between a lambda function and an lambda edge function.
