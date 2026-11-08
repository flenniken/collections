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

// All site files use the application cache with network-first
// If-None-Match. CloudFront returns 304 when the ETag matches, so
// unchanged files send no body. Offline requests use the cache.
// The browser HTTP cache is not used. sw.js is not stored here so
// a new worker can install.

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
  (event as ExtendableEvent).waitUntil(
    (self as unknown as ServiceWorkerGlobalScope).skipWaiting())
})

self.addEventListener("activate", event => {
  logsw("Activate service worker.");
  (event as ExtendableEvent).waitUntil((async () => {
    const cache = await openCreateCache()
    await cache.delete("/sw-image-auth")
    await (self as unknown as ServiceWorkerGlobalScope).clients.claim()
  })())
})

self.addEventListener("push", (event: Event) => {
  const pushEvent = (<PushEvent>event)
  pushEvent.waitUntil((async () => {
    logsw("push event received.")
    if (!pushEvent.data) {
      logsw("Push event has no data.")
      return
    }
    const payload = pushEvent.data.json() as {title?: string, body?: string}
    logsw(`Push payload: ${JSON.stringify(payload, null, 2)}`)
    const title = payload.title ?? ""
    const body = payload.body ?? ""
    await Promise.all([
      (self as any).registration.showNotification(title, {body}),
      setPushAppBadge(),
    ])
  })())
})

function stripUrlParameters(url: string): string {
  // Return the url without any query parameters.
  const u = new URL(url)
  u.hash = ""
  u.search = ""
  return u.toString()
}

function sUrl(url: string) {
  // Shorten the url by removing the http://localhost:8000 part.
  const urlPrefix = "http://localhost:8000"
  if (url.startsWith(urlPrefix))
    return url.substring(urlPrefix.length)
  return url
}

function xCache(response: Response) {
  // CloudFront Hit/Miss, or empty when the header is absent.
  const value = response.headers.get("x-cache")
  return value ? ` ${value}` : ""
}

function urlPathname(url: string): string {
  try {
    return new URL(url).pathname
  }
  catch {
    return url
  }
}

function isServiceWorkerUrl(url: string) {
  const path = urlPathname(url)
  return path === "/sw.js" || path.endsWith("/sw.js")
}

function isGatedMediaUrl(url: string) {
  // Collection jpgs and videos require the Cognito auth header.
  const path = urlPathname(url)
  if (!path.startsWith("/images/"))
    return false
  return path.endsWith(".jpg") || path.endsWith(".mp4")
}

function cacheMatch(cache: Cache, request: Request) {
  return cache.match(request, {ignoreSearch: true})
}

async function getImageAuth(): Promise<ImageAuth | null> {
  // Read the access token the page keeps in IndexedDB. An expired
  // token is ignored so the request falls back to the file cache.
  try {
    const auth = await readImageAuth()
    if (isImageAuthValid(auth))
      return auth
  }
  catch (error) {
    logsw(`image auth: ${error}`)
  }
  return null
}

async function netRequest(request: Request, cached: Response | undefined): Promise<Request> {
  // Build a no-store GET that revalidates with If-None-Match. Gated
  // photos get the current Cognito token when the page did not send one.
  const headers = new Headers(request.headers)
  headers.delete("Range")
  if (cached) {
    const etag = cached.headers.get("ETag")
    if (etag)
      headers.set("If-None-Match", etag)
  }
  let url = request.url
  if (isGatedMediaUrl(url) && !headers.get("auth")) {
    const auth = await getImageAuth()
    if (auth) {
      headers.set("auth", auth.accessToken)
      const u = new URL(stripUrlParameters(url))
      u.searchParams.set("id", getRandom8())
      u.searchParams.set("user", auth.userId)
      url = u.toString()
    }
  }
  return new Request(url, {
    method: "GET",
    headers,
    cache: "no-store",
    credentials: request.credentials,
    redirect: request.redirect,
  })
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
    return new Response(null, {status: 416})

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

function withRange(request: Request, response: Response): Promise<Response> {
  if (request.headers.get("Range"))
    return responseForRangeRequest(response, request)
  return Promise.resolve(response)
}

self.addEventListener("fetch", (event: Event) => {
  const fetchEvent = (<FetchEvent>event)
  const request = fetchEvent.request
  const url = request.url

  if (request.method !== "GET")
    return

  if (url.includes("execute-api.") && url.includes("amazonaws.com"))
    return

  if (!(url.startsWith("http:") || url.startsWith("https:"))) {
    logsw(`ignore: ${url}`)
    return
  }

  if (url.indexOf("//", 8) != -1) {
    logsw("Ignore urls that contain more than one //. Use one slash instead.")
    logsw(url)
    return
  }

  fetchEvent.respondWith((async () => {
    if (isServiceWorkerUrl(url)) {
      return fetch(request, {cache: "no-store"})
    }

    const cache = await openCreateCache()
    const cached = await cacheMatch(cache, request)

    try {
      const response = await fetch(await netRequest(request, cached))
      if (response.status === 304) {
        if (cached) {
          logsw(`304 ${sUrl(url)}${xCache(response)}`)
          return withRange(request, cached)
        }
        logsw(`304 with no cache: ${sUrl(url)}${xCache(response)}`)
        return new Response(null, {status: 404})
      }
      if (response.status === 200) {
        const bareRequest = new Request(stripUrlParameters(url))
        await cache.put(bareRequest, response.clone())
        logsw(`200 ${sUrl(url)}${xCache(response)}`)
        return withRange(request, response)
      }
      if (cached) {
        logsw(`net ${response.status}, cache ${sUrl(url)}${xCache(response)}`)
        return withRange(request, cached)
      }
      logsw(`net ${response.status}: ${sUrl(url)}${xCache(response)}`)
      return new Response(null, {status: response.status})
    }
    catch (error) {
      if (cached) {
        logsw(`offline cache ${sUrl(url)}`)
        return withRange(request, cached)
      }
      logsw(`offline miss ${sUrl(url)}: ${error}`)
      return new Response(null, {status: 503})
    }
  })())
})
