# Notifications

When a new collection is published, users see a notification and a red
badge on the installed iPhone PWA icon. The notification looks similar to:

[![Notification](notification.png)](#)

The badge indicates that at least one new collection has been
published since the user last opened the app. It is not an
unread-tracking system and does not track collection views or
downloads. The iphone requires a number.

[![Badge](badge.png)](#)

The collection list already shows unpublished content using the
existing download icon, so the badge only serves as an attention
indicator.

[⬇](#Contents) Contents (table of contents at the bottom)

# Notification Flow

The notification system alerts users when new collections become available.

Flow:

* New collection is published.
* AWS sends a Web Push notification.
* Service worker receives the push event.
* Service worker sets the application badge.
* User sees the badge on the Home Screen icon.
* User opens the application.
* Application immediately clears the badge.
* User sees the new collection with the existing download icon.

On an iPhone the user chooses whether to receive notifications using
the system notification settings:

~~~
settings > Notifications > Collections
~~~

[⬇](#Contents) Contents

# Platform

The notification feature targets the primary Collections deployment
platform.

* iPhone
* Safari
* Home Screen installed PWA
* AWS backend

The code supports Chrome for testing but other platforms is not
currently a priority.

[⬇](#Contents) Contents

# Badge Behavior

The badge is set when a push notification is received and cleared when
the application becomes visible.

The badge should persist while the application is closed and disappear
as soon as the user opens the application.

[⬇](#Contents) Contents

# Subscription Management

The application manages user notification subscriptions.

It has the responsibilities:

* Request notification permission.
* Create a PushSubscription.
* Register the subscription with the AWS backend.

[⬇](#Contents) Contents

# Architecture

AWS notification services do not currently provide direct support
for browser Web Push subscriptions. Instead we use other AWS services
to implement it ourself using:

* API Gateway
* Lambda
* DynamoDB
* Node.js web-push library

This architecture is commonly used by PWA's for Safari, Chrome, and
Edge.

We store the notification subscriptons in DynamoDB. For a small
application with fewer than 100 users and approximately two collection
updates per week, DynamoDB costs are expected to be minimal.

[⬇](#Contents) Contents

# Acceptance Criteria

The notification feature is complete when the following conditions are
met:

* Publishing a collection sends a push notification.
* Publishing a collection sets the application badge.
* The badge persists while the application is closed.
* The badge clears when the application opens.
* User subscriptions are stored in AWS.
* Existing download icon behavior remains unchanged.
* The solution works on an iPhone Home Screen PWA.

[⬇](#Contents) Contents

# Create VAPID Key

You create the VAPID key by running the notification command.  You
only need to do this once. Save the public and private parts to a safe
private location.

The key is used to send a push notification.

~~~
cd ~/collections
scripts/notification -v
~~~

# Testing Guide

Testing Web Push Notifications requires handling quirks across iOS and
desktop Chrome. Use this guide to test the subscription workflow.

There is no event to detect when the notification settings are
changed. We handle notification enabling when the page becomes
visible.

We log notification actions.  Look at logging for testing.

**iPhone**

On an iphone you use the system settings to enable notifications:

~~~
settings > Notifications > Collections
~~~

The system notification dialog doesn't appear when called from the
visibilty event, it must be called from a click event. We don't call
it on an iPhone.

When a user disables notifications in iOS Settings, the state reverts
to **default**. When they toggle it back on, it changes to
**granted**.

When the state is default, the code removes the stale subscription.
Make sure new subscriptions are different that before.

**Chrome**

On Chrome you will see the request permission dialog. The user gets
one chance to responded to the system notification dialog shown by
requestPermission.

On Chrome there are three notification states: **granted**, **denied**
and **default**.

The second time you call requestPermission the dialog does not
show. The user can still change their notification setting but they
need to use the system settings to do it. The notification dialog
appears when in the default state but not the others.

You can generate a visibilitychange event by clicking a tab then
clicking the Collection's tab.

Test enabling notifications using the system settings to make sure
Collections subscribes to notifications that way.

On Chrome you can set the notification state by clicking the lock icon
on the address bar to the left of the url.

**Logging**

When you toggle between tabs and notifications are on, you will see
logging similar to this on both platforms:

~~~
Notifications: page not visible
Notifications: page visible
Notifications: permission is "granted"
Notifications: already subscribed
Notifications: subscription: {
  "userId": "0861d3e0-00a1-7058-ad19-4d7b1880d276",
  "endpoint": "https://fcm.googleapis.com/fcm/send/xxxxxxxxxx-xxxxx-xxxxx-xxxx-xxxx",
  "expirationTime": null,
  "keys": {
    "p256dh": "xxxxxxxxxxxx-xxxxxxxxxxxxxx-xxxxxxxxxxxxxxx",
    "auth": "xxxxxxxxxxxxxxxxxxxxxx"
  }
}
Notifications: App badge cleared.
~~~

<style>body { max-width: 40em}</style>

# Contents

* [Notification Flow](#notification-flow) -– end-to-end behavior when a collection is published.
* [Platform](#platform) -– supported platform and deployment assumptions.
* [Badge Behavior](#badge-behavior) -– how badges are set and cleared.
* [Subscription Management](#subscription-management) -- user notification registration workflow.
* [Architecture](#architecture) -- AWS components and notification delivery flow.
* [Acceptance Criteria](#acceptance-criteria) -- requirements used to validate the feature.
* [Create VAPID Key](#create-vapid-key) -- how to create a VAPID key used when pushing a notification.
* [Testing](#testing) -- how to test the notification feature.

