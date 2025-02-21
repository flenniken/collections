# Request Logging

All the website https requests are logged by AWS CloudFront and
Lambda@Edge. You use these to verify the website is fast and working
correctly.

CloudFront logs a significant amount of information for each
request. We use standard logging which contains one line per request
and by default each line contains 39 fields.

Normally standard logs are delivered within minutes to your Amazon S3
bucket and there is no extra charge for standard logs.

[⬇](#Contents) (table of contents at the bottom)

# Gather Logs

We configured CloudFront to copy its edge logs to the
`logs/cloudfront` in S3. From there you can copy them locally for
analysis.

Lambda logs can also be copied, though the process is manual. The
destination is `logs/lambda`.

The S3 and local folder structure:

~~~
logs/
    cloudfront/
    lambda/
~~~

Once the files are in S3 you can sync them locally with the sync-logs
command:

~~~
# from docker container
cd ~/collections
scripts/sync-logs
~~~

The Cloudfront log copy to S3 is configured in the console. Look for
"Standard log destinations" and log to your bucket e.g. `sflennikco`
using the Partitioning `/logs/cloudfront`.

For Lambda you use the console to manually copy them to S3. You find
the logs in the nearest region to the edge location. You determine the
edge location from the cloud-logs command. The location field starts
with an airport code. For example for the location SEA900-P1 you would
look in the us-west-2 region.

From the region you can manually copy them to S3 using the CloudWatch
console.  Use "logs/lambda" as the prefix.  If you mistakenly use a
leading slash, it will go to the wrong location (to a S3 folder called
"/"). Here are the steps:

* open the CloudWatch Console the for the region closest to the edge.
* click Logs → "Logs groups" in the left panel
* select the log group, e.g. /aws/lambda/us-east-1.validateImageRequest
* select all the logs by clicking "Log stream" checkbox
* click Actions → "Export Data to Amazon S3"
* configure the time range
* select the bucket name `sflennikco` and enter `logs/lambda` for "S3 bucket prefix"
* click Export

[⬇](#Contents)

# Download ID

You use the download id to match up a particular download with the
Cloudfront and Lambda log lines. When you click the Collections
download button the code generates an 8 digit random base 62 number
called the download id. This id is added as a query parameter to each
image request in the collection.  You can see this in your browser
network tab.  The id is yFrj66VM in the example below.

Cloudfront logs the id in the cs-uri-query field, field number 14, for
example:

~~~
cs-uri-query: id=yFrj66VM&user=0861d3e0-00a1-7058-ad19-4d7b1880d276
~~~

Your browser developer tools shows the query parameters too:

~~~
id: yFrj66VM
user: 0861d3e0-00a1-7058-ad19-4d7b1880d276
~~~

[⬇](#Contents)

# Show Fields

Each line of the cloud front log contains 39 spaces separated
fields. The following command shows the fields for the first line with
the name on the left and the value on the right:

~~~
# from container
cd ~/collections
scripts/show-fields
~~~

You can pass a unique request id to view its details:

~~~
scripts/show-fields hf88XrNR
~~~

Sample output:

~~~
1               timestamp: 1738535441
2          DistributionId: EHLMG1T8SOX48
3                    date: 2025-02-02
4                    time: 22:30:41
5         x-edge-location: SEA900-P1
6                sc-bytes: 2562
7                    c-ip: 67.160.57.33
8               cs-method: GET
9                cs(Host): d2jmpxl8sy7hj7.cloudfront.net
10            cs-uri-stem: /pages/image-1.html
11              sc-status: 200
12            cs(Referer): https://collections.sflennik.com/sw.js
13         cs(User-Agent): Mozilla/5.0%20(Macintosh;%20Intel%20Mac%20OS%20X%2010_15_7)%20AppleWebKit/537.36%20(KHTML,%20like%20Gecko)%20Chrome/130.0.0.0%20Safari/537.36
14           cs-uri-query: id=yFrj66VM&user=0861d3e0-00a1-7058-ad19-4d7b1880d276
15             cs(Cookie): -
16     x-edge-result-type: Miss
17      x-edge-request-id: tgmtZK2wqyr8ZGwFkBYXB2xzkk4xr3IDyDRrqeKFiG9dOIinPsZMug==
18          x-host-header: collections.sflennik.com
19            cs-protocol: https
20               cs-bytes: 79
21             time-taken: 0.500
22        x-forwarded-for: -
23           ssl-protocol: TLSv1.3
24             ssl-cipher: TLS_AES_128_GCM_SHA256
25   x-edge-response-result-type: Miss
26    cs-protocol-version: HTTP/2.0
27             fle-status: -
28   fle-encrypted-fields: -
29                 c-port: 53251
30     time-to-first-byte: 0.498
31   x-edge-detailed-result-type: Miss
32        sc-content-type: text/html
33         sc-content-len: -
34         sc-range-start: -
35           sc-range-end: -
36          timestamp(ms): 1738535441041
37             origin-fbl: 0.051
38             origin-lbl: 0.053
39                    asn: 7922
~~~

The fields are documented here:

* [Log Reference](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/standard-logs-reference.html) -- the cloudfront standard log reference.

[⬇](#Contents)

# View Requests

Run the view-requests command to see all the Cloudfront requests.  It
shows the important fields 3, 4, 5, 11, 14, 14, 17, 31, 21, 10 from log lines,
instead of all of them, to make reading and studying the information
much easier.

~~~
scripts/view-requests
~~~

Sample output with the columns numbered:

~~~
1          2        3         4   5        6        7              8    9     10
2025-02-15 01:33:09 SEA900-P1 200 A9DxzhqT 0801f3d0 hf88XrNR       Miss 2.045 /images/c2-10-p.jpg
2025-02-15 01:33:09 SEA900-P1 200 A9DxzhqT 0801f3d0 jRrwgvH9       Miss 1.997 /images/c2-12-p.jpg
2025-02-15 01:33:09 SEA900-P1 200 A9DxzhqT 0801f3d0 sFaoR2C-       Miss 2.039 /images/c2-9-p.jpg
~~~

The output columns:

* 1: date
* 2: time
* 3: location
* 4: http status code
* 5: download id, - when not specified
* 6: user id, first 8 characters, - when not specified
* 7: unique request id
* 8: x-edge-detailed-result-type
* 9: time-taken
* 10: url

[⬇](#Contents)

# View Download

The view-download script shows you all the requests for a download. It
shows important information from both the Cloudfront and the Lambda
logs. You specify the day and download id of the download. You get
this from the view-requests output above. You run it like this:

~~~
# from container
find scripts/view-download 2025-02-13 xrgpgk5H
~~~

Partial Output:

~~~
...
todo
...
~~~

[⬇](#Contents)

# Lambda Logs

The Lambda function runs for each http request.  The Lambda function's
console.log messages appear in the log along with some system
messages. Each request is assigned a unique id by AWS that groups the
request’s log lines together. The time the request started determines
its order in the output and each request's group of lines is shown
together. The requests run in parallel so the times are not sequential
between groups.

Example lines with headers:

~~~
date       time         unique id   message
---------- ------------ -------- ---------------
2025-02-13 04:28:22.655 6cf7012d Version: 29
2025-02-13 04:28:22.814 6cf7012d id: xrgpgk5H
2025-02-13 04:28:22.814 6cf7012d url: /images/c1-5-p.jpg
~~~

[⬇](#Contents)

# Status Codes

You can look at the status codes starting from a particular date with
the following command. It counts each different code:

~~~
find logs/cloudfront -type f \
  | xargs zcat -f \
  | grep -v '#Fields:\|#Version: 1.0' \
  | awk '/2025\-02\-14/ {f=1; next} \
  f {print $11}' \
  | sort | uniq -c | sort -n

      4 304
     21 401
    189 200
~~~

To look a one of the 401 error requests you find a request id then you look at its log details:

~~~
scripts/view-requests | less

2025-02-15 01:33:19 SEA900-P1 401 A9DxzhqT 0801f3d0 b3E8FoYg LambdaGene 0.028 /images/c2-15-p.jpg
2025-02-15 01:33:19 SEA900-P1 401 A9DxzhqT 0801f3d0 eBd01sbt LambdaGene 0.060 /images/c2-1-p.jpg
2025-02-15 01:33:19 SEA900-P1 401 A9DxzhqT 0801f3d0 g4VALzA0 LambdaGene 0.025 /images/c2-13-p.jpg

scripts/view-download 2025-02-15 A9DxzhqT | less

scripts/show-fields b3E8FoYg
~~~

[⬇](#Contents)

# Test Cloudfront Cache

AWS Cloudfront caches files at the edge for fast responses.  Verify
that the cache is hit using the Cloudfront logs.

The files in the cache last for a month or until the cache fills
up. Each request contains unique information, download id, user id,
token that should be verified that it does not affect the cache (or
fragment it).  If a request doesn't provide a token, an error response
is generated and this should not affect subsequent valid requests.

Test the scenario where the second user to download a collection uses
the cache.

You use the cloudfront console to remove cached images for testing
with its invalidate UI.  To remove the first collection’s images use
"/images/c1-*" at:

~~~
 "CloudFront > Distributions > EHLMG1T8SOX48 > Create invalidation"
~~~

* login as user 1
* delete collection 1
* download collection 1
* record the download id
* repeat for user 2
* wait 5 minutes
* manually copy the lambda logs to S3
* download the logs locally with: "scripts/sync"
* view the cloudfront logs for user 1 misses and user 2 hits: "scripts/view-requests"
* view the lambda logs for the both users:  "scripts/view-download ...".  The second user should by mostly "warm start".

[⬇](#Contents)

# Test Lambda Cache

You want the cache to be used for speed. Verity with the Lambda logs.

Verify the code stays at the edge most of the time, i.e. doesn’t go to
the Oregon region to get the keys every time.

The log shows warm or cold and the key used.  The code ages out in 5 -
15 minutes.  Multiple AWS machines might be handling the requests in
parallel.

The same machine should be cold the first time then warm until it ages
out.

[⬇](#Contents)

# Remove Old Logs

The S3 bucket is configured to remove log files that are older than 30
days.  You run the script config-log-rotate to set this up.

You can test by listing the oldest logs on S3 and comparing that with
the current date:

~~~
# from container
date -I
2025-02-21

bucket=sflennikco  # variable
aws s3 ls --recursive s3://$bucket/logs/ \
  | awk '{print $1}' \
  | sort \
  | head

2025-01-11
2025-01-18
2025-01-18
2025-01-18
2025-01-18
2025-01-18
2025-01-18
2025-01-18
2025-01-18
2025-01-18
~~~

The local docker machine is also configured to remove logs older than
30 days. It runs the deleteOldLogs cron job every hour to delete.

You can test by counting the number of logs older than 30 days:

~~~
# from container
find logs -mtime +30 | wc -l
0
~~~

# Contents

* [Gather Logs](#gather-logs) -— how to find the logs and copy them locally.
* [Download ID](#download-id) -- how the download id ties together the Cloudfront and Lambda logs.
* [Show Fields](#show-fields) -— lists the Cloudfront log fields and a link to their documentation.
* [View Requests](#view-requests) -- how to view all the Cloudfront requests.
* [View Download](#view-download) -- how to view a download's Cloudfront and Lambda logs.
* [Lambda Logs](#lambda-logs) -- information about the log lines and how they are grouped.
* [Test Cloudfront Cache](#test-cloudfront-cache) -- test that the Cloudfront cache is hit.
* [Test Lambda Cache](#test-lambda-cache) -- test that the Lambda key cache is hit.
* [Status Codes](#status-codes) -- how to count the status code types and investigate them.
* [Remove Old Logs](#remove-old-logs) -- how old logs are deleted.
