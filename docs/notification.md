# Notifications

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

We expect the cost to store subscription in DynamoDB to be minimal. It
is dependent on the number of subscriptions stored and the number of
times they are used.

[⬇](#Contents) Contents

# Create VAPID Key

The VAPID key is used to encrypt a push notification.

You create the VAPID key by running the notification command.  You
only need to do this once.

Save the private key to a safe private location. The public key is
stored publicly visible in the notify.ts file as the VAPID_PUBLIC_KEY
variable.

~~~
cd ~/collections
scripts/notification -v
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

The iPhone requires that the system notification dialog be called from
a click event but we don't do that, call it from the visibilty event.

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
  "expirationTime": null,
  "keys": {
    "p256dh": "xxxxxxxxxxxx...",
    "auth": "xxxxxx..."
  }
}
Notifications: App badge cleared.
~~~

<style>body { max-width: 40em}</style>

# Contents

* [Notification Flow](#notification-flow) -– end-to-end behavior when a collection is published.
* [Platform](#platform) -– supported platform and deployment assumptions.
* [Badge Behavior](#badge-behavior) -– how badges are set and cleared.
* [Create VAPID Key](#create-vapid-key) -- how to create a VAPID key used when pushing a notification.
* [Testing](#testing) -- how to test the notification feature.

