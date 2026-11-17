// Main code file for the index page. The login.ts, download.ts, and
// notify.ts files are concatenated with this file.

/// <reference path="./win.ts" />
/// <reference path="./all.ts" />
/// <reference path="./cjsonDefinition.ts" />

// The csjson is defined in the index.html file from data in the
// collections.json file.
var csjson: CJson.Csjson

// Set by an inline script at the top of index.html. Seconds from
// navigation start, which is when the service worker starts the
// index.html fetch.
declare var indexLoadStarted: number | undefined

const INDEX_LOAD_LOGS_KEY = "indexLoadLogs"
const INDEX_LOAD_LOGS_MAX = 20

interface IndexLoadMark {
  sec: number
  label: string
}

interface IndexLoadRecord {
  at: number
  total: number
  marks: IndexLoadMark[]
}

class IndexLoadLog {
  // Elapsed-time log for one index page load. 0.00s is navigation
  // start, when the service worker begins fetching index.html.
  private marks: IndexLoadMark[] = []

  constructor() {
    const started = typeof indexLoadStarted === "number"
      ? indexLoadStarted
      : performance.now() / 1000
    this.marks.push({ sec: started, label: "Index load started" })
  }

  mark(label: string) {
    this.markAt(performance.now() / 1000, label)
  }

  markAt(sec: number, label: string) {
    this.marks.push({ sec, label })
    log(`${sec.toFixed(2)}s -- ${label}`)
  }

  markScriptsCssIcons() {
    // Wall-clock time of the last script, stylesheet, icon, or
    // webmanifest response. These are the service worker 304 checks
    // that run before the window load event.
    const sec = chromeResourcesEndSec()
    if (sec == null)
      return
    this.markAt(sec, "Scripts, CSS, icons")
  }

  finish() {
    this.mark("Load finished")
    this.marks.sort((a, b) => a.sec - b.sec)
    storeIndexLoadRecord({
      at: Date.now(),
      total: this.marks[this.marks.length - 1].sec,
      marks: this.marks,
    })
  }
}

const indexLoadLog = new IndexLoadLog()

function isChromeResource(url: string): boolean {
  // Page chrome revalidated by the service worker: JS, CSS, icons,
  // favicon, and the webmanifest. Index thumbs under /tin/ are not
  // included; they show up in the window load event instead.
  let path: string
  try {
    path = new URL(url).pathname
  } catch {
    return false
  }
  if (path.startsWith("/icons/") || path === "/favicon.ico")
    return true
  return path.endsWith(".js") || path.endsWith(".css") ||
    path.endsWith(".svg") || path.endsWith(".webmanifest")
}

function chromeResourcesEndSec(): number | null {
  let end = 0
  const resources = performance.getEntriesByType("resource")
  for (let i = 0; i < resources.length; i++) {
    const entry = resources[i] as PerformanceResourceTiming
    if (isChromeResource(entry.name) && entry.responseEnd > end)
      end = entry.responseEnd
  }
  if (end <= 0)
    return null
  return end / 1000
}

function storeIndexLoadRecord(record: IndexLoadRecord) {
  // Keep the latest index load logs on this device.
  let list: IndexLoadRecord[] = []
  try {
    const raw = localStorage.getItem(INDEX_LOAD_LOGS_KEY)
    if (raw)
      list = JSON.parse(raw) as IndexLoadRecord[]
  } catch {
  }
  if (!Array.isArray(list))
    list = []
  list.unshift(record)
  try {
    localStorage.setItem(INDEX_LOAD_LOGS_KEY,
      JSON.stringify(list.slice(0, INDEX_LOAD_LOGS_MAX)))
  } catch {
  }
}

function formatLoadWhen(ms: number): string {
  // Return "11-16-2026 4:18:19 pm".
  const d = new Date(ms)
  const month = (d.getMonth() + 1).toString().padStart(2, "0")
  const day = d.getDate().toString().padStart(2, "0")
  const year = d.getFullYear()
  let hour = d.getHours()
  const minute = d.getMinutes().toString().padStart(2, "0")
  const second = d.getSeconds().toString().padStart(2, "0")
  const ampm = hour >= 12 ? "pm" : "am"
  hour = hour % 12
  if (hour == 0)
    hour = 12
  return `${month}-${day}-${year} ${hour}:${minute}:${second} ${ampm}`
}

