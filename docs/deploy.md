# Deploy

The deploy script updates the server with your changes.  It copies the
changed files to S3 and invalidates them in the cloudfront cache.

[⬇](#Contents) (table of contents at the bottom)

# Cache Behavior

The CloudFront cache control setting determine how long the file is
pulled from the cloudfront cache. The default is 24 hours but it has
been changed to one month. Once the time has expired, cloudfront looks
in S3 for new content.

You can issue CloudFront invalidation requests every time your site is
updated so the new files are removed from the cache.  The deploy
script does this. AWS gives 1,000 free invalidation paths per month;
each path, including a wildcard, counts as one. Deploy copies every
changed file to S3, then invalidates a small set of wildcards:
`/images/cN/*.html` for collections whose HTML changed, `/js/*`,
`/tin/*`, `/icons/*`, and exact paths for root files such as
`index.html`. Collection json is not invalidated; the site does not
fetch it. New jpg and mp4 files are not invalidated, because they are
not in CloudFront yet. A jpg or mp4 that already existed on S3 and
changed is invalidated so a delete-and-redownload gets the new bytes.
When more than 15 collection HTML folders change in one sync, deploy
invalidates `/*` instead.

Index thumbnails in `tin/`, icons, `favicon.ico`, and
`collections.webmanifest` get `Cache-Control: max-age=2592000` on S3
so the browser can reuse a fresh copy without a CloudFront round
trip. HTML, JS, CSS, and collection photos are uploaded without that
header. A recropped tin file or a new icon shows after a refresh, or
when the month expires.

Deploy compares file bytes, not headers. Existing objects do not pick
up max-age until you copy them again. Do that once:

~~~
scripts/deploy --tin-cache
~~~

After that, `scripts/deploy -s` sets the header on any of those files
whose bytes changed.

[⬇](#Contents)

# List Modified

You can use the deploy script to list the modified files without
copying them with the -m option.

It compares each local file to the S3 ETag. Small files use the MD5 of
the whole file. Files 8 MB or larger are uploaded in parts, so their
ETag is not a whole-file MD5; the script matches that multipart ETag
instead of copying them every time.

~~~
deploy —m
~~~

[⬇](#Contents)

# Sync

To deploy you run the deploy script with the -s option from the
collections folder. It shows the files it copies. If nothing is shown,
nothing was copied.

~~~
# from docker container
scripts/deploy -s
~~~

<style>body { max-width: 40em}</style>

# Contents

* [Cache Behavior](#cache-behavior) -- how the cloudfront cache works, how tin and icon files get max-age, and how invalidation paths are collapsed.
* [List Modified](#list-modified) -- how to list the files that need to be deployed.
* [Sync](#sync) -- how to deploy changed files.
