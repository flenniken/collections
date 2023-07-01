// collections.js
"use strict";

// Register the Service Worker if it is supported.
if ('serviceWorker' in navigator) {
  console.log('register service worker /js/sw.js');
  navigator.serviceWorker.register('/js/sw.js');
}
