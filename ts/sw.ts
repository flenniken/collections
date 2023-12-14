// sw.js
"use strict";

const cacheName = 'collections-v1';
const cacheContent = [
  '/',
  '/collections/favicon.ico',
  '/collections/icons/icon-32.png',
  '/collections/icons/icon-64.png',
  '/collections/icons/icon-96.png',
  '/collections/icons/icon-128.png',
  '/collections/icons/icon-168.png',
  '/collections/icons/icon-192.png',
  '/collections/icons/icon-256.png',
  '/collections/icons/icon-512.png',
];

self.addEventListener('install', (event: ExtendableEvent) => {
  console.log('service worker install event');
  event.waitUntil((async () => {
    const cache = await caches.open(cacheName);

    console.log('cache all files');
    await cache.addAll(cacheContent);
  })());
});

self.addEventListener('fetch', (event: FetchEvent) => {
  // Get the url to fetch.
  const url = event.request.url

  console.log(`service worker fetch event for ${url}`);

  // Cache http and https only, skip unsupported chrome-extension:// and file://...
  if (!(url.startsWith('http:') || url.startsWith('https:'))) {
    console.log(`ignore: ${url}`)
    // Do the default thing.
    return
  }

  event.respondWith((async () => {

    // Look for the file on the net.
    var response = await fetch(event.request);
    if (response) {
      console.log(`found on net: ${url}`);

      // Add the file to the cache.
      console.log(`add to cache: ${url}`);
      const cache = await caches.open(cacheName);
      cache.put(event.request, response.clone());

      return response;
    }
    console.log(`not on net: ${url}`);

    // We're probably offline.

    // Look for the file in the cache.
    const cacheReponse = await caches.match(event.request);
    if (cacheReponse) {
      console.log(`found in cache: ${url}`);
      return cacheReponse;
    } else {
      console.log(`not found: ${url}`);
    }
    return await fetch(event.request);

  })());
});
