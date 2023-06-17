
const cacheName = 'collections-v1';
const contentToCache = [
  '/',
  'collections.html',
  'app.js',
  'collections.css',
  'favicon.ico',
  'logo.png',
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
  if (!(
    e.request.url.startsWith('http:') || e.request.url.startsWith('https:')
  )) {
    console.log('ignore non-http or non-https requests');
    return; 
  }

  e.respondWith((async () => {
    const r = await caches.match(e.request);
    console.log(`fetch resource: ${e.request.url}`);
    if (r) return r;
    const response = await fetch(e.request);
    const cache = await caches.open(cacheName);
    console.log(`cache new resource: ${e.request.url}`);
    cache.put(e.request, response.clone());
    return response;
  })());
});
