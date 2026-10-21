// Service worker code.

// https://web.dev/learn/pwa/service-workers:
//
// Service workers get updated when the browser detects that the
// service worker currently controlling the client and the new (from
// your server) version of the same file are byte-different.
//
// This worker calls skipWaiting and clients.claim so a new version
// takes over on the next navigation without closing every tab.
//
// If not already running, a service worker will start whenever a
// network request in its scope is asked for, or when a triggering
// event, like periodic background sync or a push message, is
// received.

const cacheUrlPrefix = "/images/"

function logsw(message: string) {
  // Log to the service worker console. Works in Chrome Web Inspector.
  // On iPhone Safari, service worker logs (especially during push events)
  // are not shown reliably in Web Inspector; test push and badge behavior
  // on iPhone without relying on log output.
  log("👷 " + message)
}

async function setPushAppBadge() {
  if (!("setAppBadge" in navigator)) {
    logsw("App badge not supported.")
    return
  }
  // iOS doesn't support a plain red circle, you need to specify a number.
  await (navigator as any).setAppBadge(1);
  logsw("App badge set.")
}

self.addEventListener("install", (event: Event) => {
  logsw("Install service worker.");
  // Take over on this navigation so localhost json bypass applies
  // without closing every tab.
  (event as ExtendableEvent).waitUntil((self as unknown as ServiceWorkerGlobalScope).skipWaiting())
})

async function openCreateCache(): Promise<Cache> {
  // Open or create the application cache and return it. When the
  // application cache is not supported or cannot be opened or created
  // generate an exception.

  let cache: Cache
  cache = await caches.open(appCacheName);
  if (!cache)
    throw new Error("Unable to open the application cache.")
  return cache
}

self.addEventListener("activate", event => {
  // https://web.dev/learn/pwa/service-workers:
  //
  // When the service worker is ready to control its clients, the
  // activate event will fire. Claim existing pages so a new worker
  // starts handling fetches without waiting for every tab to close.

   logsw("Activate service worker.");
   (event as ExtendableEvent).waitUntil(
     (self as unknown as ServiceWorkerGlobalScope).clients.claim())
})

self.addEventListener("push", (event: Event) => {
  // Handle Web Push events.
  const pushEvent = (<PushEvent>event)
  pushEvent.waitUntil((async () => {
    logsw("push event received.")
    if (!pushEvent.data) {
      logsw("Push event has no data.")
      return
    }

    // Get the title and body from the push data.
    const payload = pushEvent.data.json() as {title?: string, body?: string}
    logsw(`Push payload: ${JSON.stringify(payload, null, 2)}`)
    const title = payload.title ?? ""
    const body = payload.body ?? ""

    // Show the push notification and set the badge.
    await Promise.all([
      (self as any).registration.showNotification(title, {body}),
      setPushAppBadge(),
    ])
  })())
})

function stripUrlParameters(url: string): string {
  // Return the url without any query parameters.
  let u = new URL(url)
  u.hash = ''
  u.search = ''
  return u.toString()
}

async function fetchRemote(cache: Cache, request: Request,
    storeTwice: boolean, useBrowserFreshness = false): Promise<Response> {
  // Fetch a file on the net and store it in one or more
  // caches. Return a promise that resolves to a response.
  //
  // When storeTwice is true, revalidate with the network so a
  // CloudFront invalidation is visible, then store the result in the
  // browser cache and the application cache.
  //
  // When storeTwice is true and useBrowserFreshness is true, honor
  // the page's cache mode instead. A fresh max-age response comes
  // from the HTTP cache; a reload revalidates.
  //
  // When storeTwice is false, fetch from the net and store in the
  // application cache but not the browser cache.
  //
  // If the reponse is not "ok", it throws the reponse status as a
  // string.

  let response: Response
  if (storeTwice && useBrowserFreshness) {
    response = await fetch(request)
  }
  else if (storeTwice) {
    response = await fetch(request, {"cache": "no-cache"})
  }
  else {
    response = await fetch(request, {"cache": "no-store"})
  }

  if (!response.ok) {
    throw new Error(`${response.status}`);
  }

  // Add the file to the cache.

  // If the url has query parameters, strip them off so we only have
  // one version of the file in the cache.
  let bareUrl = stripUrlParameters(request.url)
  let bareRequest = new Request(bareUrl)
  await cache.put(bareRequest, response.clone());

  return response;
}

function sUrl(url: string) {
  // Shorten the url by removing the http://localhost:8000 part.

  const urlPrefix = "http://localhost:8000"
  if (url.startsWith(urlPrefix))
    return url.substring(urlPrefix.length)
  return url
}