function formatIndexLoadLogs(): string {
  let list: IndexLoadRecord[] = []
  try {
    const raw = localStorage.getItem(INDEX_LOAD_LOGS_KEY)
    if (raw)
      list = JSON.parse(raw) as IndexLoadRecord[]
  } catch {
  }
  if (!Array.isArray(list) || list.length == 0)
    return "No index load times yet."
  return list.map((record) => {
    const lines = record.marks.map((mark) =>
      `  ${mark.sec.toFixed(2)}s -- ${mark.label}`)
    return `${record.total.toFixed(2)}s load ${formatLoadWhen(record.at)}\n${lines.join("\n")}`
  }).join("\n")
}

function showLoadTimes() {
  // Show or hide the stored index load logs in the about box.
  const el = get("load-times")
  if (el.classList.contains("visible")) {
    el.classList.remove("visible")
    return
  }
  el.textContent = formatIndexLoadLogs()
  el.classList.add("visible")
}

// Whether the app was started by clicking a desktop icon or not.
let runningFromIcon = false

window.addEventListener("load", handleLoad)
window.addEventListener("resize", handleResize)
window.addEventListener("scroll", () => {
  // Save the page scroll position so we can maintain it when coming
  // back from the thumbnails or images pages.
  const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
  localStorage.setItem("indexScrollPosition", scrollTop.toString());
})

function registerServerWorker() {
  // Register the Service Worker if it is supported.

  if (!("serviceWorker" in navigator)) {
    logError("Service worker is not supported by this browser.")
    return
  }

  log("Register the service worker javascript file sw.js.");
  navigator.serviceWorker.register("sw.js");

  // Log when the service worker is ready.
  navigator.serviceWorker.ready.then((registration) => {
    log("Service worker ready.");
    publishImageAuth()
  });
}

registerServerWorker()

function toNearestMB(bytes: number): number {
  // Convert the number to the nearest MB.
  const MB = 1024 * 1024;
  return Math.round(bytes / MB);
}

function formatStorageSize(bytes: number): string {
  // Format bytes as MB, or GB when the value is a gigabyte or more.
  const GB = 1024 * 1024 * 1024
  const MB = 1024 * 1024
  if (bytes >= GB)
    return `${(bytes / GB).toFixed(1)} GB`
  return `${Math.round(bytes / MB).toLocaleString()} MB`
}

function formatUsedPercent(used: number, quota: number): string {
  // Avoid "0%" when something is stored but it is a tiny slice of the
  // browser's origin quota, which is often hundreds of gigabytes.
  if (quota <= 0)
    return "0%"
  const pct = (used / quota) * 100
  if (used > 0 && pct < 1)
    return "<1%"
  return `${pct.toFixed(0)}%`
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
  parent.dataset.cached = collectionState == "withImages" ? "1" : ""

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
    const indexCollection = getIndexCollection(cNum)
    const count = indexCollection.iCount
    const text = `cNum: ${count}`
    const c2ReadyResponse = new Response(text)
    await cache.put(c2ReadyRequest, c2ReadyResponse)

    // const text = await readyResponse.text()
    // log(`Collection ${cNum} is ready. ${count} images.`);
  } else if (collectionState == "withoutImages") {
    await cache.delete(c2ReadyRequest)
  }
}

async function setIndexCollectionStates() {
  // Show download or view controls for each collection from the cache.
  const cache = await openCreateCache()

  if (!csjson.indexCollections) {
    logError(`Missing csjson.indexCollections!`)
    return
  }

  await Promise.all(csjson.indexCollections.map(async (indexCollection) => {
    const cNum = indexCollection.cNum
    const readyResponse = await cache.match(new Request(`c${cNum}-ready`))
    if (readyResponse)
      await setCollectionState(cNum, "withImages")
    else
      await setCollectionState(cNum, "withoutImages")
  }))
}

