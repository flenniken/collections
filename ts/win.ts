// Shared code concatenated with the some of other ts files. The
// window and document objects are used here. See all.ts for shared
// code not using the window or document objects.

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
    logt("win", `Add ${topHeaderHeight} to height for the top bar.`)
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
