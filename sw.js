
const cacheName = 'collections-v1';
const contentToCache = [
  '/',
  // Don't cache these until we have code to pull new versions automatically.
  // 'index.html',
  // 'app.js',
  // 'collections.css',
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

self.addEventListener('install', (e) => {
  console.log('service worker install event');
  e.waitUntil((async () => {
    const cache = await caches.open(cacheName);
    console.log('caching files');
    await cache.addAll(contentToCache);
  })());
});

self.addEventListener('fetch', (e) => {
  console.log('service worker fetch event');

  // Cache http and https only, skip unsupported chrome-extension:// and file://...
  if (!(e.request.url.startsWith('http:') ||
        e.request.url.startsWith('https:'))) {
    console.log(`ignore: ${e.request.url}`);
    return; 
  }

  e.respondWith((async () => {
    // Look for the file in the cache.
    const r = await caches.match(e.request);
    if (r) {
      console.log(`found in cache: ${e.request.url}`);
      return r;
    }

    // Fetch the file from the net.
    const response = await fetch(e.request);

    // Add the file to the cache.
    console.log(`add to cache: ${e.request.url}`);
    const cache = await caches.open(cacheName);
    cache.put(e.request, response.clone());
    return response;
  })());
});
