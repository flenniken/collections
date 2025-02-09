# Authenticate Image Requests

Images can only be downloaded by logged in users.

The server does the validation to prevent non-logged in users from
downloading images with direct urls and from scripts.

When the user downloads a collection, the code adds the user’s access
token to the image https request for validation on the server. The
access token comes from Cognito when the user logs in.


[⬇](#Contents) (table of contents at the bottom)

# Lambda Function

When cloudfront receives an image request, the viewer event lambda
function checks that the token is valid. Only logged in users have
valid tokens

You associate the lambda function with the cloudfront distribution
using the“Behavior” tab.

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

# Main Steps

Here are the main steps for deploying a lambda edge function:

* create lambda js function locally
* test locally
* create zip file
* upload zip file to lambda in us-east-1
* test in lambda
* deploy to lambda edge
* wait for deploy
* test in production
* verify code works by looking at the logs

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

[⬇](#Contents)

# Test

You test the code by downloading with and without a valid token.

* todo: write test steps
* automate the testing
* test with curl after deployed by downloading:

~~~
https://collections.sflennik.com/images/c1-1-p.jpg

https://collections.sflennik.com/icons/camera.svg
~~~

Tests:

* non-image download
* image without token
* image with expired token
* image with valid token
* image with wrong user
* image with wrong distribution
* warm and cold starts

# Contents

* [Lambda Function](#lambda-function) -- what the lambda function does and how to configure it.
* [Main Steps](#main-steps) -- steps to create a lambda function.
* [Edge Differences](#edge-differences) -- differences between a lambda function and an lambda edge function
* [Test](#test) -- how to test the lambda function
