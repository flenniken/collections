// Service worker code.

// https://web.dev/learn/pwa/service-workers:
//
// Service workers get updated when the browser detects that the
// service worker currently controlling the client and the new (from
// your server) version of the same file are byte-different.
//
// The user needs to close or navigate away from all tabs and windows
// using the current service worker and then navigate back. Only then
// will the new service worker take control.
//
// If not already running, a service worker will start whenever a
// network request in its scope is asked for, or when a triggering
// event, like periodic background sync or a push message, is
// received.

const cacheUrlPrefix = "/images/"

function logsw(message: string) {
  // Log the service worker message to the console.
  console.log("👷 " + message)
}

self.addEventListener("install", (event: Event) => {
  logsw("Install service worker.");
})

async function openCreateCache(): Promise<Cache> {
  // Open or create the application cache and return it. When the
  // application cache is not supported or cannot be open or created
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
  // activate event will fire. This doesn't mean, though, that the page
  // that registered the service worker will be managed. By default, the
  // service worker will not take control until the next time you
  // navigate to that page, either due to reloading the page or
  // re-opening the PWA.

   logsw("Activate service worker.");
})

function stripUrlParameters(url: string): string {
  // Return the url without any query parameters.
  let u = new URL(url)
  u.hash = ''
  u.search = ''
  return u.toString()
}

async function fetchRemote(cache: Cache, request: Request,
    storeTwice: boolean): Promise<Response> {
  // Fetch a file on the net and store it in one or more
  // caches. Return a promise that resolves to a response.
  //
  // When storeTwice is true, it does the normal thing, it looks in
  // the browser cache and returns that, otherwise it fetches the
  // remote file and then stores it in the browser cache and the
  // application cache.
  //
  // When storeTwice is false, it fetches the file from the net and
  // stores it in the application cache but not the browser cache.

  let options: any
  if (storeTwice) {
    options = {"cache": "default"}
  }
  else {
    options = {"cache": "no-store"}
  }

  var response = await fetch(request, options)

  if (!response.ok) {
    const message = `An error has occured: ${response.status}`;
    logsw(message)
    throw new Error(message);
  }

  // Add the file to the cache.

  // If the url has query parameters, strip them off so we only have
  // one version of the file in the cache.
  let bareUrl = stripUrlParameters(request.url)
  log(`bare url: ${bareUrl}`)
  let bareRequest = new Request(bareUrl)
  await cache.put(bareRequest, response.clone());

  return response;
}

const urlPrefix = "http://localhost:8000"
function sUrl(url: string) {
  // Shorten the url by removing the http://localhost:8000 part.

  if (url.startsWith(urlPrefix))
    return url.substring(urlPrefix.length)
  return url
}

async function cacheMatch(cache: Cache, request: Request) {
  return await cache.match(request, {ignoreSearch: true})
}

self.addEventListener("fetch", (event: Event) => {
  // Fetch a file and return a Promise that resolves to a Response.

  const fetchEvent = (<FetchEvent>event)

  // Get the url to fetch.
  const url = fetchEvent.request.url
  logsw(`fetch url: ${url}`)

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
    return
  }

  // Look for the file either in the cache or on the net dependent on
  // the file type.
  fetchEvent.respondWith((async () => {

    // Identify image files except the index page thumbnails that end
    // with tin.jpg.
    const isSpecialFile = url.startsWith(cacheUrlPrefix) && !url.endsWith("tin.jpg");

    const cache = await openCreateCache()

    // For an image file except index thumbnails, look for it in the
    // cache first, then go to in internet.
    if (isSpecialFile) {

      // Look for the file in the cache.
      const cacheReponse = await cacheMatch(cache, fetchEvent.request);
      if (cacheReponse) {
        logsw(`Special file found in cache: ${sUrl(url)}`);
        return cacheReponse;
      }

      // Look for the file on the internet and store it in the
      // application cache when found.
      try {
        const result = await fetchRemote(cache, fetchEvent.request, false)
        logsw(`Special file found on net: ${sUrl(url)}`);
        return result
      }
      catch (error) {
        logsw("Special file not found.")
      }
    }
    else {
      // The file is not in the images folder (except the index page
      // thumbnails).  Look for it in the internet first so we always
      // get the newest when connected, then look in the cache so we
      // work when offline.

      // Look for the file on the net. When found store it in the
      // browser cache and the application cache.
      try {
        const result = await fetchRemote(cache, fetchEvent.request, true)
        logsw(`Regular file found on net: ${sUrl(url)}`)
        return result
      }
      catch (error) {
        logsw("Regular file not found on net.")
      }

      // Look for the file in the cache.
      const cacheReponse = await cacheMatch(cache, fetchEvent.request);
      if (cacheReponse) {
        logsw(`Regular file found in cache: ${sUrl(url)}`);
        return cacheReponse;
      }
    }

    logsw(`Not found on net or cache: ${url}`);
    return new Response(null, {status: 404});

  })());
});