function showHideAdminUI(pageId: string) {
  // Show the admin icons on the index page when an admin is logged
  // in.
  const parent = get(pageId)

  // todo: share show hide admin content  with the image page.
  // Show or hide the admin content.
  document.querySelectorAll('.admin').forEach(el => {
    if (isAdmin()) {
      el.classList.add('visible');
    } else {
      el.classList.remove('visible');
    }
  });
}

async function refreshIndexFieldsFromJson() {
  // Pull title, posted date, and index description from the featured
  // collection json files so a reload matches in-place edits without
  // g all. Compact rows are not edited on the index.
  const featured = csjson.indexCollections.slice(0, 10)
  await Promise.all(featured.map(async (c) => {
    const cinfo = await fetchCollectionJson(c.cNum)
    if (!cinfo)
      return
    if (typeof cinfo.title === "string")
      c.title = cinfo.title
    if (typeof cinfo.posted === "string")
      c.posted = cinfo.posted
    if (typeof cinfo.indexDescription === "string")
      c.indexDescription = cinfo.indexDescription
    c.building = cinfo.building === true
    const card = document.getElementById(`c${c.cNum}`)
    if (!card)
      return
    const titleEl = card.querySelector(".title")
    if (titleEl)
      titleEl.textContent = c.title
    const img = card.querySelector(".thumbnail, .line-thumb") as HTMLImageElement | null
    if (img)
      img.alt = c.title
    const postedEl = card.querySelector(".posted")
    if (postedEl)
      postedEl.textContent = c.posted
    const descEl = card.querySelector(".description")
    if (descEl)
      descEl.textContent = c.indexDescription
    syncIndexBuildingMark(card, c)
  }))
}

function setupIndexDescriptionEditing() {
  // Let a localhost admin tap title, posted date, and descriptions
  // in place.
  if (!isAdmin() || !isLocalhost())
    return

  csjson.indexCollections.forEach((c) => {
    const card = document.getElementById(`c${c.cNum}`)
    if (!card || card.classList.contains("compact"))
      return

    const titleEl = card.querySelector(".title") as HTMLElement | null
    if (titleEl) {
      enablePlaintextEditing(titleEl, () => c.title, async (text) => {
        try {
          await saveDescription(c.cNum, "title", text)
          c.title = text
          const img = card.querySelector(".thumbnail, .line-thumb") as HTMLImageElement | null
          if (img)
            img.alt = text
          log(`Title for collection ${c.cNum} saved.`)
        } catch (error) {
          logError("Title save failed", error)
        }
      }, { placeholder: "Title", singleLine: true })
    }

    const postedEl = card.querySelector(".posted") as HTMLElement | null
    if (postedEl) {
      enablePostedDateEditing(postedEl, () => c.posted, async (text) => {
        try {
          await saveDescription(c.cNum, "posted", text)
          c.posted = text
          log(`Posted date for collection ${c.cNum} saved.`)
        } catch (error) {
          logError("Posted date save failed", error)
        }
      })
    }

    const el = card.querySelector(".description") as HTMLElement | null
    if (!el)
      return
    enablePlaintextEditing(el, () => c.indexDescription, async (text) => {
      try {
        await saveDescription(c.cNum, "indexDescription", text)
        c.indexDescription = text
        log(`Index description for collection ${c.cNum} saved.`)
      } catch (error) {
        logError("Description save failed", error)
      }
    }, { placeholder: "Description" })
  })
  log("Admin index editing is on.")
}

function buildingMarkLabel(cNum: number, building: boolean): string {
  return building ? `Admin -- c${cNum}` : "Public"
}

function syncIndexBuildingMark(card: HTMLElement, c: CJson.IndexCollection) {
  // Show Admin -- cN when building. On localhost admin, public
  // collections show Public so the mark stays clickable.
  const mark = card.querySelector(".building-mark") as HTMLElement | null
  if (!mark)
    return
  if (isLocalAdmin()) {
    mark.textContent = buildingMarkLabel(c.cNum, c.building)
    mark.classList.toggle("public", !c.building)
    return
  }
  mark.textContent = c.building ? buildingMarkLabel(c.cNum, true) : ""
  mark.classList.remove("public")
}

