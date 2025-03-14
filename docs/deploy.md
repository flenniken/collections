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
script does this.

[⬇](#Contents)

# Sync

To deploy you run the deploy script with the -s option from the
collections folder. It shows the files it copies. If nothing is shown,
nothing was copied.

~~~
# from docker container
scripts/deploy -s
~~~

[⬇](#Contents)

# List Modified

You can use the deploy script to list the modified files without
copying them with the -m option. You can also list the collections s3
bucket contents with the -l option. You can download one file from
cloudfront using login-flow.

~~~
deploy —m
~~~

[⬇](#Contents)

# Poll Status

You can tell when your code is deployed by using the -w option. It
polls the distribution status and tells you when the code has been
fully deployed.  It checks every five seconds and outputs a dot.

~~~
deploy —w

deploying……
deployed in 20 seconds
~~~

# Contents

* [Cache Behavior](#cache-behavior) -- how the cloudfront cache works.
* [Sync](#sync) -- how to deploy changed files.
* [List Modified](#list-modified) -- how to list the files that need to be deployed.
* [Poll Status](#poll-status) -- how to determine when the deploy has finished.
