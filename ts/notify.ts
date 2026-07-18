// Handle push notifications. This file is concatenated with index.ts.

// This key must match the public value in the container's
// ~/.aws/vapid file [VAPID] section.
const VAPID_PUBLIC_KEY = 'BDHakmrjRIE_lXPCCfX3HmyN4fbAOE0af08LQ5Lpe4On3E-87f1XyaZ_1LRvdh-0KZRvdY3KJr1-ZiIGHv8iNA4'

const NOTIFICATIONS_ON_KEY = 'notificationsOn'
const VAPID_PUBLIC_KEY_LOCAL_KEY = 'notificationsVapidPublicKey'

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

    const userInfo = await ensureValidAccessToken()
    if (!userInfo) {
      log("Notifications: no user info, skipping")
      return
    }

    const permission = Notification.permission
    log(`Notifications: permission is "${permission}"`)

    const registration = await navigator.serviceWorker.ready

    if (permission === "denied") {
      log("Notifications: disabled in system settings")
      await clearPushSubscription(registration)
      setNotificationsOnLocally(false)
      updateAboutNotifications()
      return
    }

    if (permission === "default") {
      log("Notifications: permission default, enable from the about box")
      await clearPushSubscription(registration)
      setNotificationsOnLocally(false)
      updateAboutNotifications()
      return
    }

    if (shouldResubscribeForVapid()) {
      log("Notifications: VAPID public key changed, re-subscribing")
      await clearPushSubscription(registration)
      setNotificationsOnLocally(false)
      clearStoredVapidPublicKey()
    }

    let subscription = await registration.pushManager.getSubscription()
    if (!subscription) {
      log("Notifications: no push subscription, subscribing")
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY).buffer as ArrayBuffer
      })
    } else {
      log("Notifications: already subscribed")
    }

    await syncNotificationState(subscription, userInfo)
    updateAboutNotifications()

  } catch (error) {
    console.error("Notifications: unexpected error", error)
  }
}

function notificationsOnLocally(): boolean {
  return localStorage.getItem(NOTIFICATIONS_ON_KEY) === 'true'
}

function setNotificationsOnLocally(on: boolean) {
  localStorage.setItem(NOTIFICATIONS_ON_KEY, on ? 'true' : 'false')
  if (!on)
    clearStoredVapidPublicKey()
}

function storedVapidPublicKey(): string | null {
  return localStorage.getItem(VAPID_PUBLIC_KEY_LOCAL_KEY)
}

function setStoredVapidPublicKey() {
  localStorage.setItem(VAPID_PUBLIC_KEY_LOCAL_KEY, VAPID_PUBLIC_KEY)
}

function clearStoredVapidPublicKey() {
  localStorage.removeItem(VAPID_PUBLIC_KEY_LOCAL_KEY)
}

function shouldResubscribeForVapid(): boolean {
  // Re-subscribe when the public key changed, or when notifications were
  // on before we stored the key (legacy clients after a deploy).
  const stored = storedVapidPublicKey()
  if (stored === VAPID_PUBLIC_KEY)
    return false
  if (stored === null && !notificationsOnLocally())
    return false
  return true
}

async function syncNotificationState(subscription: PushSubscription, userInfo: UserInfo) {
  if (Notification.permission !== "granted") {
    setNotificationsOnLocally(false)
    return
  }

  logPushSubscription(subscription, userInfo.userId)

  if (!notificationsOnLocally()) {
    log("Notifications: state switched to on, saving subscription")
    const saved = await saveSubscriptionToBackend(subscription, userInfo)
    if (saved) {
      setNotificationsOnLocally(true)
      setStoredVapidPublicKey()
    }
  }
}

async function saveSubscriptionToBackend(
  subscription: PushSubscription,
  userInfo: UserInfo,
): Promise<boolean> {
  const url = settings.subscriptions_api_url
  if (!url) {
    log("Notifications: subscriptions_api_url not configured, skipping save")
    return false
  }

  const validUserInfo = await ensureValidAccessToken()
  if (!validUserInfo) {
    log("Notifications: no valid access token, skipping save")
    return false
  }

  const body = pushSubscriptionRecord(subscription, validUserInfo.userId)

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${validUserInfo.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    const text = await response.text()
    if (!response.ok) {
      log(`Notifications: save failed: ${response.status} ${response.statusText}` +
        (text ? ` ${text}` : ''))
      return false
    }

    log("Notifications: subscription saved")
    return true
  } catch (error) {
    console.error("Notifications: save error", error)
    return false
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
    keys: sub.keys,
  }
}

async function clearPushSubscription(registration: ServiceWorkerRegistration) {
  const subscription = await registration.pushManager.getSubscription()
  if (!subscription)
    return

  log("Notifications: unsubscribing push subscription")
  await subscription.unsubscribe()
  log("Notifications: push subscription cleared")
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }

  return outputArray
}

async function clearAppBadge() {
  if (!("clearAppBadge" in navigator))
    return

  await (navigator as any).clearAppBadge()
  log("Notifications: App badge cleared.")
}

async function enableNotificationsFromAboutBox() {
  // Request notification permission from a user gesture, then subscribe.
  log("Notifications: enable from about box")

  if (!hasLoggedIn()) {
    window.alert(["You need to login before you can enable notifications."])
    return
  }

  if (!("Notification" in window) || !("serviceWorker" in navigator) ||
      !("PushManager" in window)) {
    log("Notifications: push not supported in this browser")
    return
  }

  if (Notification.permission !== "default") {
    updateAboutNotifications()
    return
  }

  const result = await Notification.requestPermission()
  log(`Notifications: permission result is "${result}"`)
  if (result !== "granted") {
    setNotificationsOnLocally(false)
    updateAboutNotifications()
    return
  }

  await ensureNotifications()
  updateAboutNotifications()
}

function canEnableNotificationsFromAboutBox(): boolean {
  if (!("Notification" in window))
    return false
  return Notification.permission === "default"
}

function updateAboutNotifications() {
  // Show notification status in the about box.
  const status = get("about-notifications")
  const enableMsg = get("about-notifications-enable-msg")
  const enableBtn = get("about-notifications-enable")
  const iphoneNote = get("about-iphone-notifications")

  const on = "Notification" in window && Notification.permission === "granted"
  status.textContent = on ? "🔔 Notifications on" : "Notifications off"

  if (canEnableNotificationsFromAboutBox()) {
    enableMsg.textContent =
      "When you turn on notifications you will be notified when there is a new collection."
    enableMsg.style.display = "block"
    enableBtn.style.display = "inline-block"
    iphoneNote.textContent = ""
    iphoneNote.style.display = "none"
  } else {
    enableMsg.textContent = ""
    enableMsg.style.display = "none"
    enableBtn.style.display = "none"

    if (navigator.platform == "iPhone" &&
        Notification.permission !== "default") {
      iphoneNote.innerHTML =
        "Use the system settings to turn on or off notifications:<br>" +
        "settings → Notifications → Collections"
      iphoneNote.style.display = "block"
    } else {
      iphoneNote.textContent = ""
      iphoneNote.style.display = "none"
    }
  }
}
