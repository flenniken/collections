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
