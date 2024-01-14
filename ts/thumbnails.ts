// Code for the thumbnails page.

// The available screen area.
let availWidth = 0
let availHeight = 0

window.addEventListener("load", handleLoad)
window.addEventListener("resize", handleResize);

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

function two(num: number) {
  // Return the number rounded to two decimal places.
  return num.toFixed(2)
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

function setAvailableArea() {
  // Size the image area to the size of the usable screen. Return
  // false when the size did not change.

  // Get the available screen width and height and store them in
  // globals, availWidth and availHeight.
  const [availW, availH] = getAvailableWidthHeight()
  if (availW == availWidth && availH == availHeight) {
    log(`Available size is the same: ${availWidth} x ${availHeight}`)
    return false
  }
  availWidth = availW
  availHeight = availH
  return true
}

function handleLoad() {
  log("load")
  const changed = setAvailableArea()
  if (changed) {
    sizeImages()
  }
}

function handleResize() {
  log("resize")
  const changed = setAvailableArea()
  if (changed) {
    sizeImages()
  }
}

function sizeImages() {
  log("sizeImages")

  // Note: the image elements are inline elements so by default they
  // get a 4px space between them just like words. You could make the
  // space go away with font size of 0 on the parent.

  // Size the thumbnails so two of them fit the short side of the
  // screen with 4px space between.
  const shortSide = availWidth < availHeight ? availWidth : availHeight

  const thumbnailW = (shortSide - 4) / 2
  log(`thumbnail width: ${thumbnailW}`)

  const thumbnailWPx = `${thumbnailW}px`
  var thumbnails = document.getElementsByClassName("thumbnail");
  Array.prototype.forEach.call(thumbnails, function(thumbnail, ix) {
    thumbnail.style.width = thumbnailWPx
    thumbnail.style.height = thumbnailWPx
  });

  // If more than 2 thumbnails fit the width of the screen, center
  // the thumbnails.
  const numRowThumbs = Math.floor((availWidth - 4) / (thumbnailW + 4))
  if (numRowThumbs > 2) {
    log(`numRowThumbs: ${numRowThumbs}`)
    const margin = (availWidth - (thumbnailW * numRowThumbs + ((numRowThumbs - 1) * 4))) / 2
    get("thumbnails").style.marginLeft = `${margin}px`
    log(`center thumbnails: margin: ${two(margin)}`)
  }
  else {
    get("thumbnails").style.marginLeft = "0"
  }
}
