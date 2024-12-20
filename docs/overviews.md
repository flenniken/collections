# Overviews

[![icon](rounded-icon.png)](#)

This page has general overviews about how the code works and why it is
done the way it is.

[⬇](#Contents) (table of contents at the bottom)

# Login

As you login, your name, token, expire date and other login details
are stored in local storage. Existence of this data, tells whether you
are logged in or not.

When you log out, the login local data is deleted and you are logged
out of cognito.

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

It handles two main types of files differently:

* For image files (except the index page thumbnails), it checks the
cache first and only fetches from the network if not found in the
cache. This optimizes image loading and enables offline access.

* For all other files (html, js, icons, etc.), it tries the network
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

* [Login](#login) -- how the login process works.
* [Service Worker](#service-worker) -- how the sw.ts file caches files for performance and fresh connect.
* [Typescript Files](#typescript-files) -- how the typescript is divided into small modular files.
