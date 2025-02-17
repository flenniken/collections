// Handle downloading collections.  This file is concatenated with the
// index.ts file.

function assert(condition: any, msg?: string): asserts condition {
  if (!condition) {
    throw new Error(msg || 'Assertion failed');
  }
}

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

  // The total size the of the images in the collection in bytes.
  totalSize: number
}

interface IndexJson {
  // The index.json typescript definition.
  siteTitle: string
  totalCollections: number
  collections: IndexCollection[]
}

// https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerGlobalScope/fetch_event
// The fetch event is fired in the service worker's global scope
// when the main app thread makes a network request. This includes
// not only explicit fetch() calls from the main thread, but also
// implicit network requests to load pages and subresources (such as
// JavaScript, CSS, and images) made by the browser following page
// navigation.

function fetchOk(url: string, options: RequestInit) {
  // Like fetch but it throws and error when the response status is
  // not in the range 200 - 299.

  return fetch(url, options).then((response) => {

    if (!response.ok) {
      throw new Error(`Fetch failed with status: ${response.status}`);
    }
    return response;
  });
}

function getCollection(cNum: number): IndexCollection {
  // Return the collection given the collection cNum.  Throw an
  // exception when not found.

  for (let ix = 0; ix < indexJson.collections.length; ix++) {
    if (cNum == indexJson.collections[ix].collection)
      return indexJson.collections[ix]
  }
  throw new Error(`Invalid collection number: ${cNum}`);
}

async function enoughSpace(collection: IndexCollection) {
  // Return true when there is enough space to download the
  // collection.

  const sizeString = humanFileSize(collection.totalSize)
  log("download",`Collection ${collection.collection} size: ${sizeString}`)
  log("download",await getUsageQuotaString())

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
  if (!hasLoggedIn()) {
    window.alert(["You need to login before you can download images."])
    return
  }

  const collection = getCollection(cNum)

  if (!await enoughSpace(collection)) {
    window.alert(["There is not enough space for the collection's images."])
    return
  }

  // Open or create the cache.
  const cache = await openCreateCache()

  downloadCollectionImages(cache, cNum, collection.iCount)
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
    urls.push(`images/c${cNum}-${imageNum}-t.jpg`)
  }
  urls.push(`pages/image-${cNum}.html`)
  urls.push(`pages/thumbnails-${cNum}.html`)

  return urls
}

function getRandom8(): string {
  // Return a random string of 8 alphanumeric characters (base62).
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    result += chars[randomIndex];
  }
  return result;
}

function getUTCDateTime() {
  const now = new Date()
  const dateString = now.toISOString()
  return dateString.replace(/[TZ]/g, ' ');
}

async function downloadUrls(urls: string[]) {
  // Download the given urls in parallel.

  // Add the access token to the headers for user authentication on an
  // AWS lambda function.

  const userInfo = fetchUserInfo()
  if (!userInfo) {
    throw new Error("No user information found.")
  }
  const headers = new Headers();
  headers.set("auth", userInfo.access_token);

  // Generate an 8 character random number to identify this download.
  const today = getUTCDateTime()
  const downloadId = getRandom8()
  log("download",`Download UTC and id: ${today} ${downloadId}`)

  // Start fetching all images at once.
  let promises: Promise<Response>[] = []
  urls.forEach( (url) => {
    // The service worker's fetch event is called for each fetch call.
    // Caching is handled by the worker.

    const url2 = `${url}?id=${downloadId}&user=${userInfo.userId}`
    promises.push(fetchOk(url2, { headers: headers }))
  })

  // Wait for all images to get downloaded and cached.
  await Promise.all(promises)
}

async function downloadCollectionImages(cache: Cache, cNum: number,
    iCount: number) {
  // Download the collection's images and cache them. When successful,
  // add a collection ready key to the cache.

  setCollectionState(cNum, "waitForImages")

  const readyRequest = new Request(`c${cNum}-ready`)
  const readyResponse = await cache.match(readyRequest);
  if (readyResponse) {
    log("download","The collection is completely cached.")
    return
  }

  // Time the download.
  const downloadTimer = new Timer()

  const urls = getCollectionUrls(cNum)
  downloadTimer.log("download",`Download collection ${cNum} which has ${urls.length} files.`)

  try {
    await downloadUrls(urls)
  } catch (error) {
    downloadTimer.log("download",`error: ${error}`)
    downloadTimer.log("download","Failed downloading all images.")

    // It better to leave the spinning icon then quickly going back to
    // the no image state. We don't want them to click download over
    // and over. There is no visible error message. The spinning icon
    // conveys the picture that something is wrong.
    return
  }

  // Successfully downloaded all the images.
  downloadTimer.log("download","Images downloaded and cached.")

  setCollectionState(cNum, "withImages")
}

async function openCreateCache(): Promise<Cache> {
  // Open or create the application cache and return it. When the
  // application cache is not supported or cannot be opened or created
  // generate an exception.

  if (!('caches' in window))
    throw new Error("The application cache is not supported by this browser.")
  let cache: Cache
  cache = await caches.open(appCacheName)
  if (!cache)
    throw new Error("Unable to open the application cache.")
  return cache
}
