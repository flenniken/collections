// Code for the index page.

window.addEventListener("load", handleLoad)

// Register the Service Worker if it is supported.
if ("serviceWorker" in navigator) {
  console.log("register service worker sw.js");
  // Load sw from the collections folder.
  navigator.serviceWorker.register("sw.js");
}

let runningFromIcon = false

function handleLoad() {
  log("load called")
  if (window.matchMedia("(display-mode: standalone)").matches) {
    runningFromIcon = true
    log("Running from the desktop icon.")
    return
  }

  // On an iPhone, when installing is allowed, we want to show a banner when the
  // user has not installed it yet.

  log(`navigator.platform: ${navigator.platform}`)
  if (navigator.platform != "iPhone") {
    return
  }

  if (!("GestureEvent" in window)) {
    log("not running safari")
    return
  }

  log("show install banner")
  get("install-banner").style.display = "block"
}
