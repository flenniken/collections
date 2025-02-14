# Request Logging

All the website https requests are logged by AWS CloudFront and
Lambda@Edge. You use these to verify the website is fast and working
correctly.

CloudFront logs a significant amount of information for each
request. We use standard logging which contains one line per
request. By default, each line contains 39 fields.

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

For lambda you use the console to manually copy them to S3. You find
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
Cloudfront and lambda log lines. When you click the Collections
download button, the code generates an 8 digit random base 62 number
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

# CloudFront Fields

The following command displays the 39 Cloudfront log fields and their
values from the last request.

~~~
# from container
cd ~/collections
scripts/log-fields
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

You use the view-requests command to see all the Cloudfront
requests. It shows the important fields 3, 4, 5, 11, 14, 21, 31, 10
from log lines, instead of all of them, to make reading and studying
the information much easier.

~~~
scripts/view-requests

date       time     location status download  seconds  hit         url
---------- -------- --------- --- ----------- ----- ---------- -----------------
2025-02-13 04:28:22 SEA900-P1 200 id=xrgpgk5H 0.188        Hit /images/c1-5-t.jpg
2025-02-13 04:28:22 SEA900-P1 200 id=xrgpgk5H 0.191        Hit /images/c1-6-t.jpg
2025-02-13 04:28:23 SEA900-P1 200 id=xrgpgk5H 0.425        Hit /images/c1-1-p.jpg
~~~

# View Download

The view-download script shows you all the requests for a download. It
shows important information from both the Cloudfront and the lambda
logs. You specify the day and download id of the download. You get
this from the view-requests output above. You run it like this:

~~~
# from container
find scripts/view-download 2025-02-13 xrgpgk5H
~~~

Partial Output:

~~~
...
2025-02-13 04:28:22 SEA900-P1 200 id=xrgpgk5H 0.180 Hit /images/c1-7-p.jpg
2025-02-13 04:28:22 SEA900-P1 200 id=xrgpgk5H 0.183 Hit /images/c1-3-t.jpg
2025-02-13 04:28:22 SEA900-P1 200 id=xrgpgk5H 0.188 Hit /images/c1-5-t.jpg
2025-02-13 04:28:22 SEA900-P1 200 id=xrgpgk5H 0.191 Hit /images/c1-6-t.jpg
2025-02-13 04:28:23 SEA900-P1 200 id=xrgpgk5H 0.425 Hit /images/c1-1-p.jpg
2025-02-13 04:28:23 SEA900-P1 200 id=xrgpgk5H 0.493 Hit /images/c1-3-p.jpg
2025-02-13 04:28:23 SEA900-P1 200 id=xrgpgk5H 0.545 Hit /images/c1-5-p.jpg
2025-02-13 04:28:23 SEA900-P1 200 id=xrgpgk5H 0.551 Hit /images/c1-4-p.jpg
2025-02-13 04:28:22.655 6cf7012d
2025-02-13 04:28:22.655 6cf7012d Version: 29
2025-02-13 04:28:22.814 6cf7012d id: xrgpgk5H
2025-02-13 04:28:22.814 6cf7012d url: /images/c1-5-p.jpg
2025-02-13 04:28:22.815 6cf7012d jwks: Warm start.
2025-02-13 04:28:22.815 6cf7012d warning: Ignoring token expiration for testing.
2025-02-13 04:28:22.835 6cf7012d auth: Passed
2025-02-13 04:28:22.955 6cf7012d 299.67 ms
2025-02-13 04:28:22.654 5897c34b
2025-02-13 04:28:22.654 5897c34b Version: 29
2025-02-13 04:28:22.757 5897c34b id: xrgpgk5H
2025-02-13 04:28:22.757 5897c34b url: /images/c1-5-t.jpg
2025-02-13 04:28:22.777 5897c34b jwks: Warm start.
2025-02-13 04:28:22.778 5897c34b warning: Ignoring token expiration for testing.
2025-02-13 04:28:22.798 5897c34b auth: Passed
2025-02-13 04:28:22.818 5897c34b 163.94 ms
...
~~~

[⬇](#Contents)

# Lambda Logs

The lambda function runs for each http request.  The Lambda function's
console.log messages appear in the log along with some system
messages. Each request is assigned a unique id by AWS that groups the
request’s log lines together. The time the request started determines
its order in the output and each request group of lines is shown
together. The requests run in parallel so the times are not
sequential between groups.

Example lines with headers:

~~~
date       time         unique id   message
---------- ------------ -------- ---------------
2025-02-13 04:28:22.655 6cf7012d Version: 29
2025-02-13 04:28:22.814 6cf7012d id: xrgpgk5H
2025-02-13 04:28:22.814 6cf7012d url: /images/c1-5-p.jpg
~~~

[⬇](#Contents)

# Analysis Tasks

You can analyze the logs to determine that the website is operating
error free, to determine how fast it is and to determine usage
patterns.

**Status Codes**

You can look for 200 and 304 status codes.  The 200 requests
successfully returned an uncached file. The 304 were successfully
returned from the cache. The other status codes are error conditions.

The following command will count each status code.  There were 507 status 200:

~~~
find logs/cloudfront -type f \
  | xargs zcat -f \
  | awk '{ print $11 }' \
  | sort | uniq -c | sort -n

     11 301
     81 403
     93 304
     96
     96 cs-uri-stem
    322 401
    507 200
~~~

# Contents

* [Gather Logs](#gather-logs) -— how to find the logs and copy them locally.
* [Download ID](#download-id) -- how the download id ties together the Cloudfront and Lambda logs.
* [CloudFront Fields](#cloudfront-fields) -— lists the Cloudfront log fields and a link to their documentation.
* [View Requests](#view-requests) -- how to view all the Cloudfront requests.
* [View Download](#view-download) -- how to view a download's Cloudfront and Lambda logs.
* [Lambda Logs](#lambda-logs) -- information about the log lines and how they are grouped.
* [Analysis Tasks](#analysis-tasks) -- how to use the logs to analyze the website traffic.