function setupBuildingMarkEditing() {
  // Let a localhost admin tap Admin -- cN / Public to set building.
  if (!isLocalAdmin())
    return
  csjson.indexCollections.forEach((c) => {
    const card = document.getElementById(`c${c.cNum}`)
    if (!card || card.classList.contains("compact"))
      return
    const mark = card.querySelector(".building-mark") as HTMLElement | null
    if (!mark)
      return
    syncIndexBuildingMark(card, c)
    mark.classList.add("building-mark-toggle")
    mark.addEventListener("click", async () => {
      if (mark.dataset.saving === "1")
        return
      const next = !c.building
      mark.dataset.saving = "1"
      try {
        await saveBuilding(c.cNum, next)
        c.building = next
        syncIndexBuildingMark(card, c)
        log(next
          ? `Collection ${c.cNum} is admin only.`
          : `Collection ${c.cNum} is public.`)
      } catch (error) {
        logError("Building save failed", error)
      }
      delete mark.dataset.saving
    })
  })
}

function isIndexCollectionImage(target: EventTarget | null): boolean {
  return target instanceof Element &&
    !!(target.closest(".thumbnail") || target.closest(".line-thumb"))
}

function setupIndexImageDragGuard() {
  // Stop the iOS long-press drag and the image context/share menu on
  // collection thumbnails. Titles and descriptions stay selectable.
  document.addEventListener("contextmenu", (event) => {
    if (isIndexCollectionImage(event.target))
      event.preventDefault()
  }, true)
  document.addEventListener("dragstart", (event) => {
    if (isIndexCollectionImage(event.target))
      event.preventDefault()
  })
}

async function handleLoad() {
  indexLoadLog.markScriptsCssIcons()
  indexLoadLog.mark("Window load event")

  log(`window.location.search: "${window.location.search}"`)
  const state = getSearchParam("state")
  log(`state: "${state}"`)

  const [availW, availH] = getAvailableWidthHeight()
  log(`Available width and height: (${availW}, ${availH})`)

  installBanner()
  publishImageAuth()

  // Show the admin icons when an admin is logged in.
  showHideAdminUI("index")
  if (isLocalhost()) {
    await refreshIndexFieldsFromJson()
    indexLoadLog.mark("Refresh collection json")
  }
  setupIndexDescriptionEditing()
  setupBuildingMarkEditing()
  setupIndexImageDragGuard()

  if (!iphoneRequiresHomeScreen())
    await setIndexCollectionStates()
  updateAboutNotifications()

  // Scroll to the saved scroll position if it exists.
  const savedScrollPosition = localStorage.getItem("indexScrollPosition");
  if (savedScrollPosition) {
    log(`savedScrollPosition: ${savedScrollPosition}`)
    const scrollTop = parseInt(savedScrollPosition, 10);
    document.documentElement.scrollTop = scrollTop;
    document.body.scrollTop = scrollTop;
  }

  // Show the page now to cut down on page flashing.
  document.body.style.visibility = "visible"
  document.body.style.opacity = "1"
  indexLoadLog.finish()

  // If the user just logged in (state starts with loggedIn), set the
  // UI for a logged in user.
  if (state.startsWith("loggedIn")) {
    processCognitoLogin(state)
    return
  }

}

function isIosSafari() {
  // Return true when the running on the Safari browser and not the
  // other browsers on an iPhone.  Apple requires all browsers to use
  // webkit so they look very similar.

  const ua = window.navigator.userAgent;

  const isIOS = /iPhone|iPad|iPod/.test(ua);
  const isWebKit = /WebKit/.test(ua);
  const isNotChrome = !/CriOS/.test(ua);
  const isNotFirefox = !/FxiOS/.test(ua);
  const isNotOpera = !/OPiOS/.test(ua);
  const isNotEdge = !/EdgiOS/.test(ua);

  return isIOS && isWebKit && isNotChrome && isNotFirefox && isNotOpera && isNotEdge;
}


