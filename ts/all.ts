// Shared code concatenated with all the other ts files. The window
// and document objects are not used here. See win.ts for shared code
// using the window and document objects.

// The name of the application cache where we store the collections
// images.
const appCacheName = "collections-v1"

const log = console.log
const logError = console.error

function two(num: number) {
  // Return the number rounded to two decimal places.
  return Math.round(num * 100 ) / 100;
}

function three(num: number) {
  // Return the number rounded to three decimal places.
  return Math.round(num * 1000 ) / 1000;
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
