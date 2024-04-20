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

function getCollection(cNum: number): IndexCollection {
  // Return the cNum collection or null when not found.

  for (let ix = 0; ix < indexJson.collections.length; ix++) {
    if (cNum == indexJson.collections[ix].collection)
      return indexJson.collections[ix]
  }
  throw new Error(`Invalid collection number: ${cNum}`);
}

async function downloadCollection(cNum: number) {
  // Download the collection's images and put them in the application
  // cache.
  log(`Download collection ${cNum}.`)

  const collection = getCollection(cNum)

  // Open or create the cache.
  const cache = await openCreateCache()

  downloadCollectionImages(cache, cNum, collection.iCount, collection.tin)
}

function getCollectionImageUrls(cNum: number): string[] {
  // Return a list of the collection's image urls.

  const imagesFolder = "images"
  const collection = getCollection(cNum)

  let urls: string[] = []
  for (let imageNum = 1; imageNum <= collection.iCount; imageNum++) {
    urls.push(`${imagesFolder}/c${cNum}-${imageNum}-p.jpg`)
    if (imageNum == collection.tin)
      urls.push(`${imagesFolder}/c${cNum}-${imageNum}-tin.jpg`)
    else
      urls.push(`${imagesFolder}/c${cNum}-${imageNum}-t.jpg`)
  }
  return urls
}

async function downloadCollectionImages(cache: Cache, cNum: number,
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

  const urls = getCollectionImageUrls(cNum)
  downloadTimer.log(`Collection ${cNum} has ${urls.length} files.`)

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

  // Successfully downloaded all the images.
  downloadTimer.log("Images downloaded and cached.")

  setCollectionState(cNum, true)
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

type ForClassesCallback = (element: HTMLElement) => void;

function forClasses(parent: Element, className: string, callback: ForClassesCallback) {
  const elements = parent.getElementsByClassName(className);
  for (let ix = 0; ix < elements.length; ix++) {
    callback(<HTMLElement>elements[ix])
  }
}

async function setCollectionState(cNum: number, imagesCached: boolean) {
  // Show or hide the UI elements that show the whether the collection is
  // ready to view.

  let withImages: string
  let withoutImages: string
  if (imagesCached) {
    withImages = "block"
    withoutImages = "none"
  } else {
    withImages = "none"
    withoutImages = "block"
  }

  const parent = get(`c${cNum}`)

  // Show or hide the elements with class "withImages".
  forClasses(parent, "withImages", (element) => {
    element.style.display = withImages
  })

  // Show or hide the elements with class "withoutImages".
  forClasses(parent, "withoutImages", (element) => {
    element.style.display = withoutImages
  })

  // Add or remove the ready element to the cache that tells whether
  // the collection is cached or not.
  const cache = await openCreateCache()
  const c2ReadyRequest = new Request(`c${cNum}-ready`)
  if (imagesCached) {
    const collection = getCollection(cNum)
    const text = `cNum: ${collection.iCount} tin: ${collection.tin}`
    const c2ReadyResponse = new Response(text)
    await cache.put(c2ReadyRequest, c2ReadyResponse)

    // const text = await readyResponse.text()
    log(`Collection ${cNum} is ready: ${text}`);
  } else {
    await cache.delete(c2ReadyRequest)
  }
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
      setCollectionState(cNum, true)

    } else {
      log(`Collection ${cNum} is not cached yet.`);
      setCollectionState(cNum, false)
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

async function removeCollection(cNum: number) {
  const message = "Are you sure you want to delete this collection's images from the cache?"
  if (confirm(message) == true) {
    log(`remove collection ${cNum} from the app cache`)
    const urls = getCollectionImageUrls(cNum)
    const cache = await openCreateCache()

    urls.forEach( (url) => {
      cache.delete(url).then((response) => {
        log(`removed ${url}`)
      });
    })
    setCollectionState(cNum, false)

  } else {
    log("nothing removed")
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
  const message = "Are you sure you want to delete the full application cache?"
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
