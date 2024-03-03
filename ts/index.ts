// Code for the index page.

window.addEventListener("load", handleLoad)

// Register the Service Worker if it is supported.
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.addEventListener("message", (event) => {
    // Listen for messages sent from the worker and echo them here.
    log(`Worker msg received: ${event.data}`)
  })

  // Load sw from the collections folder.
  log("register service worker sw.js");
  navigator.serviceWorker.register("sw.js");

  // This is an example of sending a message to the service worker.
  navigator.serviceWorker.ready.then((registration) => {
    log("service worker ready");
    registration.active?.postMessage(
      "Message sent immediately after registration is ready.",
    );
  });
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

addEventListener("message", (event) => {
  // Listen for messages sent from the client and echo them here.
  log(`Message received: ${event.data}`)
})

// onmessage = (e) => {
//   log("Message received from main script");
//   const workerResult = "hello";
//   log("Posting message back to main script");
//   postMessage(workerResult);
// }
