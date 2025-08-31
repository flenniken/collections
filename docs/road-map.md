# Road Map

Planned near term features.

[⬇](#Contents) (table of contents at the bottom)

# Desktop Badge

Show the red circle over the collection's icon when there is a new
collection. Launching collections is enough to make the red circle go
away.

AWS seems to provide a push notification service that supports Apple
Push Notification Service (APNs).

See the Badges note.

[⬇](#Contents)

# Local Badge

Show a red circle next to the collections title on the index page
for collections not viewed. Visiting the thumbnails or image page is
enough to make the red circle go away.

Remove the red circle when the user touches it or the title. Make the
red circle appear when the user touches the title.

When a collection is deleted the red circle should not reappear.

Keep track of seen collections in local storage.

[⬇](#Contents)

# Use flenniken.net

Switch the domain from sflennik.com to flenniken.net.

[⬇](#Contents)

# Scroll Description

Show a vertical scrollbar for long descriptions on the image page. Currently the vertical space allowed for all descriptions is determined by the longest one.  This leaves a lot of white space for shorter descriptions.

[⬇](#Contents)

# One Line Index

Continue to use big thumbnails for the newest collections.  Use one
line index entries for older collections. The line contains a small
thumbnail, title, thumbnails icon, image icon.

[⬇](#Contents)

# More Button

When there are a lot of collections, show buttons at the bottom of
the index page. The buttons will dynamically fetch the next or previous set of
collections replacing all the existing ones. Next, Previous, Newest buttons?

[⬇](#Contents)

# Test Image Page

Write unit tests for the image page. Test zoom point generation and
other low level functions.

[⬇](#Contents)

# Order List

The order list shouldn’t exists for published collections. Add checks
to the build process to check for this.

[⬇](#Contents)

# Remove Branding

Make it easy to rebrand the code. Currently the desktop icon, the name "Flenniken Collections" and the domain sflennik.com would be replaced when someone builds their own collection web site. Maybe use a config file and make these things variables?

[⬇](#Contents)

# Readable Build Messages

Only print important build messages when running "g all". Currently
most of the message are just noise. For example after changing image.ts and running "g all" you see

~~~
(debian)~/collections $ g all
[20:26:32] Using gulpfile ~/collections/tmp/gulpfile.js
[20:26:32] Starting 'all'...
[20:26:32] Starting 'missing-folders'...
[20:26:32] Finished 'missing-folders' after 4.54 ms
[20:26:32] Starting 'ts'...
[20:26:32] Starting 'pages'...
[20:26:32] Starting 'css'...
[20:26:32] Starting 'm-css'...
[20:26:32] Starting 'vpages'...
[20:26:32] Starting 'i'...
[20:26:32] Starting 't'...
[20:26:32] Starting 'x'...
[20:26:32] Starting 'sw'...
[20:26:32] Starting 'cm'...
[20:26:32] Starting 'index'...
[20:26:32] Starting 'maker'...
[20:26:32] Starting 'ready'...
[20:26:32] Starting 'modified'...
[20:26:32] Starting 'css'...
[20:26:32] Starting 'm-css'...
[20:26:32] Starting 'vindex'...
[20:26:32] Starting 'vmaker'...
[20:26:32] Starting 'vready'...
[20:26:32] Compiling index template.
[20:26:32] Compiling the maker template
[20:26:32] 6 ready collections
[20:26:32] Building collection 6 thumbnails page.
[20:26:32] Building collection 6 images page.
[20:26:32] Building collection 5 thumbnails page.
[20:26:32] Building collection 5 images page.
[20:26:32] Building collection 4 thumbnails page.
[20:26:32] Building collection 4 images page.
[20:26:32] Building collection 3 thumbnails page.
[20:26:32] Building collection 3 images page.
[20:26:32] Building collection 2 thumbnails page.
[20:26:32] Building collection 2 images page.
[20:26:32] Building collection 1 thumbnails page.
[20:26:32] Building collection 1 images page.
[20:26:32] Finished 'ready' after 71 ms
[20:26:32] Clean up modified collection: 6
[20:26:32] Clean up modified collection: 5
[20:26:32] Clean up modified collection: 4
[20:26:32] Clean up modified collection: 3
[20:26:32] Clean up modified collection: 2
[20:26:32] Clean up modified collection: 1
[20:26:32] Finished 'modified' after 91 ms
[20:26:32] Validating html file: dist/index.html.
[20:26:32] Finished 'vindex' after 92 ms
[20:26:32] Validating html file: dist/maker.html.
[20:26:32] Finished 'vmaker' after 93 ms
[20:26:32] 6 ready collections
[20:26:32] Validate: 6
[20:26:32] Validating html file: dist/images/c6/image-6.html.
[20:26:32] Validating html file: dist/images/c6/thumbnails-6.html.
[20:26:32] Validate: 5
[20:26:32] Validating html file: dist/images/c5/image-5.html.
[20:26:32] Validating html file: dist/images/c5/thumbnails-5.html.
[20:26:32] Validate: 4
[20:26:32] Validating html file: dist/images/c4/image-4.html.
[20:26:32] Validating html file: dist/images/c4/thumbnails-4.html.
[20:26:32] Validate: 3
[20:26:32] Validating html file: dist/images/c3/image-3.html.
[20:26:32] Validating html file: dist/images/c3/thumbnails-3.html.
[20:26:32] Validate: 2
[20:26:32] Validating html file: dist/images/c2/image-2.html.
[20:26:32] Validating html file: dist/images/c2/thumbnails-2.html.
[20:26:32] Validate: 1
[20:26:32] Validating html file: dist/images/c1/image-1.html.
[20:26:32] Validating html file: dist/images/c1/thumbnails-1.html.
[20:26:32] Finished 'vready' after 260 ms
[20:26:32] Finished 'vpages' after 266 ms
[20:26:32] dist/index.html is unchanged.
[20:26:32] Finished 'index' after 307 ms
[20:26:32] dist/maker.html is unchanged.
[20:26:32] Finished 'maker' after 312 ms
[20:26:32] dist/images/c6/thumbnails-6.html is unchanged.
[20:26:32] dist/images/c6/image-6.html is unchanged.
[20:26:32] dist/images/c5/thumbnails-5.html is unchanged.
[20:26:32] dist/images/c5/image-5.html is unchanged.
[20:26:32] dist/images/c4/thumbnails-4.html is unchanged.
[20:26:32] dist/images/c4/image-4.html is unchanged.
[20:26:32] dist/images/c3/thumbnails-3.html is unchanged.
[20:26:32] dist/images/c3/image-3.html is unchanged.
[20:26:32] dist/images/c2/thumbnails-2.html is unchanged.
[20:26:32] dist/images/c2/image-2.html is unchanged.
[20:26:32] dist/images/c1/thumbnails-1.html is unchanged.
[20:26:32] dist/images/c1/image-1.html is unchanged.
[20:26:32] Compiling ./pages/collections.css - 4.76 kB
[20:26:32] Copy collections.css - 2.99 kB
[20:26:32] Compiling ./pages/collections.css - 4.76 kB
[20:26:32] Copy collections.css - 2.99 kB
[20:26:32] Compiling ./pages/maker.css - 3.9 kB
[20:26:32] Copy maker.css - 3.07 kB
[20:26:32] Compiling ./pages/maker.css - 3.9 kB
[20:26:32] Copy maker.css - 3.07 kB
[20:26:32] File size: ./ts/all.ts - 1.01 kB
[20:26:33] File size: ./ts/all.ts - 1.01 kB
[20:26:33] File size: ./ts/all.ts - 1.01 kB
[20:26:33] File size: ./ts/all.ts - 1.01 kB
[20:26:33] File size: ./ts/all.ts - 1.01 kB
[20:26:33] File size: ./ts/win.ts - 2.19 kB
[20:26:33] File size: ./ts/win.ts - 2.19 kB
[20:26:33] File size: ./ts/win.ts - 2.19 kB
[20:26:33] File size: ./ts/sw.ts - 6.86 kB
[20:26:33] w3c-html-validator ✔ pass dist/images/c3/thumbnails-3.html
[20:26:33] w3c-html-validator ✔ pass dist/images/c6/thumbnails-6.html
[20:26:33] w3c-html-validator ✔ pass dist/images/c5/thumbnails-5.html
[20:26:33] w3c-html-validator ✔ pass dist/images/c1/image-1.html
[20:26:33] w3c-html-validator ✔ pass dist/maker.html
[20:26:33] w3c-html-validator ✔ pass dist/images/c2/image-2.html
[20:26:33] w3c-html-validator ✔ pass dist/images/c4/image-4.html
[20:26:33] w3c-html-validator ✔ pass dist/images/c4/thumbnails-4.html
[20:26:33] w3c-html-validator ✔ pass dist/index.html
[20:26:33] w3c-html-validator ✔ pass dist/images/c6/image-6.html
[20:26:33] w3c-html-validator ✔ pass dist/images/c5/image-5.html
[20:26:33] w3c-html-validator ✔ pass dist/images/c1/thumbnails-1.html
[20:26:33] w3c-html-validator ✔ pass dist/images/c3/image-3.html
[20:26:33] w3c-html-validator ✔ pass dist/images/c2/thumbnails-2.html
[20:26:33] Compiled ./sw.js - 8.14 kB
(node:5070) [DEP0180] DeprecationWarning: fs.Stats constructor is deprecated.
(Use `node --trace-deprecation ...` to show where the warning was created)
[20:26:33] File size: ./ts/win.ts - 2.19 kB
[20:26:33] File size: ./ts/cjsonDefinition.ts - 5.12 kB
[20:26:33] File size: ./ts/cjsonDefinition.ts - 5.12 kB
[20:26:33] File size: ./ts/thumbnails.ts - 2.9 kB
[20:26:34] Compiled ./thumbnails.js - 6.04 kB
[20:26:34] File size: ./ts/cjsonDefinition.ts - 5.12 kB
[20:26:34] Finished 'css' after 1.9 s
[20:26:34] Finished 'm-css' after 1.9 s
[20:26:34] Finished 'pages' after 1.9 s
[20:26:34] Finished 'css' after 1.9 s
[20:26:34] Finished 'm-css' after 1.9 s
[20:26:34] File size: ./ts/userInfo.ts - 926 B
[20:26:34] File size: ./ts/userInfo.ts - 926 B
[20:26:34] File size: ./ts/maker.ts - 26.57 kB
[20:26:34] dist/sw.js is unchanged.
[20:26:34] Finished 'sw' after 1.91 s
[20:26:34] File size: ./ts/login.ts - 7.51 kB
[20:26:34] File size: ./ts/test-maker.ts - 18.39 kB
[20:26:34] Compiled ./maker.js - 48.62 kB
[20:26:34] dist/js/thumbnails.js is unchanged.
[20:26:34] Finished 't' after 2.49 s
[20:26:34] File size: ./ts/image.ts - 25.44 kB
[20:26:35] Compiled ./image.js - 29.77 kB
[20:26:35] File size: ./ts/download.ts - 6.46 kB
[20:26:35] File size: ./ts/index.ts - 12.28 kB
[20:26:35] Compiled ./index.js - 30.93 kB
[20:26:35] ---> Copy to dist/js/image.js
[20:26:35] dist/maker.js is unchanged.
[20:26:35] Finished 'cm' after 3.4 s
[20:26:35] dist/js/index.js is unchanged.
[20:26:35] Finished 'x' after 3.41 s
[20:26:35] Finished 'i' after 3.41 s
[20:26:35] Finished 'ts' after 3.41 s
[20:26:35] Finished 'all' after 3.42 s
~~~

The only lines I want to see are the warnings and the copy line:

~~~
[20:26:33] Compiled ./sw.js - 8.14 kB
(node:5070) [DEP0180] DeprecationWarning: fs.Stats constructor is deprecated.
(Use `node --trace-deprecation ...` to show where the warning was created)
[20:26:35] ---> Copy to dist/js/image.js
~~~

[⬇](#Contents)

# Renew Tokens

Fetch new tokens when the old ones expire. Update the login-flow
script to learn how to do it then implement it in the web app login
code. Also update the lambda function.

[⬇](#Contents)

# Play Live Photos

Support live photos on the image page.

[⬇](#Contents)

# Image Page Icon

Replace the image camera icon with a different icon. Currently it is a
camera but that can mean take a picture, not view a picture.

[⬇](#Contents)

# Encourage Preferred Usage

The encouraged user interaction is to scroll to find a collection on
the image page then go to the image page to view the photos.  The
collection order and story is intended to be viewed starting from the
start.  Later after viewing the collection, the thumbnail view is a
quick way to revisit an image. We don't encourage starting with the
thumbnail view.

[⬇](#Contents)

# Image Click does Nothing

Why the clicking an index image does nothing. Is there a better way?

Touching an index image does nothing so you can scroll around the
index without accidentally switching context. Also it's that way so
when you hand your phone to someone else it doesn’t go off onto some
strange page or switch apps. I seen this happen many times with the
iphone app.

It goes against the user expectation to do nothing. Is there a way to
support clicking on the index picture and without the mentioned bad
things happening?  Overlay the image icon on top of the thumbnail?

[⬇](#Contents)

# Thumbnail Icon

Remove the thumbnail icon from the index page but leave it on
the image page?

[⬇](#Contents)

# Automatically Download Source

Automatically download the new versions of html, js and css code. Fix
so refresh is not needed. The service working should always download
new html, css and js files.

[⬇](#Contents)

# Screen Size

Adjust the test portrait and landscape dimensions in Chrome developer
tools to match my iphone dimensions.  It seems to be off by 1.  Maybe
there is a difference between browsers?  The code logs that there are
no zoom points for the current size so it generates some based on the
existing ones.

* Chrome: 430 x 932 and 932 x 430
* IPhone: 430 x 933 and 932 x 430

[⬇](#Contents)

# Description Formatting

Support basic formatting of the descriptions, paragraphs?  Maybe newlines, bold, bullets?

[⬇](#Contents)

# Validate Dimensions

Read image files when building and validate the thumbnail and image
dimensions for a collection in build mode.  Test the failure case.

[⬇](#Contents)

# Zoom Limited

You are limited how much you can zoom vertical images in landscape
mode. See the first Hawaii image and the the Santa Fe collection bowl.

[⬇](#Contents)

# Zoom Point Generation

If there are no zoom points for a resolution, the code calculates a
new set for the resolution.  It finds the close zoom points and starts
from that.  In the case below the new zoom points didn't look very
good.

~~~
No zoom points for this size, create new zoom points.
image.js:201 Existing zoom points: 430x784,430x933,932x490,932x430
image.js:291 Closest zoompoint key: 932x490
image.js:210 Image zoom points for 933 x 430
image.js:231 i1: 4032 x 3024, scale: 0.4, t: (-11.32, -692.93)
image.js:231 i2: 4032 x 3024, scale: 0.23, t: (0, 0)
image.js:231 i3: 3024 x 4032, scale: 0.25, t: (-2.66, -154.33)
image.js:231 i4: 4032 x 3024, scale: 0.24, t: (-13.82, -50.68)
image.js:231 i5: 3024 x 4032, scale: 0.24, t: (-10.14, -52.17)
image.js:231 i6: 4032 x 3024, scale: 0.24, t: (-4.66, -57.61)
image.js:231 i7: 4032 x 3024, scale: 0.53, t: (-3.95, -62.76)
image.js:231 i8: 2556 x 2556, scale: 0.43, t: (-84.68, -316.22)
~~~

[⬇](#Contents)

# testValidateImageRequest.js

Use sweet-tester for auth tests? Redo the testValidateImageRequest.js
file. Switch to typescript code?

[⬇](#Contents)

# Different Bundler

Use a different bundler to it is easier to share typescript code
between the website and the build and test systems.

A JavaScript module bundler is a tool that combines multiple
JavaScript files and their dependencies into a single file (or a few
files). This process is known as bundling. Bundlers are essential for
modern web development because they help manage and organize code,
optimize performance, and improve the user experience.

Currently the gulp based system is hard to share typescript code
between the collection’s website and the build and test code. The gulp
system uses typescript to combine multiple files into one js
file. This works well for the website but for the node based build
system and test code it doesn’t. what is the file unit?

How do you divide a large typescript code base into smaller code files
and share the code between a website and a node based build and test
system?

We recently updated node from 18 to 22, I think this helps.

Why does file size repeat? is all.ts built over and over?

~~~
[21:50:12] File size: ./ts/all.ts - 1.01 kB
[21:50:12] File size: ./ts/all.ts - 1.01 kB
[21:50:12] File size: ./ts/all.ts - 1.01 kB
[21:50:12] File size: ./ts/all.ts - 1.01 kB
[21:50:12] File size: ./ts/all.ts - 1.01 kB
[21:50:12] File size: ./ts/win.ts - 2.19 kB
[21:50:12] File size: ./ts/win.ts - 2.19 kB
~~~

[⬇](#Contents)

Show the unique id with view-download so you can look up the details with it.

[⬇](#Contents)

# Time Tag

* Use the time tag for the post date on the index page:

~~~
 <time datetime="{postDate}">
{postDate2}</time>

 <time datetime="2025-01-16">
Jan 16, 2025</time>
~~~

[⬇](#Contents)

# Photo Location

Put the photo's coordinates in the UI with a link to google maps:
(20.7473920, -156.4571441) see “google map link” note.

Use metar to extract the metadata for the maker app and fill in the
initial collection json.

Update metar nim version and simplify to just docker build environment
-- no mac build env.

[⬇](#Contents)

# Statictea Lambda

Investigate building collections on a lambda function.

[⬇](#Contents)

# Client Cache

Care must be taken when making changes that affect the client
cache. Is there a way to test for this?

If the page js file changes, the html pages might not be compatible.
In that case regenerate them all. This is a scaling issue. long term
solution is to generate the html as needed with a server.

[⬇](#Contents)

# Billing Alarm

Document how to configure a billing alarm. You use cloudwatch to set
it.  You can set alarms when quotas you define are hit.  See:

* https://docs.aws.amazon.com/cognito/latest/developerguide/tracking-quotas-and-usage-in-cloud-watch-and-service-quotas.html

[⬇](#Contents)

# Tab Bar

Safari has options to put the tab bar in different places -— test
them. See safari setting in the iphone settings — doesn’t collections
assume the tab is at the top?

[⬇](#Contents)

# Cognito Logs

Figure out how to read the AWS cognito logs and document it.  It would
be useful to see who logs in.

You can get current log data of aws cognito actions.  Additionally you
can save the logs to s3.  See:

* https://docs.aws.amazon.com/cognito/latest/developerguide/logging-using-cloudtrail.html
* https://docs.aws.amazon.com/cognito/latest/developerguide/exporting-quotas-and-usage.html

[⬇](#Contents)

# Low Quota

Test with low custom storage quota, see Chrome > dev tools >
application > storage

[⬇](#Contents)

# Drag Icon

Disable long press drag icon on the index, thumbnails and images pages.

[⬇](#Contents)

Disable long press share menu for the thumbnails on the index and
thumbnails pages but leave it on the images page.

[⬇](#Contents)

# Associate with Originals

Make it easy to find the Collection’s originals in the original photos
albums.  Maybe use the unique id from metadata? Or some combination of
filename, date or other metadata.

[⬇](#Contents)

<style>body { max-width: 40em}</style>

# Contents

* [Desktop Badge](#desktop-badge) -- show the red circle over the collection's icon when there is a new collection.
* [Local Badge](#local-badge) -- show a red circle on the index page for collections not viewed.
* [Use flenniken.net](#use-flenniken.net) -- switch the domain from sflennik.com to flenniken.net.
* [Scroll Description](#scroll-description) -- scroll long descriptions on the image page.
* [One Line Index](#one-line-index) -- use a one line index entry for older collections.
* [More Button](#more-button) -- add a button at the bottom of the index when there are a lot of collections.
* [Test Image Page](#test-image-page) -- write unit tests for the image page.
* [Order List](#order-list) -- the order list shouldn’t exists after optimizing.
* [Remove Branding](#remove-branding) -- make it easy to rebrand, name, icons, domain, etc.
* [Readable Build Messages](#readable-build-messages) -- only print important build messages.
* [Renew Tokens](#renew-tokens) -- handle expiring login tokens.
* [Play Live Photos](#play-live-photos) -- support live photos on the image page.
* [Image Page Icon](#image-page-icon) -- replace the image camera icon with a different icon.
* [Encourage Preferred Usage](#encourage-preferred-usage) -- encourage visiting the image page from start to finish.
* [Image Click does Nothing](#image-click-does-nothing) -- why the clicking an index image does nothing.
* [Thumbnail Icon](#thumbnail-icon) -- remove the thumbnail icon from the index page.
* [Automatically Download Source](#automatically-download-source) -- automatically download the new versions of html, js and css code.
* [Screen Size](#screen-size) -- determine the screen size on the iphone and is it stable.
* [Description Formatting](#description-formatting) -- support basic description formatting.
* [Validate Dimensions](#validate-dimensions) -- validate the thumbnail and image dimensions when building.
* [Zoom Limited](#zoom-limited) -- fix zoom vertical images in landscape mode.
* [Zoom Point Generation](#zoom-point-generation) -- test calculating a new zoom point set for the resolution.
* [testValidateImageRequest.js](#testValidateImageRequest-js) -- redo the test using the same style as the other test code.
* [Different Bundler](#different-bundler) -- use a different bundler for easier sharing of code.
* [view-download](#view-download) -- show the unique id with view-download so you can look up the details with it.
* [Time Tag](#time-tag) -- use the time tag for the post date on the index page.
* [Photo Location](#photo-location) -- put the photo's coordinates in the UI with a link to google maps.
* [Statictea Lambda](#statictea-lambda) -- investigate building collections on a lambda function.
* [Client Cache]($client-cache) -- test when a change affects the user's cache.
* [Billing Alarm](#billing-alarm) -- setup a billing alarm and document the steps.
* [Tab Bar](#tab-bar) -- test different locations for the tab bar.
* [Cognito Logs](#cognito-logs) -- document how to find and read the Cognito logs.
* [Low Quota](#low-quota) -- test with a low disk space quoto.
* [Drag Icon](#drag-icon) -- disable long press drag icon on the index, thumbnails and images pages.
* [Share Menu](#share-menu) -- disable long press share menu for the thumbnails.
* [Associate with Originals](#associate-with-originals) -- make it easy to find the collection image originals.