# Caches

Collection uses a couple caches to speed it up, the Cloudfront cache
and the javascript cache. We don't use the normal browser http cache.
Safari also has a memory cache that is used automatically.

There are several procedures you can use to investigate the web site
caches:

* use aws command line to see what is in S3
* use curl to see what is in the Cloudfront cache
* use javascript to see what is in the local cache. 
* use the network tab to view the request headers
* use curl to view the request headers
* use the console log to determine the service worker code path
* use deploy or the Cloudfront console to invalidate files
* use the trashcan to delete a collection from the local cache
* airDrop json 

[⬇](#Contents) (table of contents at the bottom)

# S3

The production site files are deployed to S3.  Files are stored
uncompressed.  Cloudfront pulls from S3 when needed to satisfy network
requests and it caches the result in its cache.

Below we list the headers for image-59.html:

~~~
aws s3api head-object \
    --bucket sflennikco \
    --key images/c59/image-59.html
{
    "AcceptRanges": "bytes",
    "LastModified": "2026-11-06T22:45:54+00:00",
    "ContentLength": 37372,
    "ETag": "\"f72b6ac8d14392a6dba30b3a9d6a1d98\"",
    "ContentType": "text/html",
    "ServerSideEncryption": "AES256",
    "Metadata": {}
}
~~~

[⬇](#Contents)

# Safari Network Tab

You can see the request headers in the safari developer tools network
tab for an iphone plugged into your desktop.

For the image-59.html file:

~~~
Response
:status: 200
Age: 3419
Content-Encoding: br
Content-Type: text/html
Date: Fri, 06 Nov 2026 23:33:43 GMT
ETag: W/"f72b6ac8d14392a6dba30b3a9d6a1d98"
Last-Modified: Fri, 06 Nov 2026 22:45:54 GMT
Server: AmazonS3
Vary: Accept-Encoding
Via: 1.1 a769332b35ff207848c9dba655dfd232.cloudfront.net (CloudFront)
x-amz-cf-id: -DSS4qUqY_vLxY-ABqmFE_jykmvt0-ITNzxIK4z0Ui9eJrnkSIpkUQ==
x-amz-cf-pop: SEA900-P13
x-amz-server-side-encryption: AES256
x-cache: Hit from cloudfront
~~~

[⬇](#Contents)

# Cloudfront Cache

The Cloudfront cache caches the S3 web site files at the edge
locations.

The deploy script invalidates items when deploying site files to S3.
The invalidate removes the specified cached items.

You can determine what is stored in the cache with the curl command.
You can use the Safari network tab to see the requests and their http
headers.

The AWS doc explains how the Cloudfront cache works:

* https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/ConfiguringCaching.html -- how caching works and how to configure it.

It's possible that the cache contains multiple items for the same S3
item, for example Bolti and gzip items.

* https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/ServingCompressedFiles.html -- how cloudfront stores compressed files at the edge

~~~
CloudFront edge
       ├── identity/uncompressed version
       ├── gzip version
       └── Brotli version
~~~

Collections is configured for Plain. AWS says:
       
> Cache the files for a month without regard to the header, query parameters or cookies.       

# Curl

You can use curl to find out what is stored in the Cloudfront
cache. You can download a file from Cloudfront with curl. You can also
view the request headers with it.

Note: you cannot download an image jpg without an access token.

ETag for image-59.html from Safari headers:

~~~
ETag: W/"f72b6ac8d14392a6dba30b3a9d6a1d98"
~~~

Below we download and show the headers for image-59.html.  Notice the
ETag matches what Safari shows.  Safari uses Brotli compression (br).
It compresses a little better than gzip.

~~~
curl -H 'Accept-Encoding: br' -D - -o tmp.html -s \
  https://collections.sflennik.com/images/c59/image-59.html

HTTP/2 200 
content-type: text/html
content-encoding: br
date: Fri, 06 Nov 2026 23:33:43 GMT
server: AmazonS3
last-modified: Fri, 06 Nov 2026 22:45:54 GMT
x-amz-server-side-encryption: AES256
etag: W/"f72b6ac8d14392a6dba30b3a9d6a1d98"
vary: Accept-Encoding
x-cache: Hit from cloudfront
via: 1.1 12c75eb2b625b951b46ce19ef34ca4be.cloudfront.net (CloudFront)
x-amz-cf-pop: SEA900-P13
x-amz-cf-id: iTGQuyKLY40Jhn9J4-onBQkOXXrJ8KzPH9miajFStBIdvvl24VbqQg==
age: 5068
~~~

The following calls the server and it checks whether the server file
has the same etag. If it does, it returns 304. If it doesn’t, it
returns 200 and the file bytes.

~~~
curl -D - -s -L -H \
  'If-None-Match: "f72b6ac8d14392a6dba30b3a9d6a1d98"' \
  -w '\nHTTP status: %{http_code}\n' \
  'https://collections.sflennik.com/images/c59/image-59.html' \
  -o test.html
  
HTTP/2 304 
date: Sat, 07 Nov 2026 01:09:53 GMT
server: AmazonS3
etag: "f72b6ac8d14392a6dba30b3a9d6a1d98"
x-cache: Hit from cloudfront
via: 1.1 d6ad6e2fc2f435cd2feb06c3a80fbbbc.cloudfront.net (CloudFront)
x-amz-cf-pop: SEA900-P13
x-amz-cf-id: AV5zh734Bv4ttSBB_3wmN2fi2cKouZuN3cabuI8Pk44u0Tr5lkAQMQ==
age: 232
~~~

♫ Note: the etag gets passed along from the S3 object.  Cloudfront
might add W/ to the front sometimes; related to compression.

[⬇](#Contents)

# Local Javascript Cache

Safari developer tools does not have a UI to inspect the cache like
Chrome does.

You can inspect the local cache with some javascript you paste into
the console.

This code prints the image html file to the console:

~~~
(async function () {
  const cache = await caches.open("collections-v1");
  const response = await cache.match("/images/c59/image-59.html");
  const text = await response.text();
  console.log(text);
})();
~~~

You can print the cached ETag:

~~~
(async function () {
  const cache = await caches.open("collections-v1");
  const response = await cache.match("/images/c59/image-59.html");
  console.log(response.headers.get("ETag"));
})();

W/"f72b6ac8d14392a6dba30b3a9d6a1d98"

Use the following to show all header fields:

console.log(Object.fromEntries(response.headers))
~~~

One way to determine the version of the image html being used on the
iphone is to airDrop the json to your desktop. Click the admin
download icon on an image page. The json file comes from the embedded
JSON in the image html.

[⬇](#Contents)

# Cache Bug

There was an image with the wrong dimensions in the c.json file which
caused a white border with fit to width. I updated the dimensions but
it didn’t fix the issue. The old image file continued to be used.

It turned out there was a bug in our Cloudfront invalidation code in
the deploy script.  It was invalidating *.html for the image html
page. This seemed right but it didn’t invalidate the image file.
Cloudfront only supports wildcards at the end.

Another issue that was confusing was a misunderstanding how the
Cloudfront cache works. Cloudfront caches the compressed data not the
S3 uncompressed data. It can have multiple cached items for the same
S3 file.

The Safari request specifies Bolti compression.  While the curl
request specified gzip.  Both compressed versions were cached. The
Bolti was the old version and the gzip was the new version.

The curl request to Cloudfront was returning the new file matching S3
because the curl call was specifying gzip and there wasn’t a cached
version for it so it fetched from S3.

[⬇](#Contents)

# Service Worker Logging

Logging tells what path the code follows in the service worker.

For example, the following line 304 means our cached version of the
file matches what Cloudfront has.  "Hit from cloudfront" means the
file was in Cloudfront's cache so it didn't need to go to S3.

~~~
👷 304 https://collections.sflennik.com/images/c56/c56-1-p.jpg?id=t7vabl4w&user=0801f3d0-8041-70db-6366-c3161ab7589f Hit from cloudfront
~~~

You will see:

* 304 -- we have the newest file cached
* 304 with no cache -- cloudfront returned 304 but we don't have it cached -- shouldn't happen
* 200 -- we downloaded a new file and cached it
* net returnCode cache -- cloudfront returned returnCode and we have the file cached
* net returnCode -- cloudfront returned returnCode and we do not have the file cached
* offline cache -- network failed, but we have the file cached.
* offline miss -- network failed and we do not have the file cached -- shouldn't happen

[⬇](#Contents)

# Delete Collection

When you delete a collection it deletes the collection files given by
a list of numbers stored in the thumbnails page from
pages/collections.json.  It used to scan the whole cache for files
that begin with the collection number "images/cN/... but that took
about 6 seconds.

<style>body { max-width: 40em}</style>

# Contents


* [S3](#s3) -- how to print the S3 headers for a file.
* [Safari Network Tab](#safari-network-tab) -- how to see the header fields in Safari.
* [Cloudfront Cache](#cloudfront-cache) -- how to determine what's in the cloudfront cache.
* [Curl](#curl) -- how to use curl to see items in the cloudfront cache and their headers.
* [Local Javascript Cache](#local-javascript-cache) -- how to view the local cache items.
* [Cache Bug](#cache-bug) -- interesting cache bug where one item has two different items in the cache.
* [Service Worker Logging](#service-worker-logging) -- how to understand the service worked logs.
* [Delete Collection](#delete-collection) -- how delete collection works.
