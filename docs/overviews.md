# Overviews

[![icon](rounded-icon.png)](#)

This page has general overviews about how the code works and why it is
done the way it is.

[⬇](#Contents) (table of contents at the bottom)

# File Perspective

The website from a file perspective.

From a file perspective the website consists of an index page and a
set of collection pages. A collection consists of a thumbnails page
an image page, a json file and images.

The collection files are named with the collection’s number.

Each of the three type of pages has an associated js page and the all
share the same css file and the same icons.

~~~
collections.css
js
    image.js
    index.js
    thumbnails.js
icons
    photo.svg
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
* c1.json
* header.tea

images-1.html is made from:

* images-tmpl.html
* c1.json
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
internet or they are created by AI.  The png icons come from the same
Ocean Side beach image at different resolutions.

Each collection consists 8, 10, 12, 14, or 16 full resolution jpg
images at their original aspect ratio. Each image has an associated
square 480 x 480 pixel jpg thumbnail.  The collection images are stored
in the image folder along with their json, and html pages.

Shown below are the first collection's image files.  Each file is
named after its collection "c1" in this case.  The full resolution
files end with "p.jpg".  The p stands for preview; preview of the
original raw file. The thumbnail images end with "t.jpg". The middle
number starts at 1. The collection image order is determine by the
cN.json file not the number in the files. Optional Live photos and
movie files end with "v.mp4".

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
  c1.json
  image-1.html
  thumbnails-1.html
~~~

The thumbnails used by the index page are duplicated in the tin
(thumbnail index) folder. If you shared the thumbnails with the image
folders, this would complicate the authentication. Also when you delete
a collection you want the index thumbnail to still exist. Each
collection has a 480 x 480 `-t.jpg` for the featured cards and a
96 x 96 `-s.jpg` for the compact one-line rows.

~~~
tin
  c1-3-t.jpg
  c1-3-s.jpg
  c2-1-t.jpg
  c2-1-s.jpg
~~~

Most of the image files are taken by me. The originals are iphone live
photos, dng, jpg, and tiff files. They are processed in photoshop or
camera raw to produce the website images.  The website treats the
images as immutable.

The aws-settings.json file is created by the cognito script by
querying AWS.

The production files are stored locally in the dist folder. For
production they’re stored in the AWS S3 flennikco bucket. AWS
Cloudfront copies them as needed to its edge location caches around
the world. The cN.json file is stored in the dist/image folders for a
backup, it is not downloaded by the app.

[⬇](#Contents)

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
urls for this. Note that downloading from localhost downloads from the
local images folder and does not go to cloudfront.

Admin users see the refresh and download icons.

Collections uses the AWS Cognito service to handle login.  This allows
collections to be a public static website without a backend server
(other than AWS).

Users login with an email and a password. You add and remove users
manually with the AWS Cognito console.

[⬇](#Contents)

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

* For tin thumbnails, icons, favicon, and the web manifest, it uses
the browser HTTP cache. A fresh max-age copy skips the network. A
reload revalidates. The application cache is the offline fallback.

* For HTML, CSS, and page JS, it shows the cached file immediately,
then revalidates in the background. When index.html changes, the
index page reloads so a newly published collection appears. A
manual refresh skips the cache and goes to the network.

* For sw.js, it revalidates every launch so a new service worker can
install. The application cache is the offline fallback.

[⬇](#Contents)

# Typescript Files

The TypeScript code is divided into small, modular files that are
concatenated during compilation to produce three main JavaScript
files: index.js, thumbnails.js, and images.js.

This modular approach keeps related code in focused, manageable files
that are easier to understand and maintain. The concatenation into
larger JavaScript files reduces HTTP requests and improves page load
performance compared to serving many smaller files.

[⬇](#Contents)

# Admin

Admin users can edit collections while running the app on localhost.
They see extra icons and they can edit descriptions inline. On the
thumbnails page they can edit the order and create new
thumbnails. There is a admin api to support this. A python web server
runs on localhost so the web app can post edits and save to the dist
folder.

Admin APIs:

* saveCollection -- saves the cN.json file.  Used when editing the zoom-points.
* saveDescription -- saves the description into the current cN.json file in the dist folder.
* saveOrder -- saves the image order in the cN.json file.
* saveThumbnail -- creates a new thumbnail from the p.jpg file using the specified crop rectangle.

<style>body { max-width: 40em}</style>

# Contents

* [File Perspective](#file-perspective) -- how the website is organized from a file perspective.
* [Login](#login) -- how the login process works.
* [Service Worker](#service-worker) -- how the sw.ts file caches files for performance and fresh connect.
* [Typescript Files](#typescript-files) -- how the typescript is divided into small modular files.
* [Admin](#admin) -- admin users can edit collections.