async function responseForRangeRequest(
    response: Response, request: Request): Promise<Response> {
  // iOS requests video in byte ranges. Return 206 Partial Content when
  // serving a cached full-file response.
  const rangeHeader = request.headers.get("Range")
  if (!rangeHeader)
    return response

  const blob = await response.blob()
  const size = blob.size
  const match = /^bytes=(\d+)-(\d*)$/i.exec(rangeHeader)
  if (!match)
    return response

  const start = parseInt(match[1], 10)
  let end = match[2] ? parseInt(match[2], 10) : size - 1
  if (end >= size)
    end = size - 1
  if (start >= size || start > end)
    return new Response(null, { status: 416 })

  const slice = blob.slice(start, end + 1)
  const headers = new Headers()
  headers.set("Content-Range", `bytes ${start}-${end}/${size}`)
  headers.set("Accept-Ranges", "bytes")
  headers.set("Content-Length", String(slice.size))
  const contentType = response.headers.get("Content-Type")
  if (contentType)
    headers.set("Content-Type", contentType)

  return new Response(slice, {
    status: 206,
    statusText: "Partial Content",
    headers: headers,
  })
}

async function cacheMatch(cache: Cache, request: Request) {
  return await cache.match(request, {ignoreSearch: true})
}

function isImageFileType(url: string) {
  // Return true when the file is in the images folder and it is a
  // jpg or Live Photo mp4. We cache these different than html and
  // json files.
  if (!url.includes(cacheUrlPrefix))
    return false
  if (url.includes(".jpg"))
    return true
  if (url.includes("-v.mp4"))
    return true
  return false
}

function urlPathname(url: string): string {
  try {
    return new URL(url).pathname
  }
  catch {
    return url
  }
}

function isHttpCacheUrl(url: string) {
  // Rarely changing public files. Use the browser HTTP cache (max-age
  // on S3). A reload revalidates.
  const path = urlPathname(url)
  if (path.includes("/tin/") || path.includes("/icons/"))
    return true
  if (path === "/favicon.ico" || path.endsWith("/favicon.ico"))
    return true
  if (path === "/collections.webmanifest" ||
      path.endsWith("/collections.webmanifest"))
    return true
  return false
}

function isServiceWorkerUrl(url: string) {
  const path = urlPathname(url)
  return path === "/sw.js" || path.endsWith("/sw.js")
}

function isReloadRequest(request: Request) {
  return request.cache === "reload" || request.cache === "no-cache"
}

function isIndexHtmlUrl(url: string) {
  const path = urlPathname(url)
  return path === "/" || path === "/index.html"
}

function isStaleWhileRevalidateUrl(url: string) {
  // HTML, CSS, and page JS show the cached copy immediately, then
  // revalidate. sw.js is not included so a new worker can install.
  if (isServiceWorkerUrl(url) || isHttpCacheUrl(url) || isImageFileType(url))
    return false
  const path = urlPathname(url)
  return path.endsWith(".html") || path.endsWith(".css") ||
    path.endsWith(".js")
}

async function bodiesDiffer(a: Response, b: Response): Promise<boolean> {
  const [ab, bb] = await Promise.all([a.arrayBuffer(), b.arrayBuffer()])
  if (ab.byteLength !== bb.byteLength)
    return true
  const av = new Uint8Array(ab)
  const bv = new Uint8Array(bb)
  for (let i = 0; i < av.length; i++) {
    if (av[i] !== bv[i])
      return true
  }
  return false
}

async function revalidateIndexShell(cache: Cache, indexRequest: Request) {
  // Refresh CSS and index JS so a reload after new index.html does
  // not mix old shell files with the new document.
  const origin = new URL(indexRequest.url)
  const paths = ["/collections.css", "/js/index.js"]
  await Promise.all(paths.map(async (path) => {
    try {
      const url = new URL(path, origin).toString()
      await fetchRemote(cache, new Request(url), true)
    }
    catch (error) {
      logsw(`SWR shell revalidate failed ${path}: ${error}`)
    }
  }))
}

async function notifyIndexReload() {
  const scope = self as unknown as ServiceWorkerGlobalScope
  const clients = await scope.clients.matchAll({
    type: "window",
    includeUncontrolled: true,
  })
  for (const client of clients) {
    const path = urlPathname(client.url)
    if (path === "/" || path === "/index.html")
      client.postMessage({ action: "reload-index" })
  }
}

async function revalidateStale(cache: Cache, request: Request,
    cached: Response) {
  // Update the application cache in the background. Reload the index
  // when index.html bytes changed so a newly published collection
  // appears on this visit.
  try {
    const fresh = await fetchRemote(cache, request, true)
    if (!isIndexHtmlUrl(request.url))
      return
    if (!await bodiesDiffer(cached, fresh))
      return
    logsw("index.html changed, reload index clients.")
    await revalidateIndexShell(cache, request)
    await notifyIndexReload()
  }
  catch (error) {
    logsw(`SWR revalidate failed: ${error}`)
  }
}

