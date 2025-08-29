# AWS Config

[![icon](rounded-icon.png)](#)

This page tells you how to configure AWS services that collections
uses.

[⬇](#Contents) (table of contents at the bottom)

# Overview

The collections website uses AWS services for user authentication and
for hosting the site files.

* S3 holds the website files
* CloudFront quickly handles the https requests and serves the files
* Cognito and SES manage user login and authentication so the site is
  only open to friends and family
* Route53 and Certificate Manager connect the website to your custom
  domain with secure access
* IAM allows you to run scripts to deploy, run setup and to inspect
  aws settings.

In the following sections we configure each aws service and validate
after each step. If you run into a problem, it should be easier to fix
since there is less to understand and debug.

Note: You need collections installed on your local machine and the
docker container running.

The examples uses the sflennik.com domain and the sflennikco bucket
name.  Replace these with your names when running the examples.

[⬇](#Contents)

# Create IAM User

Create an IAM user in the aws console.

You will use this user in the docker container to validate the config,
to copy files to S3, to run scripts and to explore the aws system.

* login to the AWS console
* type iam in the search box to find the IAM service
* click Users in the left panel
* push "Create user" button at the top right
* enter the user name shown below then press next
~~~
aws-cli-collections-docker
~~~
* select "Attach policies directly"
* add the following permissions by entering each in the search box then checking them:

~~~
AmazonS3FullAccess
AmazonCognitoPowerUser
AmazonSESReadOnlyAccess
AmazonRoute53ReadOnlyAccess
CloudFrontFullAccess
~~~

* Enter a tag for the user with key "collections" and value:
~~~
Used on the collections docker container.
~~~
* push "Create User" you will go back to user list

* click the aws-cli-collections-docker user link
* click "Create access key" link on the upper right
* select "Command Line Interface (CLI)", check confirm, press next
* press "Create access key"

* determine your region. You can see the available regions in the
console dropdown in the upper right hand side of the window.
e.g. us-west-2.

* add the credentials to the docker container with the following command.

~~~
# from docker container
aws configure

AWS Access Key ID [None]: xxxxxxxxxxx
AWS Secret Access Key [None]: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
Default region name [None]: us-west-2
Default output format [None]:
~~~

* push the Done button

Save the credentials somewhere safe, maybe your password manager. You
need the credentials again if you create a new docker image.

The credentials are stored in the credentials file:

~~~
cat ~/.aws/credentials

[default]
aws_access_key_id = xxxxxxxxxxx
aws_secret_access_key = xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
~~~

The region is stored in the aws config file.  In the example the
us-west-2 region is being used:

~~~
cat ~/.aws/config

[default]
region = us-west-2
~~~

Validate the IAM you just created by listing the s3 buckets, SES
emails, Cognito user pools and CloudFront distributions.

List your the S3 buckets.

~~~
aws s3 ls
~~~

List your AWS SES emails:

~~~
aws ses list-identities
~~~

List the AWS Cognito user pools:

~~~
aws cognito-idp list-user-pools --max-results 20
~~~

List AWS CloudFront distributions and origin access controls (OACs):

~~~
aws cloudfront list-distributions
aws cloudfront list-origin-access-controls
~~~

List AWS Route53 zones:

~~~
aws route53 list-hosted-zones
~~~

[⬇](#Contents)

# Create S3 Bucket

Create a S3 bucket in the AWS console for the website files.
Specify the region and the bucket name.  Use the defaults for the rest
of the settings.

For the region I used us-west-2. For the name I used sflennikco. It is
best to not use a name with dots. This is a global name so simple
names will be taken.

The console will show you the new bucket.

Verify you created it in the correct region.  For the sflennikco
bucket run:

~~~
# on the docker container
aws s3api get-bucket-location --bucket sflennikco # variable

{
    "LocationConstraint": "us-west-2"
}
~~~

Configure S3 so 30 day old log files get automatically deleted. Pass
in the bucket name, for example sflennikco:

~~~
scripts/config-log-rotate sflennikco
~~~

[⬇](#Contents)

# Copy Website

Copy the website's dist folder to the new bucket using the aws copy
command. For the sflennikco bucket run:

~~~
# on the docker container
cd ~/collections
aws s3 cp --recursive dist s3://sflennikco
~~~

Validate the files got copied as expected by listing the files with
the aws command.  For the sflennikco bucket run:

~~~
aws s3 ls s3://sflennikco # variable

                           PRE icons/
                           PRE images/
                           PRE js/
                           PRE pages/
2024-11-16 23:52:33       2970 collections.css
2024-11-16 23:52:33       1365 collections.webmanifest
2024-11-16 23:52:33       1406 favicon.ico
2024-11-16 23:52:47       6099 index.html
2024-11-16 23:52:48       9863 sw.js
~~~

List the icons:

~~~
aws s3 ls s3://sflennikco/icons/ # variable

2024-11-23 20:19:33        692 6-dots-rotate.svg
2025-03-21 21:32:17        167 blank.svg
2024-11-23 20:19:33        693 camera.svg
…
~~~

[⬇](#Contents)

# Register a domain

In the aws route53 console register a domain. The domain must be
registered with aws to use it with CloudFront.

I registered sflennik.com for $14 per year. You will get an email from
noreply@registrar.amazon in a few minutes.

The process will automatically create a zone for sflennik.com in
route53.

Get a certificate using the aws certificate manager console.  Use your
domain and its collections subdomain. For example, sflennik.com and
collections.sflennik.com.

Click Create Records and wait a minute or so for it to be created.

You will connect collections.sflennik.com subdomain to the CloudFront
distribution you are about to create.

Verify the subdomain exists using the command line:

~~~
aws route53 list-hosted-zones | jqless

  "Id": "/hostedzone/Z0529194UJ7ON89LPSGU",
  "Name": "sflennik.com.",

aws route53 list-resource-record-sets \
  --hosted-zone-id Z0529194UJ7ON89LPSGU \
  | jqless

  ...
  "Name": "sflennik.com.",
  ...
  "Name": "collections.sflennik.com.",
  ...
~~~

[⬇](#Contents)

# Create CloudFront Distribution

Create a CloudFront distribution service for the website and give it
access to the S3 bucket you created.

In the aws CloudFront console click "Create a CloudFront
distribution". Specify the fields labeled:

* Origin Domain
* Origin access
* Alternate domain name (CNAME) - optional
* Custom SSL certificate -- optional
* Default Root object -- optional
* Web Application Firewall (WAF)
* Price class
* Redirect HTTP to HTTPS

Enter your bucket domain in the Origin Domain field. For the
sflennikco bucket and the region us-west-2 enter:

~~~
sflennikco.s3.us-west-2.amazonaws.com
~~~

For "Origin access" select "Origin access control settings
(recommended).  Leave "Origin access control" blank, you will fill
this in later.

Enter your subdomain name in the "Alternate domain name" field
e.g. "collections.sflennik.com".

For the "Custom SSL certificate" field select your cert from the
dropdown list.

Enter "index.html" in the "Default Root object" field.

For Web Application Firewall (WAF) select "Do not enable security
protections" because it is cheaper.

For the "Price class" field select "Use only North America and Europe"
because it is cheaper and faster to deploy.

Push the "Create Distribution" button at the bottom of the page and
wait for it to deploy.  It will take a few minutes.

Under the Behaviors tab check the collections line and push the Edit
button.  For the "Viewer protocol policy" select "Redirect HTTP to
HTTPS" then save. For the "Cache key and origin requests" create a
"Cache policy" called Plain that caches files for a month without
regard to headers, cookies or query parameters. Create a "Origin
request policy - optional" that specifies the "auth" header.  This
tells cloudfront to pass the auth header to the lambda function.

[⬇](#Contents)

# Allow CloudFront S3 Access

If you use the distribution now, you will get access denied errors.
You need to allow CloudFront access to your S3 bucket.  You do that in
the CloudFront and s3 consoles.

* from the CloudFront console select the distribution you created
* select the Origins tab
* in the Origins box select the origin you created before, then click Edit
* in Origin access control click "Create new OAC"
* enter name "collections"
* enter description "Connect CloudFront to S3 bucket sflennikco."
* click "Copy policy" (you will use this in the S3 console)
* click "Save changes"

* from the s3 console select your collections bucket and the Permissions tab
* in the "Bucket policy" box click Edit
* paste in the policy that you saved to the clipboard previously
* click "Save changes"

Note: If you want to see your OACs and edit or delete them, go to the
top level of the CloudFront console and select Security > Origin
access.

* from the Route53 console edit your subdomain and point at the cloud
  front distribution. It is an A record with Alias yes -- alias to
  CloudFront distribution -- select the distribution from the
  dropdown.

After it deploys, verify the CloudFront "Distribution domain name"
loads in your browser. For example:

 https://d2jmpxl8sy7hj7.cloudfront.net

Verify your distribution from the command line:

~~~
aws cloudfront list-distributions | jq | grep "sflennik"

  "collections.sflennik.com"
  "Id": "collections.sflennik.com.s3.us-west-2.amazonaws.com",
  "DomainName": "sflennikco.s3.us-west-2.amazonaws.com",
  "TargetOriginId": "collections.sflennik.com.s3.us-west-2.amazonaws.com",
  "CNAME": "collections.sflennik.com",

aws cloudfront list-origin-access-controls | jqless

  ...
  "Description": "Connect cloudfront to S3 bucket sflennikco.",
  "Name": "collections",
  "SigningProtocol": "sigv4",
  "SigningBehavior": "always",
  "OriginAccessControlOriginType": "s3"
  ...

aws s3api get-bucket-policy --bucket sflennikco | jq -r .Policy | jq

{
  "Version": "2012-10-17",
  "Id": "PolicyForCloudFrontPrivateContent",
  "Statement": [
    {
      "Sid": "AllowCloudFrontServicePrincipal",
      "Effect": "Allow",
      "Principal": {
        "Service": "cloudfront.amazonaws.com"
      },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::sflennikco/*",
      "Condition": {
        "StringEquals": {
          "AWS:SourceArn": "arn:aws:cloudfront::169317056116:distribution/EHLMG1T8SOX48"
        }
      }
    }
  ]
}
~~~

Verify your subdomain loads in your browser.  For the the
collections.sflennik.com domain enter:

* https://collections.sflennik.com

[⬇](#Contents)

# SES Admin Email

AWS Email identities are needed for the cognito login system. One is
for your subdomain and one is for the admin’s email.  You create the
identities using the AWS SES console.  I created identities for:

~~~
collections.sflennik.com
steve.flenniken@gmail.com
~~~

To create an identity for the collections.sflennik.com domain:

* go to the AWS SES console
* click Configuration > Identities in the left panel
* click the "Create Identity" button
* in the section "Identity type" select Domain
* in the Domain editbox enter "collections.sflennik.com"
* in the Tags section click "Add new tag" and enter key "collections"
  and value "Collections subdomain identity".
* click "Create Identity" button at the bottom of the page.
* click the button to automatically add DNS records to Route53.

Note: It takes a minute or so to verify the identity.

Create an identity for the collections admin (yourself):

* click the "Create Identity" button
* in the section "Identity type" select Email
* in the Domain editbox enter your address e.g. steve.flenniken@gmail.com
* in the Tags section click "Add new tag" and enter key "collections"
  and value "Collections admin email".
* click "Create Identity" button at the bottom of the page.

Note: you will get an email containing a link you click to verify the
identity.

Verify the collections.sflennik.com domain by sending an email from it
to yourself.

* click Configuration > Identities in the left panel
* click collections.sflennik.com
* click "Send test email"
* enter "admin" in the "From-address" editbox
* for Scenario select Custom
* for "Custom recipient" enter steve.flenniken@gmail.com
* for Subject enter "test message from SES"
* for Body enter "testing"
* click "Send email"
* make sure you get the email

Verity the sflenni.com DNS records exist.

~~~
aws route53 list-resource-record-sets \
  --hosted-zone-id Z0529194UJ7ON89LPSGU \
  | grep sflennik.com

  "Name": "sflennik.com.",
  "Name": "sflennik.com.",
  "Name": "sflennik.com.",
  "Name": "_1ea5c2c57b77f24b333bda95c117ff0d.sflennik.com.",
  "Name": "collections.sflennik.com.",
  "Name": "_2e6e3dc1983aa3586ffbf629530096ef.collections.sflennik.com.",
  "Name": "_dmarc.collections.sflennik.com.",
  "Name": "ghhudi4my7okvirxpndfritfl6isbvil._domainkey.collections.sflennik.com.",
  "Name": "muwrvw6jnt7er5cqxnt3f64ccg7lrht3._domainkey.collections.sflennik.com.",
  "Name": "raqvkjw5bexcyjao7xpjczdtybbnjeil._domainkey.collections.sflennik.com.",
~~~

[⬇](#Contents)

# Create User Pool

An AWS Cognito user pool maintains the website's users.

Create the Cognito user pool called collections-pool by running the
cognito script as shown below.

~~~
# from docker container
scripts/cognito -c

Choose the SES email to use when sending mail to users.
0: exit
1: steve.flenniken@gmail.com
Number?: 1

What friendly name should be used with the email?
Example: Steve Flenniken
Name?: Steve Flenniken

Enter your domain name where collections is hosted.
Example: collections.sflennik.com
Domain?: collections.sflennik.com
~~~

Verify the collections-pool exists:

~~~
scripts/cognito -p

collections-pool
~~~

Verify the collections-pool settings:

~~~
scripts/cognito -s | less

  ...
  redirect_uri: 'https://collections.sflennik.com/index.html'
  logout_uri: 'https://collections.sflennik.com/index.html'
  ...
~~~

[⬇](#Contents)

# Create Config File

The config file is used by the website build process so the resulting
Collection's code knows how to communicate with the user pool.

You create the config file with the cognito script as shown below. It
reads the "collections-pool" information from AWS and writes it to a
file.

~~~
# docker container
scripts/cognito -w

Wrote the aws-settings.json config file. View it with:

  cat env/aws-settings.json | jqless
~~~

The [aws-settings.json] file looks something like this:

~~~
{
  "settings": {
    "client_id": "47ahgb3e4jqhk86o7gugvbglf8",
    "redirect_uri": "https://collections.sflennik.com/index.html",
    "logout_uri": "https://collections.sflennik.com/index.html",
    "scope": "openid profile aws.cognito.signin.user.admin",
    "domain": "https://pool18672788.auth.us-west-2.amazoncognito.com",
    "redirect_uri_local": "http://localhost:8000/index.html",
    "logout_uri_local": "http://localhost:8000/index.html",
    "pool_name": "collections-pool",
    "distribution_id": "EHLMG1T8SOX48",
    "bucket_name": "sflennikco"
  }
}
~~~

[⬇](#Contents)

# Create First Users

Create a normal user and an admin user using the cognito
console. I used:

* steve.flenniken@gmail.com
* steve.flenniken+admin@gmail.com

Follow the Create User procedure.

[⬇](#Contents)

# Build and Deploy

Build everything and deploy to to S3:

~~~
# from docker container
cd ~/collections
g all
scripts/deploy -s
~~~

[⬇](#Contents)

# View a Collection

* in your browser go to https://collections.sflennik.com
* login
* download the first collection
* view the thumbnails
* view the images

<style>body { max-width: 40em}</style>

# Contents

* [Overview](#overview)
* [Create IAM User](#create-iam-user)
* [Create S3 Bucket](#create-s3-bucket)
* [Copy Website](#copy-website)
* [Register a domain](#register-a-domain)
* [Create CloudFront Distribution](#create-cloudfront-distribution)
* [Allow CloudFront S3 Access](#allow-cloudfront-s3-access)
* [SES Admin Email](#ses-admin-email)
* [Create User Pool](#create-user-pool)
* [Create Config File](#create-config-file)
* [Create First Users](#create-first-users)
* [Build and Deploy](#build-and-deploy)
* [View a Collection](#view-a-collection)