function installBanner() {
  // On iPhone, require the home screen icon before showing
  // collections. Safari in the browser and the installed app store
  // photos in different places.
  log(`userAgent: ${navigator.userAgent}`)
  log(`navigator.platform: ${navigator.platform}`)

  if (isRunningFromInstalledIcon()) {
    runningFromIcon = true
    log("Running from the home screen icon.")
    return
  }
  if (navigator.platform != "iPhone") {
    log("No banner.")
    return
  }

  log("We're running on an iPhone.")
  get("index").classList.add("iphone-install-required")
  if (!isIosSafari()) {
    log("Not running safari.")
    get("switch-browser").style.display = "block"
    return
  }
  log("Running on Safari, show install banner.")
  get("install-banner").style.display = "block"
}

function handleResize() {
  log("resize event")
}

function refreshPage() {
  // Reload index.html so a new collection list appears. The about
  // box uses this; the collection list is baked into the page.
  log("refresh")
  location.reload()
}

function updateAboutInstalledIcon() {
  // Show whether the app was launched from its home screen icon.
  const el = get("about-installed-icon")
  if (isRunningFromInstalledIcon()) {
    el.textContent = "😎 Running from installed icon"
  } else {
    el.textContent = "😎 Not running from installed icon"
  }
}

function about() {
  log("about")
  if (iphoneRequiresHomeScreen())
    return
  updateAboutNotifications()
  updateAboutInstalledIcon()
  get("about-box").style.display = 'block'
}

function hideAboutBox(element: Element) {
  // Hide the about box from the page.
  log("hide about box")

  // Get the number of collections.

  get("about-box").style.display = 'none'
}

async function collectionHasCachedImages(cNum: number): Promise<boolean> {
  // Return true when this collection's photos are in the app cache.
  const cache = await openCreateCache()
  const readyResponse = await cache.match(new Request(`c${cNum}-ready`))
  return readyResponse !== undefined
}

function viewThumbnails(cNum: number) {
  log(`view thumbnails for collection ${cNum}`)
  void openCachedCollectionPage(cNum,
    `images/c${cNum}/thumbnails-${cNum}.html`)
}

function viewCollection(cNum: number) {
  log(`view collection ${cNum}`)
  void openCachedCollectionPage(cNum, `images/c${cNum}/image-${cNum}.html`)
}

async function openCachedCollectionPage(cNum: number, url: string) {
  // Open a collection page only when its photos are cached. Compact
  // index rows keep their thumbnail visible after you delete images,
  // and that thumbnail would otherwise open an empty image page.
  if (iphoneRequiresHomeScreen()) {
    log("Open collections from the home screen icon to view photos.")
    return
  }
  if (!await collectionHasCachedImages(cNum)) {
    log(`Collection ${cNum} images are not cached.`)
    return
  }
  window.location.assign(url)
}

async function clearAppCache() {
  log("clearAppCache")
  const quota = await getUsageQuotaString(null)
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

async function getUsageQuotaString(cNum: number | null) {
  // Return a string telling how much disk storage the specify collection uses
  // or when null how much all the collections use.

  const estimate = await navigator.storage.estimate()
  const usage = estimate.usage ?? 0
  const quota = estimate.quota ?? 0

  if (!quota)
    return "No disk quota estimate."

  log(`storage estimate: usage ${usage}, quota ${quota}`)
  const remaining = Math.max(0, quota - usage)
  const roomFormatted = formatStorageSize(remaining)

  if (cNum == null) {
    const percent = formatUsedPercent(usage, quota)
    return `All the collections are using ${formatStorageSize(usage)} (${percent}) and you have room for ${roomFormatted} on your phone.`
  }
  else {
    const cNumUsage = getIndexCollection(cNum).totalSize
    const percent = formatUsedPercent(cNumUsage, quota)
    return `The collection is using ${formatStorageSize(cNumUsage)} (${percent}) and you have room for ${roomFormatted} on your phone.`
  }
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

    getUsageQuotaString(null).then((message) => {
      log(message)
    })
  })
}
