// Code for the thumbnails page.

// The available screen area.
let availWidth = 0
let availHeight = 0

// The top-bar element set at dom load time.
let topBar: HTMLElement | null = null

window.addEventListener("DOMContentLoaded", handleDOMContentLoaded)
window.addEventListener("load", handleLoad)
window.addEventListener("resize", handleResize);

function setAvailableArea() {
  // Size the image area to the size of the usable screen. Return
  // false when the size did not change.

  // Get the available screen width and height and store them in
  // globals, availWidth and availHeight.
  const [availW, availH] = getAvailableWidthHeight()
  if (availW == availWidth && availH == availHeight) {
    logt("thumbnails", `Available size is the same: ${availWidth} x ${availHeight}`)
    return false
  }
  availWidth = availW
  availHeight = availH
  return true
}

function handleDOMContentLoaded() {
  logt("thumbnails", "DOMContentLoaded event")

  topBar = get("top-bar")

  const changed = setAvailableArea()
  if (changed) {
    sizeImages()
  }
}

function handleLoad() {
  logt("thumbnails", "load event")
  topHeaderHeight = cssNum("--top-header-height")
  logt("thumbnails", `topHeaderHeight: ${topHeaderHeight}`)
}

function handleResize() {
  logt("thumbnails", "resize event")

  // Skip the resize events until the area object is set.
  if (topBar === null) {
    logt("thumbnails", "Wait for DOM elements to exist and be sized.")
    return
  }

  const changed = setAvailableArea()
  if (changed) {
    sizeImages()
  }
}

function sizeImages() {
  logt("thumbnails", "sizeImages called")

  // Note: the image elements are inline elements so by default they
  // get a 4px space between them just like words. You could make the
  // space go away with font size of 0 on the parent.

  // Size the thumbnails so two of them fit the short side of the
  // screen with 4px space between.
  const shortSide = availWidth < availHeight ? availWidth : availHeight

  const thumbnailW = (shortSide - 4) / 2
  logt("thumbnails", `Thumbnail width: ${thumbnailW}`)

  const thumbnailWPx = `${thumbnailW}px`
  var thumbnails = document.getElementsByClassName("thumbnail");
  Array.prototype.forEach.call(thumbnails, function(thumbnail, ix) {
    thumbnail.style.width = thumbnailWPx
    thumbnail.style.height = thumbnailWPx
    thumbnail.style.minWidth = thumbnailWPx
    thumbnail.style.minHeight = thumbnailWPx
  });

  // If more than 2 thumbnails fit the width of the screen, center
  // the thumbnails.
  const numRowThumbs = Math.floor((availWidth - 4) / (thumbnailW + 4))
  if (numRowThumbs > 2) {
    logt("thumbnails", `numRowThumbs: ${numRowThumbs}`)
    const margin = (availWidth - (thumbnailW * numRowThumbs + ((numRowThumbs - 1) * 4))) / 2
    get("thumbnails").style.marginLeft = `${margin}px`
    logt("thumbnails", `center thumbnails: margin: ${two(margin)}`)
  }
  else {
    get("thumbnails").style.marginLeft = "0"
  }

  if (availWidth < availHeight) {
    logt("thumbnails", "Portrait mode")
    topBar!.style.height = `${topHeaderHeight}px`
  }
  else {
    logt("thumbnails", "Landscape mode")
    topBar!.style.height = "0"
  }
}
