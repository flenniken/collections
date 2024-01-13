// Code for the thumbnails page.

window.addEventListener("load", handleLoad)

// todo: move the following functions into a shared.ts file and
// include it here and in images.ts.

function get(id: string) {
  // Get the dom element with the given id. Generate and exception
  // when not found.
  const element = document.getElementById(id)
  if (!element)
    throw new Error(`Element with "${id}" not found.`)
  return element
}

function log(message: string) {
  // Log the message to the console.
  console.log(message)
}

function getAvailableWidthHeight() {
  // Get the available screen width and height.
  const availW = document.documentElement.clientWidth
  let availH = document.documentElement.clientHeight

  // On a PWA the apple-mobile-web-app-status-bar-style setting allows
  // the toolbar area to be used, however, the area width and height
  // doesn't see this extra space. On a pwa, add the extra area.
  // todo: how do you determine the toolbar height? replace the 60.
  if (availH > availW && window.matchMedia(
      '(display-mode: standalone)').matches) {
    availH += 60
    log("Add 60 to height for the top bar.")
  }
  return [availW, availH]
}


function handleLoad() {
  const [availW, availH] = getAvailableWidthHeight()
  log(`${availW} x ${availH}`)

  // Note: the image elements are inline elements so by default they
  // get a 4px space between them just like words. You could make the
  // space go away with font size of 0 on the parent.

  // Size the thumbnails so two of them fit the width of the screen
  // with 4px space between.
  const width = (availW - 4) / 2
  log(`thumbnail width: ${width}`)

  const widthPx = `${width}px`
  var thumbnails = document.getElementsByClassName("thumbnail");
  Array.prototype.forEach.call(thumbnails, function(thumbnail, ix) {
    thumbnail.style.width = widthPx
    thumbnail.style.height = widthPx
  });
}
