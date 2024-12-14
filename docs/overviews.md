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
manually. Admin users see debugging controls in the UI.

# Create or Edit User

You create or edit a Collections user with the aws cognito console.

todo:
* temp password user must change on login
* you can delete or disable users
* there are options for verifying a users email

[⬇ ────────](#Contents)

# Deploy

The deplog script copies the changed files to S3 and invalidates them.

The CloudFront cache control setting determine how long the file is
pulled from the cloudfront cache. The default is 24 hours. Once the
time has expired, cloudfront looks in S3 for new content.

You can issue CloudFront invalidation requests every time your site is
updated so the new files are removed from the cache.  The deploy
script does this.

# Service Worker

The sw.ts is a Service Worker implementation that manages file
caching.  This enables the app to work offline and provides better
performance.

The service worker intercepts all HTTP/HTTPS requests, implements this
caching logic, and maintains its own application cache separate from
the browser's default cache.

It handles two main types of files differently:

* For image files (except the index page thumbnails), it checks the
cache first and only fetches from the network if not found in the
cache. This optimizes image loading and enables offline access.

* For all other files (html, js, icons, etc.), it tries the network
first to ensure fresh content, falling back to cached versions when
offline.

[⬇ ────────](#Contents)

# Contents

* [Login](#login) -- how the login process works.
* [Create or Edit User](#create-or-edit-user) -- how to create a new user or edit an existing one.
* [Deploy](#deploy) -- how to deploy and and invalidate files and how the cloudfront cache works.
* [Service Worker](#service-worker) -- how the sw.ts file caches files for performance and fresh connect.
