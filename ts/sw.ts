// Service worker code.

const cacheName = 'collections-v1';
const cacheContent = [
  '/',
  'favicon.ico',
  'icons/icon-32.png',
  'icons/icon-64.png',
  'icons/icon-96.png',
  'icons/icon-128.png',
  'icons/icon-168.png',
  'icons/icon-192.png',
  'icons/icon-256.png',
  'icons/icon-512.png',
];


self.addEventListener('install', (event: Event) => {
  console.log('service worker install event');

  const extendableEvent = (<ExtendableEvent>event)
  extendableEvent.waitUntil((async () => {
    const cache = await caches.open(cacheName);

    console.log('cache all files');
    await cache.addAll(cacheContent);
  })());
});

self.addEventListener('fetch', (event: Event) => {
  const fetchEvent = (<FetchEvent>event)

  // Get the url to fetch.
  const url = fetchEvent.request.url

  console.log(`service worker fetch event for ${url}`);

  // Cache http and https only, skip unsupported chrome-extension:// and file://...
  if (!(url.startsWith('http:') || url.startsWith('https:'))) {
    console.log(`ignore: ${url}`)
    // Do the default thing.
    return
  }

  fetchEvent.respondWith((async () => {

    // Look for the file on the net.
    var response = await fetch(fetchEvent.request);
    if (response) {
      console.log(`found on net: ${url}`);

      // Add the file to the cache.
      console.log(`add to cache: ${url}`);
      const cache = await caches.open(cacheName);
      cache.put(fetchEvent.request, response.clone());

      return response;
    }
    console.log(`not on net: ${url}`);

    // We're probably offline.

    // Look for the file in the cache.
    const cacheReponse = await caches.match(fetchEvent.request);
    if (cacheReponse) {
      console.log(`found in cache: ${url}`);
      return cacheReponse;
    } else {
      console.log(`not found: ${url}`);
    }
    return await fetch(fetchEvent.request);

  })());
});
