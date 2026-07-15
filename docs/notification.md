# Notification

When a new collection is published, users see a notification and a red
badge on the installed iPhone PWA icon. The notification looks similar to:

[![Notification](notification.png)](#)

and the badge looks like:

[![Badge](badge.png)](#)

The badge indicates that at least one new collection has been
published since the user last opened the app (the iphone requires a
number). It is not an unread-tracking system and does not track
collection views or downloads.

The collection list already shows unpublished content using the
existing download icon, so the badge only serves as an attention
indicator.

On an iPhone the user chooses whether to receive notifications using
the system notification settings:

~~~
settings > Notifications > Collections
~~~

[⬇](#Contents) Contents (table of contents at the bottom)

# Notification Flow

The notification system alerts users when new collections become available.

**Flow**:

* New collection is published.
* Backend code sends a Web Push notification.
* Application service worker code receives the push event.
* Service worker sets the icon application badge.
* User sees the badge on the home screen icon.
* User opens the application.
* Application immediately clears the badge.
* User sees the new collection with the existing download icon.

[⬇](#Contents) Contents

# Platform

The notification feature targets the primary Collections deployment
platform.

* iPhone
* Safari
* Home Screen installed PWA
* AWS backend

Besides the iPhone the code supports Chrome for testing but other
platforms are not currently a priority.

[⬇](#Contents) Contents

# Badge Behavior

The badge is set when a push notification is received and cleared when
the application becomes visible.

The badge persists while the application is closed and disappears as
soon as the user opens the application.

Collections manages user notification subscriptions by storing them in
AWS DynamoDB.

AWS notification services do not currently provide direct support for
browser Web Push subscriptions. Instead we use other AWS services to
implement it using:

* API Gateway
* Lambda
* DynamoDB
* Node.js web-push library

If you need to update node for web-push, follow the Update Node
document.

We expect the cost to store subscription in DynamoDB to be minimal. It
is dependent on the number of subscriptions stored and the number of
times they are used.

[⬇](#Contents) Contents

# Create VAPID Keys

The VAPID key is used to encrypt a push notification.

You create the VAPID key by running the notification command.  You
only need to do this once. The example below shows what the keys look
like. Each time you run the command it generates different keys (these
particular keys are not used anywhere).

~~~
cd ~/collections
scripts/notification -v

[VAPID]
public = BIp53n-hdpOUy74WWEnkRtMwNud6JCNt-jH2EmH5RaoLoFOSQWUBrp8oBK4h0zDAPPUMUu2fsQ4WbP_4GWEi8LY
private = hLtpU4Ttw2gFwGC80LhPiBANOJqVWqUZSdQCmgHYh9U
subject = your-email@example.com
~~~

Save the keys to `~/.aws/vapid` in a [VAPID] section so you
can recreate them when the container is rebuilt. Do not store them in
`~/.aws/credentials`; boto3 cannot parse a [VAPID] section there.
The subject is a contact email required by web-push when sending
notifications with --publish. The public key is
also stored publicly in the notify.ts file as the VAPID_PUBLIC_KEY
variable:

~~~
grep VAPID_PUBLIC_KEY ts/notify.ts
~~~

# AWS Services

Collections notifications uses AWS services API Gateway, Lambda and
DynamoDB.

* API Gateway -- provides an entry point to the services. It validates the
call with the Cognito access token, then calls the save-subscription
lambda function.
* Lambda save-subscription -- stores the subscription in the DynamoDB database
* DynamoDB -- stores subscriptions

**API Gateway**

The notification script creates a regional POST REST API named
collections-push-subscriptions.

The API Gateway entry point is built from several variables:

* nkk8ycohmk -- a unique API key assigned when the collections-push-subscriptions API was created
* us-west-2 -- the region where the api code runs, from the '~/.aws/config' file
* prod -- the production stage. This is the only stage deployed.
* subscriptions -- the resource path of collections-push-subscriptions

The collections-push-subscriptions entry point is:

~~~
https://nkk8ycohmk.execute-api.us-west-2.amazonaws.com/prod/subscriptions
~~~

The script prints the URL when you run --configure.

**Authentication**

API Gateway validates the caller before the request reaches Lambda. A
Cognito authorizer named 'cognito' checks the 'Authorization' header
for a Bearer JWT from the Collections user pool.

All logged users are allowed because the standard Cognito access token
scope issued to logged-in users is passed to the API.

When a user turns notifications on, the browser saves the subscription
through this API. See [Save Subscription](#save-subscription) for
the request format and manual testing with the notification script.

**Request body**

The POST body is JSON with these fields:

~~~
{
  "userId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "endpoint": "https://fcm.googleapis.com/fcm/send/...",
  "keys": {
    "p256dh": "...",
    "auth": "..."
  }
}
~~~

* userId -- Cognito user id from the logged-in session
* endpoint -- push service URL from 'PushSubscription.toJSON()'
* keys.p256dh -- client public key
* keys.auth -- authentication secret

These are the same fields logged by 'ts/notify.ts' when the user
subscribes to notifications.

The --configure option creates POST /subscriptions with Cognito
authorization, OPTIONS /subscriptions for CORS preflight, and gateway
error responses with CORS headers (so auth failures are visible to
browsers). Run --deploy save-subscription to wire the Lambda
integration.

**Lambda**

The save-subscription Lambda function stores push subscriptions in
DynamoDB. Lambda source lives in 'env/lambda/save-subscription'.

API Gateway invokes the function on each authenticated POST
/subscriptions request. A (userId, endpoint) identifies exactly one
record in the DB.

The function receives the JSON body described above and it refreshes
existing record or it creates a new subscription record when the
(userId, endpoint) doesn't exist.

Deploy the function with:

~~~
node scripts/testSaveSubscription.js
env/lambda/save-subscription/make-js-lambda-zip
scripts/notification --deploy save-subscription
~~~

**DynamoDB**

The notification script creates a DynamoDB table named
'collections-push-subscriptions' in the configured AWS region. Billing
mode is pay-per-request.

**Keys**

The table uses a composite primary key of (user id, endpoint):

* userId (partition key) -- Cognito user id
* endpoint (sort key) -- push service URL

A user can have multiple subscriptions, one per device or browser. Each
device has a different endpoint URL.

**Stored fields**

Each item stores:

* userId -- Cognito user id
* endpoint -- push service URL
* keys -- object with 'p256dh' and 'auth' from the browser subscription
* updatedAt -- ISO timestamp set when the subscription is saved

**Access**

The save-subscription Lambda writes items when a user subscribes.

## Save Subscription

When notifications are turned on, `ts/notify.ts` posts the subscription
to API Gateway using the logged-in user's access token. To save a
subscription manually from the command line (for testing):

~~~
scripts/notification -s chrome-subscription.json
~~~

The subscription JSON file contains the same fields as the POST body
above: `userId`, `endpoint`, and `keys` (`p256dh` and `auth`). Copy
them from the browser console log when the user subscribes.

The script sends the access token from `tmp/tokens.json` as a Bearer
header. Create tokens with `scripts/login-flow -g <code>` or
`scripts/login-flow -r`. The file's `userId` must match the token user.

## Publish Notifications

Send a collection notification to one user or all subscribers:

~~~
scripts/notification --publish all "New Tokyo collection"
scripts/notification --publish <user-id> "New Tokyo collection"
~~~

The command scans DynamoDB and sends a push notification to each
matching subscription. Use "all" to notify every subscriber, or pass
a Cognito user id to test with one user. Add a subject line to the
[VAPID] section of ~/.aws/vapid (contact email for web-push).

When a push endpoint returns 410 Gone (or 404 Not Found), the
subscription is removed from DynamoDB automatically.

## List Subscriptions

List stored subscriptions with:

~~~
scripts/notification --get-subscriptions
scripts/notification --get-subscriptions json
~~~

The first form prints one line per subscription (date, user id, short
endpoint). The 'json' form prints the full items.

**Configure**

You configure the services with the notification command's --configure
option as shown below. The configure option is idempotent.

~~~
scripts/notification --configure

Table collections-push-subscriptions already exists.
API Gateway collections-push-subscriptions already exists (nkk8ycohmk).
Cognito authorizer already exists (037rvv).
Resource /subscriptions already exists.
POST /subscriptions already exists.
Deploying API to stage prod.
API Gateway ready: POST https://nkk8ycohmk.execute-api.us-west-2.amazonaws.com/prod/subscriptions
~~~

# Testing

Testing Web Push Notifications requires handling quirks across iOS and
desktop Chrome. Use this guide to test the subscription workflow.

There is no event to detect when the notification settings are
changed. We handle notification enabling when the page becomes
visible on the visibilitychange event.

For testing look at the console logs since we log notification
actions.

**iPhone**

On the iPhone, unlike Chrome, you don't see the notifiction dialog.
Instead you use the system settings to enable notifications:

~~~
settings > Notifications > Collections
~~~

We don't show the system notification dialog on the iPhone because the
iPhone requires that it's called from a click event.  We manage
notifications on the visibilty event.

The API supports three states, and iOS uses two: **default** and
**granted**.  When a user disables notifications in iOS Settings, the
state reverts to default. When they toggle it back on, it changes to
granted.

When the state is default, the code removes the stale subscription.
When testing make sure new subscriptions are different than before.

**Chrome**

On Chrome there are three notification states: **granted**, **denied**
and **default**.

On Chrome you will see the request permission dialog when the
requestPermission function is called and the state is default. It
doesn't show when in the other states.  The function returns either
granted or denied.

So you will only see the dialog once, unless you use the system
settings UI to change the state back to default.

On Chrome the system UI appears when clicking the lock icon on the
address bar to the left of the url.

You can generate a visibilitychange event by clicking a browser tab
then clicking the Collection's tab.

When testing notifications use both the dialog and the system settings
to make sure Collections subscribes to notifications both ways.

**Logging**

When you toggle between tabs and notifications are on, you will see
logging similar to this on both platforms:

~~~
Notifications: page not visible
Notifications: page visible
Notifications: permission is "granted"
Notifications: already subscribed
Notifications: subscription: {
  "userId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "endpoint": "https://fcm.googleapis.com/fcm/send/xxxxxxxxxx-xxxxx...",
  "keys": {
    "p256dh": "xxxxxxxxxxxx...",
    "auth": "xxxxxx..."
  }
}
Notifications: App badge cleared.
~~~

We save the browser's notification subscription when notifications are
turned on.  We save the fact that notifications are on locally so we
don't save to AWS on every visibility event.  For testing you can
remove the saved state.  Run the following in the js console:

~~~
localStorage.removeItem('notificationsOn')
~~~

<style>body { max-width: 40em}</style>

# Contents

* [Notification Flow](#notification-flow) -– end-to-end behavior when a collection is published.
* [Platform](#platform) -– supported platform and deployment assumptions.
* [Badge Behavior](#badge-behavior) -– how badges are set and cleared.
* [Create VAPID Keys](#create-vapid-keys) -- how to create the VAPID keys used when pushing a notification.
* [AWS Services](#aws-services) -- how the aws services, API Gateway, Lambda and DynamoDB support notifications.
* [Save Subscription](#save-subscription) -- save a push subscription manually for testing.
* [Publish Notifications](#publish-notifications) -- notify users when a collection is published.
* [List Subscriptions](#list-subscriptions) -- list push subscriptions stored in DynamoDB.
* [Testing](#testing) -- how to test the notification feature.

