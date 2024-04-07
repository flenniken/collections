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
window.addEventListener("resize", handleResize)

function registerServerWorker() {
  // Register the Service Worker if it is supported.

  if (!("serviceWorker" in navigator)) {
    logError("Service worker is not supported by this browser.")
    return
  }

  // Listen for messages sent from the worker and log them.
  navigator.serviceWorker.addEventListener("message", (event) => {
    log(`Worker msg received: ${event.data}`)
  })

  log("Register the service worker javascript file sw.js.");
  navigator.serviceWorker.register("sw.js");

  // Log when the service worker is ready.
  navigator.serviceWorker.ready.then((registration) => {
    log("Service worker ready.");
    // Test send a message to the service worker. The worker should
    // send the message back for logging.
    registration.active?.postMessage(
      "Message sent immediately after registration is ready.",
    );
  });
}

// todo: is this where this should go?
registerServerWorker()

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

function fetchOk(url: string) {
  // Like fetch but it throws and error when the response status is
  // not in the range 200 - 299.
  return fetch(url).then((response) => {

    if (!response.ok) {
      throw new Error(`Fetch failed with status: ${response.status}`);
    }
    return response;
  });
}

async function downloadCollection(cache: Cache, cNum: number,
    iCount: number, tin: number) {
  // Download the collection's images and cache them. When successful,
  // add a collection ready key to the cache.

  const readyRequest = new Request(`c${cNum}-ready`)
  const readyResponse = await cache.match(readyRequest);
  if (readyResponse) {
    log("The collection is completely cached.")
    return
  }

  // Time the download.
  const downloadTimer = new Timer()

  // Download and cache the given collection images.
  downloadTimer.log(`Download collection ${cNum}.`)

  const imagesFolder = "images"

  // Create a list of the collection's image urls.
  let urls: string[] = []
  for (let imageNum = 1; imageNum <= iCount; imageNum++) {
    urls.push(`${imagesFolder}/c${cNum}-${imageNum}-p.jpg`)
    if (imageNum == tin)
      urls.push(`${imagesFolder}/c${cNum}-${imageNum}-tin.jpg`)
    else
      urls.push(`${imagesFolder}/c${cNum}-${imageNum}-t.jpg`)
  }
  downloadTimer.log(`Collection ${cNum} has ${iCount} images and ${urls.length} files.`)

  // Start fetching all images at once.
  let promises: Promise<Response>[] = []
  urls.forEach( (url) => {
    // The service worker's fetch event is called for each fetch call.
    // Caching is handled by the worker.
    promises.push(fetchOk(url))
  })

  // Wait for all images to get downloaded and cached.
  let values
  try {
    await Promise.all(promises)
  } catch (error) {
    downloadTimer.log(`error: ${error}`)
    downloadTimer.log("Failed downloading all images.")
    return
  }

  // Successfully downloaded all the images.  Add a ready element to
  // the cache that tells the collection is cached.
  downloadTimer.log("Add ready marker.")
  downloadTimer.log("Images downloaded and cached.")
  const c2ReadyRequest = new Request(`c${cNum}-ready`)
  const c2ReadyResponse = new Response(`cNum: ${iCount} tin: ${tin}`)
  await cache.put(c2ReadyRequest, c2ReadyResponse);

  // Remove needs banner.
  get(`n${cNum}`).style.display = "none"

  // Enable the link to the thumbnails page.
  get(`l${cNum}`).style.pointerEvents = "auto"
}

async function openCreateCache(): Promise<Cache> {
  // Open or create the application cache and return it. When the
  // application cache is not supported or cannot be open or created
  // generate an exception.
  if (!('caches' in window))
    throw new Error("The application cache is not supported by this browser.")
  let cache: Cache
  cache = await caches.open(appCacheName)
  if (!cache)
    throw new Error("Unable to open the application cache.")
  return cache
}

async function handleLoad() {
  log("load called")

  const [availW, availH] = getAvailableWidthHeight()
  log(`width, height = (${availW}, ${availH})`)

  installBanner()

  // Open or create the cache.
  const cache = await openCreateCache()

  // Mark the collections that are not cached.
  indexJson.collections.forEach(async (collection, ix) => {
    const cNum = collection.collection
    const readyRequest = new Request(`c${cNum}-ready`)
    const readyResponse = await cache.match(readyRequest);
    if (readyResponse) {
      // The collection is completely cached.
      const text = await readyResponse.text()
      log(`Collection ${cNum} is ready: ${text}`);

      // Enable the link to the thumbnails page.
      get(`l${cNum}`).style.pointerEvents = "auto"

    } else {
      log(`Collection ${cNum} is not cached yet.`);

      // Show the needs banner on the collection.
      get(`n${cNum}`).style.display = "block"

      // Download the collection when its index image is touched or
      // clicked.
      get(`p${cNum}`).addEventListener("pointerdown", (event) => {
        downloadCollection(cache, cNum, collection.iCount, collection.tin)
      })
    }
  })
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

function handleResize() {
  log("resize event")
}

function refreshPage() {
  log("refresh")
  location.reload()
}

function removeCollection(cNum: number) {
  const message = "Are you sure you want to this collection's images from the cache?"
  if (confirm(message) == true) {
    log(`remove collection ${cNum} from the app cache`)
  } else {
    log("don't remove anything")
  }
}

function viewThumbnails(cNum: number) {
  log(`view thumbnails for collection ${cNum}`)
  window.location.assign(`pages/thumbnails-${cNum}.html`)
}

function viewCollection(cNum: number) {
  log(`view collection ${cNum}`)
  window.location.assign(`pages/image-${cNum}.html`)
}

function clearAppCache() {
  log("clearAppCache")
  const message = "Are you sure you want to delete all the collections images from the cache?"
  if (confirm(message) == true) {
    deleteCache()
  }
}

async function deleteCache() {
  // Delete the application cache.
  log("deleted")
  await caches.delete(appCacheName)
  refreshPage()
}
