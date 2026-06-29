// Handle push notifications. This file is concatenated with index.ts.

const VAPID_PUBLIC_KEY = 'BHk9EYgRQUfVCy4pvSj2S0Kr_9tCeOjRmbih4x0\
Qqc0az0bNvr8O5ZnqwhP0DCdGESCx8CnbjrUlL2pLs68gksk'

document.addEventListener("visibilitychange", async () => {
  if (document.visibilityState === "visible") {
    log("Notifications: page visible")
    await ensureNotifications()
    await clearAppBadge()
  } else {
    log("Notifications: page not visible")
  }
})

async function ensureNotifications() {
  try {
    if (!hasLoggedIn()) {
      log("Notifications: user not logged in, skipping")
      return
    }

    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      log("Notifications: push not supported in this browser")
      return
    }

    const userInfo = fetchUserInfo()
    if (!userInfo) {
      log("Notifications: no user info, skipping")
      return
    }

    const permission = Notification.permission
    log(`Notifications: permission is "${permission}"`)

    if (permission === "denied") {
      log("Notifications: disabled in system settings")
      return
    }

    if (permission === "granted") {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      if (subscription) {
        log("Notifications: already subscribed")
        logPushSubscription(subscription, userInfo.userId)
        return
      }
    }

    if (permission === "default") {
      log("Notifications: permission default (not set), requesting from system")
      const result = await Notification.requestPermission()
      log(`Notifications: permission result is "${result}"`)
      if (result !== "granted") {
        log("Notifications: permission not granted")
        return
      }
    }

    const registration = await navigator.serviceWorker.ready
    let subscription = await registration.pushManager.getSubscription()
    if (!subscription) {
      log("Notifications: no push subscription, subscribing")
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY).buffer as ArrayBuffer
      })
    } else {
      log("Notifications: using existing push subscription")
    }

    logPushSubscription(subscription, userInfo.userId)

  } catch (error) {
    console.error("Notifications: unexpected error", error)
  }
}

function logPushSubscription(subscription: PushSubscription, userId: string) {
  const record = pushSubscriptionRecord(subscription, userId)
  log("Notifications: subscription:", JSON.stringify(record, null, 2))
}

function pushSubscriptionRecord(subscription: PushSubscription, userId: string) {
  const sub = subscription.toJSON()
  return {
    userId,
    endpoint: sub.endpoint,
    expirationTime: sub.expirationTime,
    keys: sub.keys,
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

async function clearAppBadge() {
  if (!("clearAppBadge" in navigator))
    return

  await (navigator as any).clearAppBadge()
  log("Notifications: App badge cleared.")
}
