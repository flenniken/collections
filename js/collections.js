// collections.js
"use strict";


// Register the Service Worker if it is supported.
if ('serviceWorker' in navigator) {
  console.log('register service worker sw.js');
  navigator.serviceWorker.register('js/sw.js');
}

const relatedApps = await navigator.getInstalledRelatedApps();

// Dump all the returned related apps into a table in the console
console.table(relatedApps);
