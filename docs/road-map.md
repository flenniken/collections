# Road Map

Planned near term features.

[⬇](#Contents) (table of contents at the bottom)

# Use flenniken.net

Switch the domain from sflennik.com to flenniken.net.

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

# Remove Branding

Make it easy to rebrand the code. Currently the desktop icon, the name "Flenniken Collections" and the domain sflennik.com would be replaced when someone builds their own collection web site. Maybe use a config file and make these things variables?

The image json shouldn't be checked in.

[⬇](#Contents)

# Image Click does Nothing

Why the clicking an index image does nothing. Is there a better way?

Touching an index image does nothing so you can scroll around the
index without accidentally switching context. Also it's that way so
when you hand your phone to someone else it doesn’t go off onto some
strange page or switch apps. I seen this happen many times with the
iphone app.

It goes against the user expectation to do nothing. Is there a way to
support tapping on the index picture and without the mentioned bad
things happening?  Overlay the image icon on top of the thumbnail?

[⬇](#Contents)

# Description Formatting

Support basic formatting of the descriptions, paragraphs?  Maybe newlines, bold, bullets?

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

# Associate with Originals

Make it easy to find the Collection’s originals in the original photos
albums.  Maybe use the unique id from metadata? Or some combination of
filename, date or other metadata.

[⬇](#Contents)

<style>body { max-width: 40em}</style>

# Contents

* [Use flenniken.net](#use-flenniken.net) -- switch the domain from sflennik.com to flenniken.net.
* [More Button](#more-button) -- add a button at the bottom of the index when there are a lot of collections.
* [Test Image Page](#test-image-page) -- write unit tests for the image page.
* [Remove Branding](#remove-branding) -- make it easy to rebrand, name, icons, domain, etc.
* [Readable Build Messages](#readable-build-messages) -- only print important build messages.
* [Play Live Photos](#play-live-photos) -- done.
* [Encourage Preferred Usage](#encourage-preferred-usage) -- encourage visiting the image page from start to finish.
* [Image Click does Nothing](#image-click-does-nothing) -- why the clicking an index image does nothing.
* [Description Formatting](#description-formatting) -- support basic description formatting.
* [Zoom Point Generation](#zoom-point-generation) -- test calculating a new zoom point set for the resolution.
* [testValidateImageRequest.js](#testValidateImageRequest-js) -- redo the test using the same style as the other test code.
* [Different Bundler](#different-bundler) -- use a different bundler for easier sharing of code.
* [view-download](#view-download) -- show the unique id with view-download so you can look up the details with it.
* [Time Tag](#time-tag) -- use the time tag for the post date on the index page.
* [Statictea Lambda](#statictea-lambda) -- investigate building collections on a lambda function.
* [Client Cache]($client-cache) -- test when a change affects the user's cache.
* [Billing Alarm](#billing-alarm) -- setup a billing alarm and document the steps.
* [Tab Bar](#tab-bar) -- test different locations for the tab bar.
* [Cognito Logs](#cognito-logs) -- document how to find and read the Cognito logs.
* [Low Quota](#low-quota) -- test with a low disk space quoto.
* [Share Menu](#share-menu) -- disable long press share menu for the thumbnails.
* [Associate with Originals](#associate-with-originals) -- make it easy to find the collection image originals.