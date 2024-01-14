// Code for the index page.

window.addEventListener("load", handleLoad)

function get(id: string) {
  // Get the dom element with the given id.
  return document.getElementById(id)
}

function log(message: string) {
  // Log the message to the console.
  console.log(message)
  }

// Register the Service Worker if it is supported.
if ('serviceWorker' in navigator) {
  console.log('register service worker sw.js');
  navigator.serviceWorker.register('../sw.js');
}

let runningFromIcon = false

function handleLoad() {
  log("load called")
  if (window.matchMedia('(display-mode: standalone)').matches) {
    runningFromIcon = true
    log("Running from the desktop icon.")
  }
}
