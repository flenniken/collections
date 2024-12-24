# Overviews

[![icon](rounded-icon.png)](#)

This page has general overviews about how the code works and why it is
done the way it is.

[⬇](#Contents) (table of contents at the bottom)

# File Perspective

The website from a file perspective.

From a file perspective the website consists of an index page and a
set of collection pages. A collection consists of a thumbnails page
and an image page.

Each image and thumbnails page is named with the collection’s number.
Below we show the index file and the first two collections 1 and 2.

~~~
index.html
pages
    image-1.html
    image-2.html
    thumbnails-1.html
    thumbnails-2.html
~~~

Each of the three type of pages has an associated js page and the all
share the same css file and the same icons.

~~~
collections.css
js
    image.js
    index.js
    thumbnails.js
icons
    camera.svg
    download.svg
    …
~~~

Each html page is created from its statictea template and its json
file. All templates share the same header tea file.

index.html is made from:

* index-tmpl.html
* index.json
* header.tea
* aws-settings.json

thumbnails-1.html is made from:

* thumbnails-tmpl.html
* collection-1.json
* header.tea

images-1.html is made from:

* images-tmpl.html
* collection-1.json
* header.tea

The js files are created from a set of type script files.

index.js is made from:

* index.ts
* all.ts
* win.ts
* login.ts
* download.ts

thumbnails.js is made from:

* thumbnails.ts
* all.ts
* win.ts

image.js is made from:

* image.ts
* all.ts
* win.ts

sw.js is made from:

* sw.ts
* all.ts

Most of the icons are svg files. They are MIT licensed files from the
internet. The png icons come from the same Ocean Side beach image at
different resolutions.

Each collection consists 8, 10, 12, 14, or 16 full resolution jpg
files at their original aspect ratio. Each image has an associated
square 480 x 480 pixel jpg thumbnail.  The collection images are stored
in the image folder.

Shown below are the first collection's image files.  Each file is
named after its collection "c1" in this case.  The full resolution
files end with "p.jpg".  The p stands for preview; preview of the
original raw file. The thumbnail images end with "t.jpg". The middle
number starts a 1 and it determines the position on the thumbnail page
and the order on the image page.

The image files are not checked in.

~~~
images
  c1-1-p.jpg
  c1-1-t.jpg
  c1-2-p.jpg
  c1-2-t.jpg
  c1-3-p.jpg
  c1-3-t.jpg
  c1-4-p.jpg
  c1-4-t.jpg
  c1-5-p.jpg
  c1-5-t.jpg
  c1-6-p.jpg
  c1-6-t.jpg
  c1-7-p.jpg
  c1-7-t.jpg
  c1-8-p.jpg
  c1-8-t.jpg
~~~

The thumbnails used by the index page are duplicated in the tin
(thumbnail index) folder.

~~~
tin
  c1-3-t.jpg
  c2-1-t.jpg
~~~

Most of the image files are taken by me. The originals are iphone live
photos, dng, jpg, and tiff files. They are processed in photoshop or
camera raw to produce the website images.  The website treats the
images as immutable.

The index and image json files are currently created by hand.  The
aws-settings.json file is created by the cognito script by querying
AWS.

The production files are stored locally in the dist folder. For
production they’re stored in the AWS S3 flennikco bucket. AWS
Cloudfront copies them as needed to its edge location caches around
the world.

[⬇ ────────](#Contents)

# Login

Anyone can view the index page; it is visible to the public.  However
you need to be logged in to download a collection. Once you download a
collection you can continue to view it when not logged in.

As you login, your login details are stored in local
storage. Existence of this data, tells whether you are logged in or
not.

When you log out, the login local data is deleted and you are logged
out of cognito.

You can login when developing on localhost:8000.  There are redirect
urls for this.

Admin users see the debugging refresh and airplane icons at the bottom
of the index page and the airplane on the image page.

Collections uses the AWS Cognito service to handle login.  This allows
collections to be a public static website without a backend server
(other than AWS).

Users login with an email and a password. You add and remove users
manually.

[⬇ ────────](#Contents)

# Service Worker

The sw typescript file is a Service Worker implementation that manages
file caching.  This enables the app to work offline and provides
better performance.

The service worker intercepts all HTTP/HTTPS requests and maintains
its own application cache separate from the browser's default cache.

It handles image files differently then the other files:

* For image files, it checks the cache first and only fetches from the
network if not found in the cache. This optimizes image loading and
enables offline access.

* For all other files (html, js, icons, tin, etc.), it tries the network
first to ensure fresh content, falling back to cached versions when
offline.

[⬇ ────────](#Contents)

# Typescript Files

The TypeScript code is divided into small, modular files that are
concatenated during compilation to produce three main JavaScript
files: index.js, thumbnails.js, and images.js (one for each of
Collection's pages).

This modular approach keeps related code in focused, manageable files
that are easier to understand and maintain. The concatenation into
larger JavaScript files reduces HTTP requests and improves page load
performance compared to serving many smaller files.

# Contents

* [File Perspective](file-perspective) -- how the website is organized from a file perspective.
* [Login](#login) -- how the login process works.
* [Service Worker](#service-worker) -- how the sw.ts file caches files for performance and fresh connect.
* [Typescript Files](#typescript-files) -- how the typescript is divided into small modular files.
