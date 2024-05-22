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

  // The total size the of the images in the collection in bytes.
  totalSize: number
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
  // Return the collection given the collection cNum or null when not
  // found.

  for (let ix = 0; ix < indexJson.collections.length; ix++) {
    if (cNum == indexJson.collections[ix].collection)
      return indexJson.collections[ix]
  }
  throw new Error(`Invalid collection number: ${cNum}`);
}

function humanFileSize(size: number) {
  // Convert the number to a human readable file size string using MB,
  // GB, etc.
  if (size == 0)
    return 0
  const i = Math.floor(Math.log(size) / Math.log(1024));
  return +((size / Math.pow(1024, i)).toFixed(1)) * 1 + ' ' +
    ['B', 'kB', 'MB', 'GB', 'TB'][i];
}

async function enoughSpace(collection: IndexCollection) {
  // Return true when there is enough space to download the
  // collection.

  const sizeString = humanFileSize(collection.totalSize)
  log(`Collection ${collection.collection} size: ${sizeString}`)
  log(await getUsageQuotaString())

  const estimate = await navigator.storage.estimate()
  if (!estimate.usage || !estimate.quota)
    return true
  if (estimate.usage + collection.totalSize > estimate.quota)
    return false
  return true
}

async function downloadCollection(cNum: number) {
  // Download the collection's images and put them in the application
  // cache.
  if (!window.navigator.onLine) {
    window.alert(["You cannot download because there is no internet connection."])
    return
  }

  const collection = getCollection(cNum)

  if (!await enoughSpace(collection)) {
    window.alert(["There is not enough space for the collection's images."])
    return
  }

  // Open or create the cache.
  const cache = await openCreateCache()

  downloadCollectionImages(cache, cNum, collection.iCount, collection.tin)
}

function getCollectionUrls(cNum: number): string[] {
  // Return a list of the collection's urls. This includes the images
  // and the html pages -- everything needed to view the collection
  // thumbnails and image pages.

  const collection = getCollection(cNum)
  let urls: string[] = []

  // Try to download a file that doesn't exist for testing the error path.
  // urls.push("js/missing.js")

  for (let imageNum = 1; imageNum <= collection.iCount; imageNum++) {
    urls.push(`images/c${cNum}-${imageNum}-p.jpg`)
    if (imageNum == collection.tin)
      urls.push(`images/c${cNum}-${imageNum}-tin.jpg`)
    else
      urls.push(`images/c${cNum}-${imageNum}-t.jpg`)
  }
  urls.push(`pages/image-${cNum}.html`)
  urls.push(`pages/thumbnails-${cNum}.html`)

  return urls
}

async function downloadUrls(urls: string[]) {
  // Download the given urls in parallel.

  // Start fetching all images at once.
  let promises: Promise<Response>[] = []
  urls.forEach( (url) => {
    // The service worker's fetch event is called for each fetch call.
    // Caching is handled by the worker.
    promises.push(fetchOk(url))
  })

  // Wait for all images to get downloaded and cached.
  await Promise.all(promises)
}

async function downloadCollectionImages(cache: Cache, cNum: number,
    iCount: number, tin: number) {
  // Download the collection's images and cache them. When successful,
  // add a collection ready key to the cache.

  setCollectionState(cNum, "waitForImages")

  const readyRequest = new Request(`c${cNum}-ready`)
  const readyResponse = await cache.match(readyRequest);
  if (readyResponse) {
    log("The collection is completely cached.")
    return
  }

  // Time the download.
  const downloadTimer = new Timer()

  const urls = getCollectionUrls(cNum)
  downloadTimer.log(`Download collection ${cNum} which has ${urls.length} files.`)

  try {
    await downloadUrls(urls)
  } catch (error) {
    downloadTimer.log(`error: ${error}`)
    downloadTimer.log("Failed downloading all images.")
    return
  }

  // Successfully downloaded all the images.
  downloadTimer.log("Images downloaded and cached.")

  setCollectionState(cNum, "withImages")
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
    const text = `cNum: ${collection.iCount} tin: ${collection.tin}`
    const c2ReadyResponse = new Response(text)
    await cache.put(c2ReadyRequest, c2ReadyResponse)

    // const text = await readyResponse.text()
    log(`Collection ${cNum} is ready: ${text}`);
  } else if (collectionState == "withoutImages") {
    await cache.delete(c2ReadyRequest)
  }
}

