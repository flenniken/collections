// Handle downloading collections.  This file is concatenated with the
// index.ts file.

function assert(condition: any, msg?: string): asserts condition {
  if (!condition) {
    throw new Error(msg || 'Assertion failed');
  }
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

function getIndexCollection(cNum: number): CJson.IndexCollection {
  // Return the collection given the collection cNum.  Throw an
  // exception when not found.

  for (const indexCollection of csjson.indexCollections) {
    if (indexCollection.cNum == cNum) {
      return indexCollection
    }
  }
  throw new Error(`Invalid collection number: ${cNum}`);
}

async function enoughSpace(cNum: number, totalSize: number) {
  // Return true when there is enough space to download the
  // collection.

  const sizeString = toNearestMB(totalSize)
  log(`Collection ${cNum} size: ${sizeString} MB`)
  log(await getUsageQuotaString(null))

  const estimate = await navigator.storage.estimate()
  if (!estimate.usage || !estimate.quota)
    return true
  if (estimate.usage + totalSize > estimate.quota)
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
  if (iphoneRequiresHomeScreen()) {
    window.alert(["Install Collections on your home screen, then open it from its icon to download photos."])
    return
  }

  const indexCollection = getIndexCollection(cNum)

  if (!await enoughSpace(indexCollection.cNum, indexCollection.totalSize)) {
    window.alert(["There is not enough space for the collection's images."])
    return
  }

  // Open or create the cache.
  const cache = await openCreateCache()

  downloadCollectionImages(cache, indexCollection)
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

  const userInfo = await ensureValidAccessToken()
  if (!userInfo) {
    throw new Error("No user information found.")
  }
  const headers = new Headers();
  headers.set("auth", userInfo.access_token);

  // Generate an 8 character random number to identify this download.
  const today = getUTCDateTime()
  const downloadId = getRandom8()
  log(`Download UTC and id: ${today} ${downloadId}`)

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

async function downloadCollectionImages(cache: Cache,
    collection: CJson.IndexCollection) {
  // Download the collection's images and cache them. When successful,
  // add a collection ready key to the cache.

  const cNum = collection.cNum
  setCollectionState(cNum, "waitForImages")

  const readyRequest = new Request(`c${cNum}-ready`)
  const readyResponse = await cache.match(readyRequest);
  if (readyResponse) {
    log("The collection is completely cached.")
    return
  }

  // Time the download.
  const downloadTimer = new Timer()

  const urls = getCollectionUrls(cNum, collection.iNumList,
      collection.liveINums ?? [])
  downloadTimer.log(`Download collection ${cNum} which has ${urls.length} files.`)

  try {
    await downloadUrls(urls)
  } catch (error) {
    downloadTimer.log(`error: ${error}`)
    downloadTimer.log("Failed downloading all images.")

    // It better to leave the spinning icon then quickly going back to
    // the no image state. We don't want them to click download over
    // and over. There is no visible error message. The spinning icon
    // conveys the picture that something is wrong.
    return
  }

  // Successfully downloaded all the images.
  downloadTimer.log("Images downloaded and cached.")

  setCollectionState(cNum, "withImages")
}
