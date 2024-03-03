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
// const cacheContent = [
//   "/",
//   "favicon.ico",
//   "icons/icon-32.png",
//   "icons/icon-64.png",
//   "icons/icon-96.png",
//   "icons/icon-128.png",
//   "icons/icon-168.png",
//   "icons/icon-192.png",
//   "icons/icon-256.png",
//   "icons/icon-512.png",
//   "index.html",
//   "collections.css",
//   "js/index.js",
//   "images/c2-1-t.jpg",
//   "images/c1-3-t.jpg",
//   "collections.webmanifest",
//   // "missing",
// ];

self.addEventListener("install", (event: Event) => {
  log("Install event called.");

  // const extendableEvent = (<ExtendableEvent>event)
  // extendableEvent.waitUntil((async () => {
  //   const cache = await caches.open(cacheName);

  //   log("Cache all files.");

  //   // Note: if addAll fails, probably one of the files in the list is
  //   // incorrect, wrong path or name.
  //   await cache.addAll(cacheContent);
  //  })());
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

    // Look for the file in the cache.
    const cacheReponse = await caches.match(fetchEvent.request);
    if (cacheReponse) {
      log(`Found in cache: ${url}`);
      return cacheReponse;
    }

    // Look for the file on the net.
    var response = await fetch(fetchEvent.request);
    if (response) {
      log(`Found on net: ${url}`);

      // Add the file to the cache.
      const cache = await caches.open(cacheName);
      cache.put(fetchEvent.request, response.clone());

      return response;
    }
    // We're probably offline.
    log(`Not found: ${url}`);

    return await fetch(fetchEvent.request);

  })());
});