async function handleLoad() {
  log("Window load event")

  const [availW, availH] = getAvailableWidthHeight()
  log(`Available width and height: (${availW}, ${availH})`)

  installBanner()

  log("Download shared collection files.")
  const sharedCollectionUrls = [
    "js/image.js",
    "js/thumbnails.js",
    "icons/index.svg",
  ]
  downloadUrls(sharedCollectionUrls)

  // Open or create the cache.
  const cache = await openCreateCache()

  // Add a banner over the collections that are not cached.
  indexJson.collections.forEach(async (collection, ix) => {
    const cNum = collection.collection
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

  // // After the user logs in call loggedIn.
  // log(`window.location.search: ${window.location.search}`)
  // const searchParams = new URLSearchParams(window.location.search)
  // const state = searchParams.get("state")
  // if (state && state == "loggedIn") {
  //   loggedIn()
  //   return
  // }

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

// You can get current log data of aws cognito actions.  Additionally
// you can save the logs to s3.  See:

// https://docs.aws.amazon.com/cognito/latest/developerguide/logging-using-cloudtrail.html


// You can set alarms when quotes you define are hit.  See:

// https://docs.aws.amazon.com/cognito/latest/developerguide/tracking-quotas-and-usage-in-cloud-watch-and-service-quotas.html


function loginOrOut() {
  log("loginOrOut")
  // Jump to the AWS cognito login UI. After logging in it will jump
  // to the index page passing state=loggedIn.

  // See documentation:
  // https://docs.aws.amazon.com/cognito/latest/developerguide/authorization-endpoint.html

  // The scope parameter determines what permissions the returned code
  // has. You set the permissions in the user pool configuration. See:
  // email+openid+phone+aws.cognito.signin.user.admin+profile

  // You set the scopes (permissions) in the console here:
  // Amazon Cognito > User pools > collections-pool > App client: CollectionsClient > Hosted UI
  // OpenID Connect scopes


  // https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-using-the-access-token.html

//   const login_url = encodeURI("\
// https://collections.auth.us-west-2.amazoncognito.com/oauth2/authorize?\
// client_id=1h1emkd4pof3vacle2albgj2qn&\
// response_type=code&\
// scope=email+openid+phone+aws.cognito.signin.user.admin+profile&\
// redirect_uri=https://collections.flenniken.net/index.html&\
// state=loggedIn\
// ")
//     window.location.assign(login_url)



  // The logout attributes are documented here:
  // https://docs.aws.amazon.com/cognito/latest/developerguide/logout-endpoint.html


}

function loggedIn() {
  // The user just logged in.
  log("loggedIn")

  // // Get the code from the url query parameters.
  // const searchParams = new URLSearchParams(window.location.search)
  // const code = searchParams.get("code")
  // if (!code) {
  //   log("Missing the code query parameter.")
  //   return
  // }

  // // Fetch the user information.
  // // https://docs.aws.amazon.com/cognito/latest/developerguide/userinfo-endpoint.html
  // const url = "https://collections.auth.us-west-2.amazoncognito.com/oauth2/userInfo"

  // const options = {
  //   "headers": {
  //     "Authorization": `Bearer ${code}`,
  //   }
  // }
  // fetch(url, options).then(function(response) {
  //   return response.json();
  // }).then(function(data) {
  //   console.log(data);
  // }).catch(function(err) {
  //   logError('Error fetching the user data.')
  //   log(err)
  // });

  // const xhr = new XMLHttpRequest();
  // xhr.open("GET", url);
  // xhr.setRequestHeader("Authorization", `Bearer ${code}`)
  // xhr.send();
  // xhr.responseType = "json";
  // xhr.onload = () => {
  //   if (xhr.readyState == 4 && xhr.status == 200) {
  //     console.log(xhr.response);
  //   } else {
  //     logError('Error fetching the user data.')
  //     log(`Error: ${xhr.status}`)
  //   }
  // };

  // Store the code in local storage.

}



function about() {
  log("about")
}

async function removeCollection(cNum: number) {
  const quota = await getUsageQuotaString()
  const message = `${quota}

Are you sure you want to delete this collection's images from the cache?`
  if (confirm(message) == true) {
    log(`remove collection ${cNum} from the app cache`)
    const urls = getCollectionUrls(cNum)
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
  window.location.assign(`pages/thumbnails-${cNum}.html`)
}

function viewCollection(cNum: number) {
  log(`view collection ${cNum}`)
  window.location.assign(`pages/image-${cNum}.html`)
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
