# Road Map

Planned near term features.

[⬇](#Contents) (table of contents at the bottom)

# Download Image

On the image page when you long press an image, pop up a menu to save
the image.

Currently you can see this in action on the index page when you long
press on a thumbnail (we should disable this).

[⬇](#Contents)

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

<style>body { max-width: 40em}</style>

# Contents

* [Download Image](#download-image) -- enable download of full size image on the image page.
* [Desktop Badge](#desktop-badge) -- show the red circle over the collection's icon when there is a new collection.
* [Local Badge](#local-badge) -- show a red circle on the index page for collections not viewed.
* [Use flenniken.net](#use-flenniken.net) -- switch the domain from sflennik.com to flenniken.net.
* [Scroll Description](#scroll-descriptions) -- scroll long descriptions on the image page.
* [One Line Index](#one-line-index) -- use a one line index entry for older collections.
* [More Button](#more-button) -- add a button at the bottom of the index when there are a lot of collections.
* [Test Image Page](#test-image-page) -- write unit tests for the image page.
* [Order List](#order-list) -- the order list shouldn’t exists after optimizing.
* [Remove Branding](#remove-branding) -- make it easy to rebrand, name, icons, domain, etc.
* [Readable Build Messages](#readable-build-messages) -- only print important build messages.
* [Renew Tokens](#renew-tokens) -- handle expiring login tokens.
