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

  // The number of the thumbnail image shared between the index and
  // thumbnails pages.
  tin: number

  // The total size the of the images in the collection in bytes.
  totalSize: number
}

interface IndexJson {
  // The index.json typescript definition.
  siteTitle: string
  collections: IndexCollection[]
}


interface UserInfo {
  // The typescript definition of user login information.
  givenName: string
  familyName: string
  email: string
  userId: string
  admin: boolean
  token: string
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
  // Return the collection given the collection cNum.  Throw an
  // exception when not found.

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

  // After the user logs in call loggedIn.
  log(`window.location.search: ${window.location.search}`)
  const searchParams = new URLSearchParams(window.location.search)
  const state = searchParams.get("state")
  // The state is loggedInTest when login-flow is used so we don't
  // call loggedIn and use up the code.
  if (state && state == "loggedIn") {
    loggedIn()
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

function loginOrOut() {
  // Login or logout the user.
  log("loginOrOut")

  // If logged in, show the user name and logout button, else login.
  if (hasLoggedIn()) {
    showUserInformation()
  }
  else {
    logIn()
  }
}

function logIn() {
  // Log in the user using the AWS cognito login UI.  After the user
  // logs in it will jump to the index page URL passing
  // state=loggedIn and loggedIn will be called.

  log("login")

  // todo: use template to add the info from the docker cognito-config.jsonfile.
  // login-flow -l shows this url
  const loginUrl = "https://pool42613626.auth.us-west-2.amazoncognito.com/oauth2/authorize?client_id=59nnrgfelhidaqhdkrdcnocait&state=loggedIn&response_type=code&scope=openid%20profile&redirect_uri=https://collections.flenniken.net/index.html"
  log(loginUrl)

  // Login by jumping to the AWS congnito UI.
  window.location.assign(loginUrl)
}

async function loggedIn() {
  // The user just logged in. Get the user information and store it in
  // local storage.

  log("loggedIn")

  // Get the code from the url query parameters.
  const searchParams = new URLSearchParams(window.location.search)
  const code = searchParams.get("code")
  if (!code) {
    log("Missing the code query parameter.")
    return null
  }
  log(`code: ${code}`)

  // Get the user information and store it in local storage.
  const userInfo = await getUserInfo(code)
  if (userInfo)
    storeUserInfo(userInfo)
}

async function getUserInfo(code: string): Promise<UserInfo | null> {
  // Get the user details from AWS congnito. The code comes from
  // cognito login UI.

  log("getUserInfo")

  // Fetch the user information.
  // https://docs.aws.amazon.com/cognito/latest/developerguide/userinfo-endpoint.html
  // todo: use template to fill this in.
  const domain = "https://pool42613626.auth.us-west-2.amazoncognito.com"
  const url = `${domain}/oauth2/token`

  // why is there a redirect parameter in this post?
  // todo: use template to fill in this
  const bodyText = `grant_type=authorization_code&client_id=59nnrgfelhidaqhdkrdcnocait&redirect_uri=https://collections.flenniken.net/index.html&code=${code}`

  let response
  const headers = new Headers();
  headers.append("Content-Type", "application/x-www-form-urlencoded");
  try {
    response = await fetch(url, {
      "method": "POST",
      "body": bodyText,
      "headers": headers,
    })
    if (!response.ok) {
      // You can only use the code once, so this error happens when
      // you reload a page with state=loggedIn.
      log(`Fetching user info failed. Code already used? status: ${response.status}`)
      return null
    }
  }
  catch (error) {
    log(`Fetch user info error: ${error}`)
    return null
  }

  const data = await response.json()
  log(`token keys: ${Object.keys(data)}`)
  const access_token = data["access_token"]

  // Get the user info from from cognito using the access token.
  const userInfoUrl = `${domain}/oauth2/userInfo`
  const userInfoheaders = new Headers()
  userInfoheaders.append("Content-Type", "application/json")
  userInfoheaders.append("Authorization", `Bearer ${access_token}`)
  const userInfoResponse = await fetch(userInfoUrl, {"headers": userInfoheaders})
  const info = await userInfoResponse.json()
  log(`info keys: ${Object.keys(info)}`)
  return {
    givenName: info["given_name"],
    familyName: info["family_name"],
    email: info["email"],
    userId: info["username"],
    admin: info["custom:admin"],
    token: "",
  }
}

// The user information keys stored in local storage when the user is
// logged in.
const userInfoKeys: string[] = [
  "givenName", "familyName", "email", "userId", "admin"
]

function storeUserInfo(userInfo: UserInfo) {
  // Store the user information in local storage.

  userInfoKeys.forEach((key, ix) => {
    const value = `${userInfoKeys[ix]}`
    log(`${key}: ${value}`)
    localStorage.setItem(key, value)
  })
  console.assert(localStorage.length == userInfoKeys.length)
}

function removeUserInfo() {
  // Remove the user information in local storage.
  userInfoKeys.forEach((key, ix) => {
    localStorage.removeItem(key)
  })
  console.assert(localStorage.length == 0)
}

function hasLoggedIn(): boolean {
  // Return true when the user has logged in. Determine this by
  // looking for a user key in local storage.
  console.assert(userInfoKeys.length > 0, "no userInfoKeys")
  const userId = localStorage.getItem(userInfoKeys[0])
  if (userId == null)
    return false
  else
    return true
}

function showUserInformation() {
  // Show the user name and a logout button on the page.
  console.assert(userInfoKeys.includes("givenName"))
  console.assert(userInfoKeys.includes("familyName"))
  console.assert(userInfoKeys.includes("admin"))

  const givenName = localStorage.getItem("givenName")
  const familyName = localStorage.getItem("familyName")
  const admin = localStorage.getItem("admin")

  if (givenName == null) {
    log("The user is not logged in.")
  }
  else {
    log(`The logged in user's given name is ${givenName}`)
    log(`The logged in user's family name is ${familyName}`)
    if (admin == "true")
      log(`The logged in user is an admin.`)
    else
      log(`The logged in user is not an admin.`)
  }
}

function hideUserDetails() {
  // Hide the user name and logout button.
  log("hideUserDetails")
  log("not implemented")
}

function logout() {
  // Logout the user. Remove the user details from local storage.
  removeUserInfo()
  hideUserDetails()
}

function about() {
  log("about")
  log("not implemented")
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
