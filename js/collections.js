// collections.js
"use strict";


// Register the Service Worker if it is supported.
if ('serviceWorker' in navigator) {
  console.log('register service worker sw.js');
  navigator.serviceWorker.register('js/sw.js');
}

const availW = document.documentElement.clientWidth
let availH = document.documentElement.clientHeight

if (availH > availW && window.matchMedia(
    '(display-mode: standalone)').matches) {
  console.log("running from pwa icon")
} else {
  console.log("running from the browser directly")
}
