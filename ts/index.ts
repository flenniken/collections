// Code for the index page.

interface IndexCollection {
  // The typescript definition of an index.json collection.
  collection: number
  url: string
  thumbnail: string
  title: string
  indexDescription: string
  posted: string

  // The number of images in the collection.
  iCount: number

  // The number of the thumbnail shared with the index page.
  tin: number
}

interface IndexJson {
  // The index.json typescript definition.
  siteTitle: string
  collections: IndexCollection[]
}

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

// The indexJson comes from the index.html file.
var indexJson: IndexJson

// Whether the app was started by clicking a desktop icon or not.
let runningFromIcon = false

// https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerGlobalScope/fetch_event
// The fetch event is fired in the service worker's global scope
// when the main app thread makes a network request. This includes
// not only explicit fetch() calls from the main thread, but also
// implicit network requests to load pages and subresources (such as
// JavaScript, CSS, and images) made by the browser following page
// navigation.

async function downloadCollection(cache: Cache, cNum: number,
    iCount: number, tin: number) {
  // Download the collection's images and cache them. When successful,
  // add a collection ready key to the cache.

  // Time the download.
  const downloadTimer = new Timer()

  // Download and cache the given collection images.
  downloadTimer.log(`Download collection ${cNum}.`)

  const imagesFolder = "/images"

  // Create a list of the collection's image urls.
  let urls: string[] = []
  for (let imageNum = 1; imageNum <= iCount; imageNum++) {
    urls.push(`${imagesFolder}/c${cNum}-${imageNum}-p.jpg`)
    if (imageNum == tin)
      urls.push(`${imagesFolder}/c${cNum}-${imageNum}-tin.jpg`)
    else
      urls.push(`${imagesFolder}/c${cNum}-${imageNum}-t.jpg`)
  }
  log(`The collection ${cNum} has ${iCount} images and ${urls.length} files.`)

  // Start fetching all images at once. Don't store the images in the
  // browser cache, just the service worker cache.
  let promises: Promise<Response>[] = []
  urls.forEach( (url) => {
    promises.push(fetch(url, {cache: "no-store", mode: 'cors'}))
  })

  // Wait for all images to get downloaded and cached.
  try {
    await Promise.all(promises)

    // Successfully downloaded all the images.  Add a ready element to
    // the cache that tells the collection is cached.
    log("Add ready marker.")
    downloadTimer.log("Images downloaded and cached.")
    const c2ReadyRequest = new Request(`c${cNum}-ready`)
    const c2ReadyResponse = new Response(`cNum: ${iCount} tin: ${tin}`)
    await cache?.put(c2ReadyRequest, c2ReadyResponse);

  } catch (error) {
    log(`error: ${error}`)
    downloadTimer.log("Failed downloading all images.")
  }
}

async function handleLoad() {
  log("load called")

  installBanner()

  // Style cached collections differently than uncached ones.
  // Look in the cache for c1-ready.

  let cache: Cache
  if ('caches' in window) {
    // Open or create the cache.
    cache = await caches.open("collections-v1");
    // log("Opened the collections-v1 cache")
  }

  // Enable the collections that are cached and leave the others
  // disabled.
  indexJson.collections.forEach(async (collection, ix) => {
    const cNum = collection.collection
    const key = `c${cNum}-ready`
    const readyRequest = new Request(`${key}`)
    const readyResponse = await cache?.match(readyRequest);
    if (readyResponse) {
      // The collection is completely cached.
      const text = await readyResponse.text()
      log(`Collection ${cNum} is ready: ${text}`);
      collectionReady(cNum)
    } else {
      log(`Collection ${cNum} is not cached yet.`);

      const button = get(`f${cNum}`)
      button.addEventListener("click", (event) => {
        downloadCollection(cache, cNum, collection.iCount, collection.tin)
      })
    }
  })
}

function collectionReady(cNum: number) {
  // Style the collection so it is ready to view.

  // Hide the fetch button.
  get(`f${cNum}`).style.display = "none"

  // Remove the dashed border and replace it with padding.
  get(`t${cNum}`).style.borderWidth = "0"
  get(`t${cNum}`).style.padding = "10px"

  // Enable the link to the thumbnails page.
  get(`l${cNum}`).style.pointerEvents = "auto"
}

function installBanner() {
  // Show an install banner if appropriate.

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