self.addEventListener("fetch", (event: Event) => {
  // Fetch a file and return a Promise that resolves to a Response.

  const fetchEvent = (<FetchEvent>event)

  // Get the url to fetch.
  const url = fetchEvent.request.url
  const request = fetchEvent.request
  // logsw(`fetch url: ${url}`)

  // Let the browser handle API calls and other non-GET requests.
  if (request.method !== 'GET')
    return

  if (url.includes('execute-api.') && url.includes('amazonaws.com'))
    return

  // Collection json is edited in place on localhost. Let the page
  // fetch it with cache: "no-store" so a save is visible without a
  // rebuild. A 304 from no-cache would otherwise look like a failure
  // and the worker would serve the old cached json. Production still
  // caches json for offline.
  if (url.includes(".json") &&
      (url.includes("localhost") || url.includes("127.0.0.1")))
    return

  // Cache http and https only, skip unsupported chrome-extension:// and file://...
  if (!(url.startsWith("http:") || url.startsWith("https:"))) {
    logsw(`ignore: ${url}`)
    // Do the default thing.  If respondWith() is not called in the
    // handler, then the user agent automatically makes the original
    // network request as if the service worker did not exist.
    return
  }

  if (url.indexOf("//", 8) != -1) {
    logsw("Ignore urls that contain more than one //. Use one slash instead.")
    logsw(url)
    return
  }

  // Look for the file either in the cache or on the net dependent on
  // the file type.
  fetchEvent.respondWith((async () => {

    // Identify image files.
    const isImageFile = isImageFileType(url)

    const cache = await openCreateCache()
    let statusStr  = "unknown"
    // Look for an image file in the cache first then go to the
    // internet.
    if (isImageFile) {

      // Look for the file in the cache.
      const cacheReponse = await cacheMatch(cache, fetchEvent.request);
      if (cacheReponse) {
        logsw(`Image file found in cache: ${sUrl(url)}`);
        if (url.includes("-v.mp4") && request.headers.get("Range"))
          return responseForRangeRequest(cacheReponse, request)
        return cacheReponse;
      }

      // Look for the file on the internet and store it in the
      // application cache when found.
      try {
        let netRequest = request
        if (url.includes("-v.mp4") && request.headers.get("Range")) {
          netRequest = new Request(stripUrlParameters(url))
        }
        const result = await fetchRemote(cache, netRequest, false)
        logsw(`Image file found on net: ${sUrl(url)}`);
        if (url.includes("-v.mp4") && request.headers.get("Range"))
          return responseForRangeRequest(result, request)
        return result
      }
      catch (error) {
        if (error instanceof Error) {
          statusStr = `${error.message}`
        }
        logsw(`Image file not found: ${statusStr}.`)
      }
    }
    else if (isStaleWhileRevalidateUrl(url) && !isReloadRequest(request)) {
      // HTML, CSS, and page JS: show the cached file immediately,
      // then check the network. A reload skips this and goes to the
      // net.
      const cached = await cacheMatch(cache, request)
      if (cached) {
        logsw(`SWR cache: ${sUrl(url)}`)
        fetchEvent.waitUntil(revalidateStale(cache, request, cached.clone()))
        return cached
      }
      try {
        const result = await fetchRemote(cache, request, true)
        logsw(`SWR filled from net: ${sUrl(url)}`)
        return result
      }
      catch (error) {
        if (error instanceof Error) {
          statusStr = `${error.message}`
        }
        logsw(`SWR not found on net: ${statusStr}`)
      }
    }
    else {
      // Network first: sw.js, reloads, json, and HTTP-cache files
      // (tin, icons, favicon, manifest). HTTP-cache files honor the
      // page's cache mode so a fresh max-age copy skips the network.
      try {
        const useBrowserFreshness =
          isHttpCacheUrl(url) && !isReloadRequest(request)
        const result = await fetchRemote(cache, request, true,
            useBrowserFreshness)
        logsw(`Regular file found on net: ${sUrl(url)}`)
        return result
      }
      catch (error) {
        if (error instanceof Error) {
          statusStr = `${error.message}`
        }
        logsw(`Regular file not found on net: ${statusStr}`)
      }

      // Look for the file in the cache.
      const cacheReponse = await cacheMatch(cache, fetchEvent.request);
      if (cacheReponse) {
        logsw(`Regular file found in cache: ${sUrl(url)}`);
        return cacheReponse;
      }
    }

    logsw(`Not found on net or cache: ${url}`);
    let status = parseInt(statusStr)
    if (isNaN(status)) {
      logsw(`statusStr is not a number: ${statusStr}`);
      status = 404
    }

    return new Response(null, {status: status});

  })());
});
