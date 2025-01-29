# Request Logging

All the website https requests are logged by AWS CloudFront and
Lambda@Edge.

CloudFront logs a significant amount of information for each
request. We use standard logging which contains one line per
request. By default, each line contains 39 fields.

Normally standard logs are delivered within minutes to your Amazon S3
bucket and there is no extra charge for standard logs.

[⬇](#Contents) (table of contents at the bottom)

# Log Location

We configured CloudFront to copy its edge logs to the
`logs/cloudfront` in S3.

You turn it on in the CloudFront console. Look for "Standard log
destinations" and log to your bucket e.g. `sflennikco` using the
Partitioning `/logs/cloudfront`.

Lambda logs can also be copied, though the process is manual.  You
find them in the nearest region to the edge location.  You determine
the edge location from the CloudFront x-edge-location field. The field
starts with an airport code. For example for the location SEA900-P1
you would look in the us-west-2 region. From there, you can manually
copy them to S3 using the CloudWatch console.  Use "logs/lambda" as
the prefix.  If you mistakenly use a leading slash, it will go to a S3
folder called "/".

The S3 folder structure:

~~~
logs/
    cloudfront/
    lambda/
~~~

Once the files are in S3, you can sync them locally for analysis:

~~~
# from docker container
cd ~/collections
aws s3 sync s3://sflennikco/logs/cloudfront logs/cloudfront
~~~

[⬇](#Contents)

# CloudFront Fields

The following command displays the 39 fields contained in a CloudFront
log file.  The output shows the field number, the field name, and the
field value for the first line:

~~~
file=logs/cloudfront/EHLMG1T8SOX48.2025-01-18-20.2f7f926e.gz

zcat $file \
  | awk '/^[0-9]/{for(i=1; i<=NF; i++) \
  {printf "%-4s %20s: %s\n", i, f[i], $i}; \
  {print "\n"};exit}\
  /#Fields: / {for(i=1; i<=NF; i++) {f[i] = $(i+1)}}'

1               timestamp: 1737232139
2          DistributionId: EHLMG1T8SOX48
3                    date: 2025-01-18
4                    time: 20:28:59
5         x-edge-location: SEA900-P1
6                sc-bytes: 392
7                    c-ip: 67.160.57.33
8               cs-method: GET
9                cs(Host): d2jmpxl8sy7hj7.cloudfront.net
10            cs-uri-stem: /js/thumbnails.js
11              sc-status: 304
12            cs(Referer): https://collections.sflennik.com/sw.js
13         cs(User-Agent): Mozilla/5.0%20(iPhone;%20CPU%20iPhone%20OS%2018_1_1%20like%20Mac%20OS%20X)%20AppleWebKit/605.1.15%20(KHTML,%20like%20Gecko)%20Version/18.1.1%20Mobile/15E148%20Safari/604.1
14           cs-uri-query: -
15             cs(Cookie): -
16     x-edge-result-type: Hit
17      x-edge-request-id: jWkr9PYh-StlIcOw_SE25A8F1zMmHMc_ecFPl-80bAQfeMeqIH1i3w==
18          x-host-header: collections.sflennik.com
19            cs-protocol: https
20               cs-bytes: 339
21             time-taken: 0.596
22        x-forwarded-for: -
23           ssl-protocol: TLSv1.3
24             ssl-cipher: TLS_AES_128_GCM_SHA256
25   x-edge-response-result-type: Hit
26    cs-protocol-version: HTTP/2.0
27             fle-status: -
28   fle-encrypted-fields: -
29                 c-port: 62851
30     time-to-first-byte: 0.596
31   x-edge-detailed-result-type: Hit
32        sc-content-type: -
33         sc-content-len: -
34         sc-range-start: -
35           sc-range-end: -
36          timestamp(ms): 1737232139011
37             origin-fbl: -
38             origin-lbl: -
39                    asn: 7922
~~~

The fields are documented here:

https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/standard-logs-reference.html

[⬇](#Contents)

# Extract Fields

You can extract key fields for all the log lines as show below. In the
example it extracts fields 3, 4, 5, 11, 21, 31, 10, 20. Edit the
numbers to view a different set.

~~~
find logs/cloudfront -type f \
  | xargs zcat \
  | awk 'BEGIN {n = split("3, 4, 5, 11, 21, 31, 10, 20", \
    list, " ") } \
    /^[0-9]/ {for(i=1; i<=n; i++) \
    {printf "%s ", $list[i]}; print ""} \
    /#Fields: / {for(i=1; i<=n; i++) \
    {ix=list[i]+1;printf "%s ", $ix}; print ""}' \
  | less

date time x-edge-location sc-status time-taken x-edge-detailed-result-type cs-uri-stem cs-bytes 
2025-01-18 20:28:59 SEA900-P1 304 0.596 Hit /js/thumbnails.js 339 
2025-01-18 20:29:01 SEA900-P1 200 0.137 Miss /index.html 136 
2025-01-18 20:29:01 SEA900-P1 304 0.024 Hit /js/index.js 88 
2025-01-18 20:29:01 SEA900-P1 304 0.040 Hit /js/thumbnails.js 92 
2025-01-18 20:29:01 SEA900-P1 304 0.051 Miss /js/image.js 995 
2025-01-18 20:29:02 SEA900-P1 200 0.026 Hit /sw.js 27 
2025-01-18 20:28:59 SEA900-P1 200 0.104 Miss /sw.js 240 
2025-01-18 20:29:03 SEA900-P1 401 0.480 LambdaGeneratedResponse /images/c2-1-t.jpg 39 
2025-01-18 20:29:03 SEA900-P1 401 0.609 LambdaGeneratedResponse /images/c2-2-p.jpg 39
~~~

[⬇](#Contents)

# Lambda Logs

* todo: show the matching lambda log lines for the same request as above. pull from logs.  tie the request to the cloud front log with the request _id.


The node js console.log messages from the Lambda function appear in
the lambda logs mixed in with the system messages.  Each console
message starts with the text “MyData” so they are easy to extract:

~~~
find logs/lambda -type f \
  | xargs zcat -f \
  | grep "MyData" \
  | awk '{ printf "%s ", $1; for (i = 6; i <= NF; i++) \
    printf "%s ", $i; print ""}' \
  | less

2025-01-18T20:58:54.425Z error: jwt expired 
2025-01-18T20:58:53.915Z Cold start. 
2025-01-18T20:58:54.377Z Failed: url: /images/c2-8-p.jpg 
2025-01-18T20:58:54.377Z error: jwt expired 
2025-01-18T20:58:53.879Z Cold start. 
2025-01-18T20:58:54.395Z Failed: url: /images/c2-15-p.jpg 
2025-01-18T20:58:54.395Z error: jwt expired 
2025-01-18T20:58:53.496Z Cold start. 
2025-01-18T20:58:53.960Z Failed: url: /images/c2-1-p.jpg 
2025-01-18T20:58:53.961Z error: jwt expired 
~~~

[⬇](#Contents)

# Analysis Tasks

You can analyze the logs to determine that the website is operating
error free, to determine how fast it is and to determine usage
patterns.

* Error Free — how to verify error free requests. 
* Cache Hits — how to verify caches are hit. 
* Measure Download Speed — how to measure the download speed by file and by collections. 
* Show Usage Statistics — how to show stats by users and overall. 

See the sections below for the details. 

**Error Free**

You can look for 200 and 304 status codes.  The 200 requests
successfully returned an uncached file. The 304 were successfully
returned from the cache. The other status codes are error conditions.

The following command will count each status code:

~~~
find logs/cloudfront -type f \
  | xargs zcat -f \
  | awk '{ print $11 }' \
  | sort | uniq -c | sort-n

todo: show results
~~~

You can look at just the 200 requests. Change the 200 to a different
code to look at them:

~~~
todo:
find logs/cloudfront -type f \
  | xargs zcat -f \
  | awk '$11 == 200 {print }' \
  | awk '{print $1,$2,$3}'
~~~

**Cache Hits**

For speed you want the caches to be hit. The x-edge-result-type field
tells whether one of the important caches is hit.  The cloud front
cache lasts a day by default. Images are immutable.

The Lambda function caches the signing keys on a cold start.  You want
most requests to use the cached keys. A cache hit is logged as a warm
start.

todo: show commands

**Measure Download Speed**

The time-taken field tells you how long it took for AWS to return the
file. The dl query field ties a collection downloads together. You can
calculate the AWS total by subtracting the first and last times. You
cannot sum the requests because they run in parallel.

todo: 

* command showing the time to download an image
* bytes per second
* seconds per collection

The browser logs tell you the download time for a collection.

todo: show example

**Show Usage Statistics**

* todo: show by user using the query name
* todo: show users over time

# Contents

* [Log Location](#log-location) — where the logs are located and how to copy them locally. 
* [CloudFront Fields](#cloudfront-fields) — lists the fields and a link to their documentation. 
* [Extract Fields](#extract-fields) — how to extract important fields. 
* [Lambda Logs](#lambda-logs) — how to extract the console log lines and match them up with the Cloud front logs. 
* [Analysis Tasks](#analysis-tasks) -- analyze website traffic. 

# todo

todo: Real-Time Logs Logs can be tailed in the terminal. command?

todo: Determine how long logs are retained in S3 and rotate them as necessary.

todo: increase the cache duration.

todo: Log the username and a random number by adding them to the image request query field. 

todo: Username: Include the user’s GUID (36 digits).  For example: name= 6b29fc40-ca47-1067-b31d-00dd010662da. Validate the username in the Lambda function against the token. Collect user usage information with this. 

*todo: Random Number: Use an 8-digit Base62 random number to tie download events together for example: dl=abAB1234

* how big is the token?

If the total size of all request headers, including cookies, exceeds
20 KB, or if the URL exceeds 8192 bytes, CloudFront can't parse the
request completely and can't log the request.
