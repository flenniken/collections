
const cacheName = 'collections-v1';
const preferCacheContent = [
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

const preferNetContent = [
  'index.html',
  'app.js',
  'collections.css',
];

self.addEventListener('install', (e) => {
  console.log('service worker install event');
  e.waitUntil((async () => {
    const cache = await caches.open(cacheName);

    console.log('cache all files');
    const contentToCache = preferNetContent.concat(preferCacheContent);
    await cache.addAll(contentToCache);
  })());
});

self.addEventListener('fetch', (e) => {
  // Get the url to fetch.
  const url = e.request.url

  console.log(`service worker fetch event for ${url}`);

  // Cache http and https only, skip unsupported chrome-extension:// and file://...
  if (!(url.startsWith('http:') || url.startsWith('https:'))) {
    console.log(`ignore: ${url}`)
    // Do the default thing.
    return
  }

  e.respondWith((async () => {
    // If the file prefers the net, try to fetch it from there.

    // Get the last conponent of the url.
    const lastComponent = url.split("/").pop()

    if (preferNetContent.includes(lastComponent)) {
      var response = await fetch(e.request);
      if (response) {
        console.log(`found on net: ${url}`);

        // Add the file to the cache.
        console.log(`add to cache: ${url}`);
        const cache = await caches.open(cacheName);
        cache.put(e.request, response.clone());
        return response;
      }
      console.log(`prefer net file not found on net: ${url}`);
    }

    // Look for the file in the cache.
    const cacheReponse = await caches.match(e.request);
    if (cacheReponse) {
      console.log(`found in cache: ${url}`);
      return cacheReponse;
    } else {
      console.log(`not found: ${url}`);
    }
    return await fetch(e.request);

  })());
});
