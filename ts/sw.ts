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

function log(message: string) {
  // Log the message to the console.
  console.log("👷 " + message)
}

const cacheName = "collections-v1";

self.addEventListener("install", (event: Event) => {
  log("Install event called.");
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

   log("Activate event called.");
})

self.addEventListener("fetch", (event: Event) => {
  const fetchEvent = (<FetchEvent>event)

  // Get the url to fetch.
  const url = fetchEvent.request.url

  // Cache http and https only, skip unsupported chrome-extension:// and file://...
  if (!(url.startsWith("http:") || url.startsWith("https:"))) {
    log(`ignore: ${url}`)
    // Do the default thing.
    return
  }

  fetchEvent.respondWith((async () => {

    // If the request is for a file needed by the index page, fetch it
    // from the internet so we always get the newest when
    // connected. If the file is in the images folder (except the
    // index page thumbnails), get it from the cache and don't try the
    // internet. The thumbnails shared with the index page end with
    // tix.jpg.

    const isImageFile = url.includes("images/") && !url.includes("tix.jpg");

    if (!isImageFile) {
      // Look for the file on the net.
      var response = await fetch(fetchEvent.request);
      if (response) {
        log(`Found on net: ${url}`);

        // Add the file to the cache.
        const cache = await caches.open(cacheName);
        cache.put(fetchEvent.request, response.clone());

        return response;
      }
    }

    // Look for the file in the cache.
    const cacheReponse = await caches.match(fetchEvent.request);
    if (cacheReponse) {
      log(`Found in cache: ${url}`);
      return cacheReponse;
    }

    // We're probably offline, do the default thing.
    log(`Not found: ${url}`);
    return await fetch(fetchEvent.request);

  })());
});
