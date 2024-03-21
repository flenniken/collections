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

// todo: I would like one copy of this.  See image-folder.json.
const cacheUrlPrefix = "/collections-images/"
// const imagesFolder = "https://flenniken.net/collections-images"

function log(message: string) {
  // Log the message to the console.
  console.log("👷 " + message)
}

self.addEventListener("install", (event: Event) => {
  log("Install service worker.");
})

self.addEventListener("activate", event => {
  // https://web.dev/learn/pwa/service-workers:
  //
  // When the service worker is ready to control its clients, the
  // activate event will fire. This doesn't mean, though, that the page
  // that registered the service worker will be managed. By default, the
  // service worker will not take control until the next time you
  // navigate to that page, either due to reloading the page or
  // re-opening the PWA.

   log("Activate service worker.");
})

async function fetchRemote(cache: Cache | undefined, request: Request): Promise<Response> {
  // Look for the file on the net. If found, add it to the
  // cache. Return a promise that resolves to a response.

  log(`Look fork: ${request.url}`);
  // var response = await fetch(request, {cache: "no-store", mode: 'cors'});
  var response = await fetch(request, {
    "headers": {"Access-Control-Allow-Origin": "https://localhost:8000"},
    "cache": "no-store",
    "mode": "cors",
  });

  if (!response.ok) {
    const message = `An error has occured: ${response.status}`;
    log(message)
    throw new Error(message);
  }

  // Add the file to the cache.
  log(`Found on net, add to cache: ${request.url}`);
  cache?.put(request, response.clone());
  return response;
}

self.addEventListener("fetch", (event: Event) => {
  // Fetch a file and return a Promise that resolves to a Response.

  const fetchEvent = (<FetchEvent>event)

  // Get the url to fetch.
  const url = fetchEvent.request.url
  // log(`fetch event url: ${url}`);

  // Cache http and https only, skip unsupported chrome-extension:// and file://...
  if (!(url.startsWith("http:") || url.startsWith("https:"))) {
    log(`ignore: ${url}`)
    // Do the default thing.  If respondWith() is not called in the
    // handler, then the user agent automatically makes the original
    // network request as if the service worker did not exist.
    return
  }

  // Look for the file either in the cache or on the net where the
  // place you look first is dependent on whether it is an image
  // file or not.
  fetchEvent.respondWith((async () => {

    // Identify image files except the index page thumbnails that end
    // with tin.jpg.
    const isSpecialFile = url.includes(cacheUrlPrefix) && !url.includes("tin.jpg");

    // Open or create the cache. It's undefined when the browser doesn't
    // support it.
    let cache
    if ('caches' in self) {
      cache = await caches.open("collections-v1");
    }

    // For an image file except index thumbnails, look for it in the
    // cache first, then go to in internet.
    if (isSpecialFile) {

      // Look for the file in the cache.
      const cacheReponse = await cache?.match(fetchEvent.request);
      if (cacheReponse) {
        log(`Found in cache: ${url}`);
        return cacheReponse;
      }

      // Look for the file on the internet.
      try {
        return await fetchRemote(cache, fetchEvent.request)
      }
      catch (error) {
        log("file not found on net")
      }
    }
    else {
      // The file is not in the images folder (except the index page
      // thumbnails).  Look for it in the internet first so we always
      // get the newest when connected, then look in the cache so we
      // work when offline.

      log(`---not image file, look on net then cache: ${isSpecialFile}`)
      log(url)
      log(cacheUrlPrefix)

      // Look for the file on the net.
      try {
        return await fetchRemote(cache, fetchEvent.request)
      }
      catch (error) {
        log("file not found on net")
      }

      // Look for the file in the cache.
      const cacheReponse = await cache?.match(fetchEvent.request);
      if (cacheReponse) {
        log(`Found in cache: ${url}`);
        return cacheReponse;
      }
    }

    log(`Not found on net or cache: ${url}`);
    return new Response(null, {status: 404});

  })());
});
