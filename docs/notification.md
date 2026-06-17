# Badge Notifications

When a new collection is published, users see a notification and a red
badge on the installed iPhone PWA icon.

The badge indicates that at least one new collection has been
published since the user last opened the app. It is not an
unread-tracking system and does not track collection views or
downloads.

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

Users choose whether to receive notifications when they first run the
application. They can later change this setting through the operating
system notification settings.

[⬇](#Contents) Contents

# Platform

The notification feature targets the primary Collections deployment
platform.

* iPhone
* Safari
* Home Screen installed PWA
* AWS backend

Support for other platforms is not currently a priority.

[⬇](#Contents) Contents

# Existing Behavior

Collections are published periodically through a primarily static
website.

Users download collections before viewing them. Downloaded collections
and application state are stored locally in browser storage.

The application does not maintain a server-side database that tracks
whether a user has viewed a collection.

Unseen collections are already identified in the collection list using
a download icon.

[⬇](#Contents) Contents

# Badge Behavior

The badge is set when a push notification is received and cleared when
the application starts.

APIs used:

* registration.setAppBadge()
* navigator.setAppBadge()
* navigator.clearAppBadge()

The badge should persist while the application is closed and disappear
as soon as the user opens the application.

[⬇](#Contents) Contents

# Service Worker

The service worker handles notification-related background processing.

Responsibilities:

* Receive push events.
* Display notifications.
* Set the application badge.
* Handle notification click events.

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

# Tasks

The notification feature can be implemented and tested as independent
tasks.

Frontend tasks:

* Create VAPID key
* Enable notifications and register push subscription.
* Update the service worker to process Web Push notifications.
* Clear the badge when the application starts.

Backend tasks:

* Configure API Gateway, Lambda, and DynamoDB using AWS APIs.
* Retrieve backend configuration for testing and debugging.
* Store a user subscription.
* Retrieve one or more subscriptions for testing and debugging.
* Send a notification to one user or all users.

[⬇](#Contents) Contents

# Create VAPID Key

You create the VAPID key by running the notification.js file.  You
only need to do this once. Save the public and private parts to a safe
private location.

The key is used to send a push notification.

~~~
cd ~/collections
node scripts/notification.js
~~~

# Enable Notifications

You can enable notifications and register push subscription by
selecting the "enable notifications" menu item in the about box.

When testing in Chrome, you can reset notifications in the developer
tools.  Click the lock icon to the left of the URL at the top of the
page, then click Reset Notifications.

<style>body { max-width: 40em}</style>

# Contents

* [Notification Flow](#notification-flow) -– end-to-end behavior when a collection is published.
* [Platform](#platform) -– supported platform and deployment assumptions.
* [Existing Behavior](#existing-behavior) -– current collection download and storage behavior.
* [Badge Behavior](#badge-behavior) -– how badges are set and cleared.
* [Service Worker](#service-worker) -- background notification processing responsibilities.
* [Subscription Management](#subscription-management) -- user notification registration workflow.
* [Architecture](#architecture) -- AWS components and notification delivery flow.
* [Acceptance Criteria](#acceptance-criteria) -- requirements used to validate the feature.
* [Tasks](#tasks) -- implementation work broken into smaller units.
* [Create VAPID Key](#create-vapid-key) -- how to create a VAPID key used when pushing a notification.
* [Enable Notifications](#enable-notifications) -- how to enable notifications and register push.

