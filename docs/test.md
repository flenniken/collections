# Test

[![icon](rounded-icon.png)](#)

This page tells how to test and debug Collections.

[⬇](#Contents) (table of contents at the bottom)

# How to Test

You can test on Chrome, Safari or xcode simulator.

For Chrome you use the local server that’s running in the docker
container at http://localhost:8000 and work in a phone view. You
enable the mouse to simulate touch, see Test Touch. You set up at
least two phone views for a “iPhone 14 Pro Max”, portrait 430 x 933
and landscape 932 x 430.

For Safari you plug your iphone into your mac and debug remotely, see
Test on iphone.

For xcode simulator, you get it by installing xcode.  Launch it and
run an iphone 14 max.  Like chrome you use the local server that’s
running in the docker container at http://localhost:8000. You can test
the install process and two finger touching. It’s also good for making
screenshots that include the bezel. You can see the console log in
desktop safari like you do when debugging a plugged in iphone.

[⬇ ────────](#Contents)

# Test Touch

You can test one finger touch with your mouse in Chrome on your
desktop by turning on a setting in the developers tools.

* bring up tools, right click and select inspect
* bring up the run command: menu (three dots) > Run command
* type “sensors” in the Run box and type enter -- the sensors tab appears
* scroll down to the touch section and select "Force Enabled"
* test by mousing over the web page.  The mouse cursor should be a small circle.

[⬇ ────────](#Contents)

# Test on iphone

You can use safari on your mac to debug collections on an iphone
connected with a wire.  Safari works as if the app was on your mac.

You must have a new iphone os and matching mac os version. The os and
safari have the same version number and are bundled together, so look
at the mac version number to compare.

To debug:

* connect iphone with wire
* launch collections on iphone by tapping the collections desktop icon
* launch Safari on your mac
* pull down the develop menu and select collections

[⬇ ────────](#Contents)

# Image Page Tests

When making changes to the image page test them with these steps:

* zoom at a point
* zoom to limits, small and big, then pan around
* zoom when v scrolled
* double tap to restore
* h scroll
* h scroll half way and snap back
* flick h scroll
* h scroll and overscroll on both ends
* v scroll and overscroll on both ends
* zoom image small, go to thumbnails, tap the same image and verify image is at its zoom point
* long press to copy text then extend the selection
* rotate the last image then rotate it back and verify it remains on the same image
* scroll h & v in landscape mode
* no flash on load and no flash on rotate
* tap the thumbnails menu icon
* tap the index menu icon

[⬇ ────────](#Contents)

## Login-flow Script

You use login-flow script to manually step through the login process
for debugging and testing.  You can view and decode tokens.

~~~
# docker container
scripts/login-flow

This script is for testing the login flow that Collections uses.

The basic flow:

  * Use -l to get the login url.
  * Paste the login url in your browser and login, you will be redirected.
  * Copy the code in the url in your browser's address bar.
  * Use -g option specifying the code. This creates the tokens.json file.
  * Use -s to look at the tokens file.
  * Use -d id_token, -d access_token, -d refresh_token, to peer into each token.
~~~

# Contents

* [How to Test](#how-to-test) -- how to test on Safari, Chrome and xcode simulator.
* [Test Touch](#test-touch) -- how to configure touch on the desktop Chrome.
* [Test on iphone](#test-on-iphone) -- how to test on an iphone connected with a wire.
* [Image Page Tests](#image-page-tests) -- how to run regression tests for the image page.
* [Login-flow Script](#login-flow-script) -- how to debug the login process and look at tokens.
