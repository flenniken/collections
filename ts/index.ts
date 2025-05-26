// Main code file for the index page. The login.ts and download.ts
// files are concatenated with this file.

/// <reference path="./win.ts" />
/// <reference path="./all.ts" />
/// <reference path="./cjsonDefinition.ts" />

// The csjson is defined in the index.html file from data in the
// collections.json file.
var csjson: CJson.Csjson

// Whether the app was started by clicking a desktop icon or not.
let runningFromIcon = false

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

registerServerWorker()

function humanFileSize(size: number) {
  // Convert the number to a human readable file size string using MB,
  // GB, etc.
  if (size == 0)
    return 0
  const i = Math.floor(Math.log(size) / Math.log(1024));
  return +((size / Math.pow(1024, i)).toFixed(1)) * 1 + ' ' +
    ['B', 'kB', 'MB', 'GB', 'TB'][i];
}

async function setCollectionState(cNum: number, collectionState: string) {
  // Show or hide the UI elements that show the whether the collection is
  // ready to view.

  let withImages: string
  let withoutImages: string
  let waitForImages: string
  if (collectionState == "withImages") {
    withImages = "block"
    withoutImages = "none"
    waitForImages = "none"
  } else if (collectionState == "withoutImages") {
    withImages = "none"
    withoutImages = "block"
    waitForImages = "none"
  }
  else if (collectionState == "waitForImages") {
    withImages = "none"
    withoutImages = "none"
    waitForImages = "block"
  }
  else {
    throw new Error(`Invalid collection state: ${collectionState}`);
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

  // Show or hide the elements with class "waitForImages".
  forClasses(parent, "waitForImages", (element) => {
    element.style.display = waitForImages
  })

  // Add or remove the ready element to the cache that tells whether
  // the collection is cached or not.
  const cache = await openCreateCache()
  const c2ReadyRequest = new Request(`c${cNum}-ready`)
  if (collectionState == "withImages") {
    const collection = getCollection(cNum)
    const text = `cNum: ${collection.iCount}`
    const c2ReadyResponse = new Response(text)
    await cache.put(c2ReadyRequest, c2ReadyResponse)

    // const text = await readyResponse.text()
    log(`Collection ${cNum} is ready: ${text}`);
  } else if (collectionState == "withoutImages") {
    await cache.delete(c2ReadyRequest)
  }
}

function showHideAdminUI(pageId: string) {
  // Show the admin icons on the index page when an admin is logged
  // in.
  const parent = get(pageId)

  // todo: share this code.
  // Show or hide the admin content.
  document.querySelectorAll('.admin').forEach(el => {
    if (isAdmin()) {
      el.classList.add('visible');
    } else {
      el.classList.remove('visible');
    }
  });
}

async function handleLoad() {
  log("Window load event")

  log(`window.location.search: "${window.location.search}"`)
  const state = getSearchParam("state")
  log(`state: "${state}"`)

  const [availW, availH] = getAvailableWidthHeight()
  log(`Available width and height: (${availW}, ${availH})`)

  installBanner()

  // Show the admin icons when an admin is logged in.
  showHideAdminUI("index")

  log("Download shared collection files.")
  const sharedCollectionUrls = [
    "js/image.js",
    "js/thumbnails.js",
    "icons/index.svg",
  ]
  downloadUrls(sharedCollectionUrls)

  // Open or create the cache.
  const cache = await openCreateCache()

  if (!csjson.indexCollections) {
    logError(`Missing csjson.indexCollections!`)
    return
  }

  // Add a banner over the collections that are not cached.
  csjson.indexCollections.forEach(async (indexCollections: CJson.IndexCollection) => {
    const cNum = indexCollections.cNum
    const readyRequest = new Request(`c${cNum}-ready`)
    const readyResponse = await cache.match(readyRequest);
    if (readyResponse) {
      // The collection is completely cached.
      setCollectionState(cNum, "withImages")
    } else {
      log(`Collection ${cNum} is not cached yet.`);
      setCollectionState(cNum, "withoutImages")
    }
  })

  // If the user just logged in (state starts with loggedIn), set the
  // UI for a logged in user.
  if (state.startsWith("loggedIn")) {
    processCognitoLogin(state)
    return
  }
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

function about() {
  log("about")
  get("about-box").style.display = 'block'
}

function hideAboutBox(element: Element) {
  // Hide the about box from the page.
  log("hide about box")

  // Get the number of collections.

  get("about-box").style.display = 'none'
}

async function removeCollection(cNum: number) {
  const quota = await getUsageQuotaString()
  const message = `${quota}

Are you sure you want to delete this collection's images from the cache?`
  if (confirm(message) == true) {
    const indexCollection = getCollection(cNum)
    if (indexCollection.iNumList == null) {
      logError("missing iNumList")
      return
    }
    log(`remove collection ${cNum} from the app cache`)
    const urls = getCollectionUrls(cNum, indexCollection.iNumList)
    const cache = await openCreateCache()

    setCollectionState(cNum, "withoutImages")

    urls.forEach( (url) => {
      cache.delete(url).then((response) => {
        log(`removed ${url}`)
      });
    })

  } else {
    log("Nothing removed")
  }
}

function viewThumbnails(cNum: number) {
  log(`view thumbnails for collection ${cNum}`)
  window.location.assign(`images/c${cNum}/thumbnails-${cNum}.html`)
}

function viewCollection(cNum: number) {
  log(`view collection ${cNum}`)
  window.location.assign(`images/c${cNum}/image-${cNum}.html`)
}

async function clearAppCache() {
  log("clearAppCache")
  const quota = await getUsageQuotaString()
  const message = `${quota}

Are you sure you want to delete all the photos and files from the cache?`
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

async function getUsageQuotaString() {
  // Return a string telling how much disk storage the collection app uses.

  const estimate = await navigator.storage.estimate()

  if (!estimate.usage || !estimate.quota)
    return "No disk quota estimate."

  const percent = ((estimate.usage / estimate.quota) * 100).toFixed(0)
  const usage = humanFileSize(estimate.usage)
  const quota = humanFileSize(estimate.quota)
  return `Disk quota used: ${percent}% (${usage}), quota: ${quota}`
}

async function logAppCache() {
  // Log the contents of the application cache.
  log("Application Cache")

  const cache = await openCreateCache()

  let imageCount = 0
  cache.keys().then((requests) => {

    let urls: string[] = []
    requests.forEach((request, index, array) => {
      urls.push(request.url)
    })
    // Sort the keys (urls).  The normal order is insertion order.
    urls.sort()

    urls.forEach((url) => {
      log(`key: ${url}`)
    })
    log(`The cache contains ${urls.length} items.`)

    getUsageQuotaString().then((message) => {
      log(message)
    })
  })
}
