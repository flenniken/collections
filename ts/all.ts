// Shared code concatenated with all the other ts files. The window
// and document objects are not used here. See win.ts for shared code
// using the window and document objects.

// The name of the application cache where we store the collections
// images.
const appCacheName = "collections-v1"

const ACCESS_TOKEN_REFRESH_BUFFER_MS = 60 * 1000

const log = console.log
const logError = console.error

function accessTokenExpFromJwt(access_token: string): number | null {
  // Read the exp claim from a JWT access token.
  try {
    const part = access_token.split('.')[1]
    const padding = '='.repeat((4 - part.length % 4) % 4)
    const base64 = (part + padding).replace(/\-/g, '+').replace(/_/g, '/')
    const payload = JSON.parse(atob(base64))
    if (typeof payload.exp === "number")
      return payload.exp * 1000
  } catch {
  }
  return null
}

type ImageAuth = {accessToken: string, userId: string, exp: number | null}

const imageAuthDbName = "collections-auth"
const imageAuthStore = "auth"
const imageAuthKey = "current"

function isImageAuthValid(auth: ImageAuth | null): auth is ImageAuth {
  if (!auth || !auth.accessToken || !auth.userId)
    return false
  const exp = auth.exp ?? accessTokenExpFromJwt(auth.accessToken)
  if (!exp)
    return true
  return Date.now() < exp
}

function openImageAuthDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(imageAuthDbName, 1)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(imageAuthStore))
        db.createObjectStore(imageAuthStore)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function storeImageAuth(auth: ImageAuth) {
  const db = await openImageAuthDb()
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(imageAuthStore, "readwrite")
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
      tx.objectStore(imageAuthStore).put(auth, imageAuthKey)
    })
  }
  finally {
    db.close()
  }
}

async function readImageAuth(): Promise<ImageAuth | null> {
  const db = await openImageAuthDb()
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(imageAuthStore, "readonly")
      const request = tx.objectStore(imageAuthStore).get(imageAuthKey)
      request.onsuccess = () => {
        const value = request.result as ImageAuth | undefined
        if (value && value.accessToken && value.userId)
          resolve(value)
        else
          resolve(null)
      }
      request.onerror = () => reject(request.error)
    })
  }
  finally {
    db.close()
  }
}

async function clearImageAuth() {
  const db = await openImageAuthDb()
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(imageAuthStore, "readwrite")
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
      tx.objectStore(imageAuthStore).delete(imageAuthKey)
    })
  }
  finally {
    db.close()
  }
}

function two(num: number) {
  // Return the number rounded to two decimal places.
  return Math.round(num * 100 ) / 100;
}

function three(num: number) {
  // Return the number rounded to three decimal places.
  return Math.round(num * 1000 ) / 1000;
}

function getRandom8(): string {
  // Return a random string of 8 alphanumeric characters (base62).
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
  let result = ""
  for (let i = 0; i < 8; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length)
    result += chars[randomIndex]
  }
  return result
}

class Timer {
  // Time how long code takes to run, accurate to about thousands of a
  // second.  Note: use date() instead of performance() for
  // microseconds accuracy.
  start: number;
  constructor() {
    this.start = performance.now()
  }
  seconds() {
    return (performance.now() - this.start) / 1000.0
  }
  log(message: string) {
    log(`${three(this.seconds())}s ----- ${message}`)
  }
}

async function openCreateCache(): Promise<Cache> {
  // Open or create the application cache and return it.
  if (typeof caches === "undefined")
    throw new Error("The application cache is not supported.")
  const cache = await caches.open(appCacheName)
  if (!cache)
    throw new Error("Unable to open the application cache.")
  return cache
}

function isCollectionCachePath(pathname: string, cNum: number): boolean {
  // True for this collection's cached photos, pages, and ready mark.
  if (pathname === `/c${cNum}-ready`)
    return true
  return pathname.startsWith(`/images/c${cNum}/`)
}

async function deleteCollectionFromCache(cNum: number) {
  // Remove this collection's files from the application cache.
  const cache = await openCreateCache()
  const requests = await cache.keys()
  const pending: Promise<boolean>[] = []
  for (const request of requests) {
    let pathname = request.url
    try {
      pathname = new URL(request.url).pathname
    } catch {
    }
    if (isCollectionCachePath(pathname, cNum))
      pending.push(cache.delete(request))
  }
  await Promise.all(pending)
}
