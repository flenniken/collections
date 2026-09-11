// Shared code concatenated with some of other ts files. The DOM
// types for example window and document objects are used here. See
// all.ts for shared code not using the DOM.

function get(id: string) {
  // Get the dom element with the given id. Generate an exception
  // when not found.
  const element = document.getElementById(id)
  if (!element)
    throw new Error(`Element with "${id}" not found.`)
  return element
}

function cssNum(variable: string): number {
  // Return the given css number variable defined in the ":root"
  // pseudo class. It returns 100 for both of the following examples:
  // :root {
  //   --my-var: 100;
  //   --my-var2: 100px;
  // }
  return parseFloat(getComputedStyle(document.documentElement).getPropertyValue(variable));
}

// Height of the top header in portrait mode. Set from css
// --top-header-height variable in the load event.
let topHeaderHeight = 60

function getAvailableWidthHeight() {
  // Get the available screen width and height.
  const availW = document.documentElement.clientWidth
  let availH = document.documentElement.clientHeight

  // On a PWA the apple-mobile-web-app-status-bar-style setting allows
  // the toolbar area to be used, however, the area width and height
  // doesn't see this extra space. On a pwa, add the extra area.

  if (availH > availW && window.matchMedia(
      "(display-mode: standalone)").matches) {
    availH += topHeaderHeight
    log(`Add ${topHeaderHeight} to height for the top bar.`)
  }
  return [availW, availH]
}

function getSearchParam(param: string): string {
  // Return the given param from the window search params.
  const searchParams = new URLSearchParams(window.location.search)
  const value = searchParams.get(param)
  if (!value)
    return ""
  return value
}

type ForClassesCallback = (element: HTMLElement) => void;

function forClasses(parent: Element | Document,
    className: string, callback: ForClassesCallback) {
  // Call the given function for the parent's child elements with the
  // given class.
  const elements = parent.getElementsByClassName(className);
  for (let ix = 0; ix < elements.length; ix++) {
    callback(<HTMLElement>elements[ix])
  }
}

function isLocalhost(): boolean {
  // Return true when the page is served from the docker nginx server.
  const host = window.location.hostname
  return host === "localhost" || host === "127.0.0.1"
}

function isRunningFromInstalledIcon(): boolean {
  // Return true when the app is running as an installed PWA from its
  // home screen or desktop icon.
  if (window.matchMedia("(display-mode: standalone)").matches)
    return true
  const nav = window.navigator as Navigator & { standalone?: boolean }
  if (nav.standalone === true)
    return true
  return false
}

function iphoneRequiresHomeScreen(): boolean {
  // iPhone Safari in the browser stores photos separately from the
  // home screen app. Require the home screen icon before download.
  return navigator.platform == "iPhone" && !isRunningFromInstalledIcon()
}

async function saveCollection(collection: { cNum: number }) {
  // Save the collection json by calling the admin saveCollection api.
  const response = await fetch(
    "http://localhost:3001/saveCollection",
    {
      method: "POST",
      headers:
      {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(collection)
    })
  if (!response.ok)
    throw new Error(`Save failed: ${response.status}`)
  return await response.json()
}

type DescriptionField = "description" | "indexDescription" | "imageDescription"

async function saveDescription(cNum: number, field: DescriptionField,
    text: string, imageIx?: number) {
  // Merge one description into the collection json on disk.
  const payload: {
    cNum: number
    field: DescriptionField
    text: string
    imageIx?: number
  } = { cNum, field, text }
  if (field == "imageDescription") {
    if (imageIx === undefined)
      throw new Error("imageIx is required")
    payload.imageIx = imageIx
  }
  const response = await fetch(
    "http://localhost:3001/saveDescription",
    {
      method: "POST",
      headers:
      {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    })
  if (!response.ok)
    throw new Error(`Save failed: ${response.status}`)
  return await response.json()
}

function editedTextFromElement(el: HTMLElement): string {
  return el.innerText.replace(/\r\n/g, "\n")
}

function enablePlaintextEditing(el: HTMLElement, getOriginal: () => string,
    onCommit: (text: string) => Promise<void>) {
  // Let an admin tap the element and edit it in place.
  el.setAttribute("contenteditable", "plaintext-only")
  if (el.contentEditable !== "plaintext-only")
    el.contentEditable = "true"
  el.classList.add("editable")
  el.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      el.textContent = getOriginal()
      el.blur()
    }
  })
  el.addEventListener("blur", () => {
    const text = editedTextFromElement(el)
    if (text === getOriginal())
      return
    void onCommit(text)
  })
}
