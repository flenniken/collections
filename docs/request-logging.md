# Request Logging

All the website https requests are logged by AWS CloudFront and
Lambda@Edge.

CloudFront logs a significant amount of information for each
request. We use standard logging which contains one line per
request. By default, each line contains 39 fields.

Normally standard logs are delivered within minutes to your Amazon S3
bucket and there is no extra charge for standard logs.

[⬇](#Contents) (table of contents at the bottom)

# Gather Logs

We configured CloudFront to copy its edge logs to the
`logs/cloudfront` in S3. From there you can copy them locally.

Lambda logs can also be copied, though the process is manual. The
destination is `logs/lambda`.

The S3 and local folder structure:

~~~
logs/
    cloudfront/
    lambda/
~~~

Once the files are in S3, you can sync them locally for analysis:

~~~
# from docker container
cd ~/collections
aws s3 sync s3://sflennikco/logs logs
~~~

The Cloudfront log copy is configured in the console. Look for "Standard log
destinations" and log to your bucket e.g. `sflennikco` using the
Partitioning `/logs/cloudfront`.

For lambda use use the console to manually copy them. You find the
logs in the nearest region to the edge location.  You determine the
edge location from the CloudFront x-edge-location field. The field
starts with an airport code. For example for the location SEA900-P1
you would look in the us-west-2 region. From there, you can manually
copy them to S3 using the CloudWatch console.  Use "logs/lambda" as
the prefix.  If you mistakenly use a leading slash, it will go to the
wrong location (to a S3 folder called "/").

* open the CloudWatch Console the for the region closest to the edge.
* click Logs → "Logs groups" in the left panel
* select the log group, e.g. /aws/lambda/us-east-1.validateImageRequest
* select all the logs by clicking "Log stream" checkbox
* click Actions → "Export Data to Amazon S3"
* configure the time range
* select the bucket name `sflennikco` and enter `logs/lambda` for "S3 bucket prefix"
* click Export

[⬇](#Contents)

# Navigating the Logs

Find the three latest cloudfront log files:

~~~
# from container
find logs/cloudfront -type f \
  | sort \
  | tail -3

logs/cloudfront/EHLMG1T8SOX48.2025-02-02-04.87bd7256.gz
logs/cloudfront/EHLMG1T8SOX48.2025-02-02-21.3f9af430.gz
logs/cloudfront/EHLMG1T8SOX48.2025-02-02-22.340b7ab0.gz
~~~

You can look at a log file with less:

~~~
less -S logs/cloudfront/EHLMG1T8SOX48.2025-02-02-22.340b7ab0.gz
~~~

# CloudFront Fields

The following command displays the 39 fields contained in the latest CloudFront
log file.  The output shows the field number, the field name, and the
field value for the first line:

~~~
find logs/cloudfront -type f \
  | sort \
  | tail -1 \
  | xargs zcat \
  | awk '/^[0-9]/{for(i=1; i<=NF; i++) \
   {printf "%-4s %20s: %s\n", i, f[i], $i}; \
   {print "\n"};exit}\
   /#Fields: / {for(i=1; i<=NF; i++) {f[i] = $(i+1)}}' \
   | less

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

# Extract Fields

You can extract key fields from log lines to make reading and studying
the information much easier.

In the example it extracts fields 3, 4, 5, 11, 14, 21, 31, 10.  The
numbers are field numbers shown in the last section. Edit the numbers
to view a different set.

~~~
find logs/cloudfront -type f \
  | xargs zcat \
  | awk 'BEGIN {n = split("3 4 5 11 14 21 31 10", \
    list, " ") } \
    /^[0-9]/ {for(i=1; i<=n; i++) \
    {$14=substr($14,0,11); printf "%s ", $list[i]}; print ""}' \
  | sort \
  | less

date       time     location  status          seconds
|          |        |         |   download    |     hit        url
3          4        5         11  14          21    31         10
---------  -------  --------  --  ----------  ----  ---------  ------------------
2025-02-05 01:15:07 SEA900-P1 200 id=UzCwQzMw 2.108 RefreshHit /images/c2-12-t.jpg
2025-02-05 01:15:07 SEA900-P1 200 id=UzCwQzMw 2.109 RefreshHit /images/c2-10-t.jpg
2025-02-05 01:15:07 SEA900-P1 200 id=UzCwQzMw 2.116 RefreshHit /images/c2-11-t.jpg
2025-02-05 01:15:07 SEA900-P1 200 id=UzCwQzMw 2.116 RefreshHit /images/c2-14-t.jpg
2025-02-05 01:15:07 SEA900-P1 200 id=UzCwQzMw 2.116 RefreshHit /images/c2-16-t.jpg
2025-02-05 01:15:07 SEA900-P1 200 id=UzCwQzMw 2.117 RefreshHit /images/c2-2-t.jpg
2025-02-05 01:15:07 SEA900-P1 200 id=UzCwQzMw 2.117 RefreshHit /images/c2-7-t.jpg
2025-02-05 01:15:07 SEA900-P1 200 id=UzCwQzMw 2.120 RefreshHit /images/c2-6-t.jpg
2025-02-05 01:15:07 SEA900-P1 200 id=UzCwQzMw 2.468 Miss /images/c2-9-t.jpg
2025-02-05 01:15:07 SEA900-P1 200 id=UzCwQzMw 2.476 RefreshHit /images/c2-1-p.jpg
2025-02-05 01:15:07 SEA900-P1 200 id=UzCwQzMw 2.480 RefreshHit /images/c2-7-p.jpg
2025-02-05 01:15:07 SEA900-P1 200 id=UzCwQzMw 2.789 RefreshHit /images/c2-12-p.jpg
2025-02-05 01:15:07 SEA900-P1 200 id=UzCwQzMw 2.795 RefreshHit /images/c2-11-p.jpg
2025-02-05 01:15:07 SEA900-P1 200 id=UzCwQzMw 2.795 RefreshHit /images/c2-15-t.jpg
2025-02-05 01:15:07 SEA900-P1 200 id=UzCwQzMw 2.799 RefreshHit /images/c2-4-p.jpg
2025-02-05 01:15:08 SEA900-P1 200 id=UzCwQzMw 3.095 RefreshHit /images/c2-9-p.jpg
2025-02-05 01:15:08 SEA900-P1 200 id=UzCwQzMw 3.549 RefreshHit /images/c2-13-p.jpg
2025-02-05 01:15:08 SEA900-P1 200 id=UzCwQzMw 3.556 RefreshHit /images/c2-10-p.jpg
2025-02-05 01:15:08 SEA900-P1 200 id=UzCwQzMw 3.558 RefreshHit /images/c2-14-p.jpg
2025-02-05 01:15:08 SEA900-P1 200 id=UzCwQzMw 3.560 RefreshHit /images/c2-5-p.jpg
2025-02-05 01:15:08 SEA900-P1 200 id=UzCwQzMw 3.872 RefreshHit /images/c2-3-p.jpg
2025-02-05 01:15:08 SEA900-P1 200 id=UzCwQzMw 3.872 RefreshHit /images/c2-6-p.jpg
2025-02-05 01:15:09 SEA900-P1 200 id=UzCwQzMw 4.147 RefreshHit /images/c2-16-p.jpg
2025-02-05 01:15:09 SEA900-P1 200 id=UzCwQzMw 4.245 RefreshHit /images/c2-15-p.jpg
2025-02-05 18:02:19 TLV50-C2 200 - 1.053 Miss /
2025-02-07 01:42:25 LAX54-P1 200 - 0.573 RefreshHit /
2025-02-07 01:44:09 LAX54-P1 200 - 0.174 Hit /
~~~

# Download ID

You use the download id to match up a particular download with the
Cloud front and lambda log lines. When you click the Collections
download button, the code generates a random base 62 number called the
download id. This id is added as a query parameter to each image in
the collection.  You can see this in your browser network tab.  The id
was yFrj66VM for the download at 22:32 UTC.

Cloudfront logs the id in the cs-uri-query field, field number 14. See
the string in the Cloudfront Fields section, for example yFrj66VM:

~~~
cs-uri-query: id=yFrj66VM&user=0861d3e0-00a1-7058-ad19-4d7b1880d276
~~~

You can find it in the browser too:

~~~
id: yFrj66VM
user: 0861d3e0-00a1-7058-ad19-4d7b1880d276
~~~

You can run the date command to get the UTC time value to help match up by time:

~~~
date

Sun Feb  2 22:31:29 UTC 2025
~~~

[⬇](#Contents)

# Lambda Logs

The lambda function runs for each http request. The system logs when
the function starts and at the end. The Lambda function console.log
messages appear in the log. Each line contains a request id that
groups the request’s log lines.

The lambda logs contain the download id so you can match the lambda
lines with the cloudfront lines.

The node js console.log messages from the Lambda function appear in
the lambda logs mixed in with the system messages.  Each console
message starts with the text “MyData” so they are easy to extract:

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

You can look at just the 200 requests as show in the next example.  If
you want to look at a different code, change the 200 to your code:

~~~
todo:
find logs/cloudfront -type f \
  | xargs zcat -f \
  | awk '$11 == 200 {print }' \
  | awk '{print $1,$2,$3}'
~~~


# Contents

* [Gather Logs](#gather-logs) — how to find the logs and copy them locally.
* [CloudFront Fields](#cloudfront-fields) — lists the fields and a link to their documentation.
* [Extract Fields](#extract-fields) — how to extract important fields.
* [Lambda Logs](#lambda-logs) — how to extract the console log lines and match them up with the Cloud front logs.
* [Analysis Tasks](#analysis-tasks) -- analyze website traffic.


