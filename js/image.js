"use strict";

// Javascript for the image page.

// cJson is defined in the image html page.

// The current image index into the json list of images.
var imageIx = null

// The available screen area.
var areaWidth = null
var areaHeight = null

// The minimum amount of image to keep visible when zooming and
// panning.
var minVisible = null

// The left edges (scroll positions) of the images in the area.
var leftEdges = null

// Consider a zoom point this close.
const closeDistance = 100

window.addEventListener("load", loadEvent)

// The start time used for timing.
const startTime = performance.now()

function logStartupTime(message) {
  // Log the elasped time since the startTime.
  let seconds = (performance.now() - startTime) / 1000.0
  seconds = seconds.toFixed(3)
  log(`${seconds}s -- ${message}`)
}

function get(id) {
  // Get the dom element with the given id.
  return document.getElementById(id)
}

function log(message) {
  // Log the message to the console.
  console.log(message)
}

function logError(message) {
  // Log an error message to the console.
  console.error(message)
}

function two(num) {
  // Return the number rounded to two decimal places.
  return num.toFixed(2)
}

async function loadEvent() {
  // The page finished loading, setup and size things.
  logStartupTime(`loadEvent: json contains ${cJson.images.length} images`)

  // Disable the default browser zoom and pan behavior.
  get("image-page").setAttribute("touch-action", "none")

  setFirstImage()

  logStartupTime("sizeImageArea")
  sizeImageArea()

  logStartupTime("sizeImages")
  sizeImages()

  // Show the page.
  document.body.style.visibility = 'visible'
  document.body.style.opacity = 1

  // Watch the area scroll and scroll end events.
  area.addEventListener('scroll', areaScroll, false)
  area.addEventListener('scrollend', () => {
    // Once the scrollend event is supported in the browsers you can
    // replace the code that figures out when scrolling ends.
    log("areaScrollEnd event exists!")
  })

  logStartupTime("loadEvent Done")
}

function intDef(str, min, max, def) {
  // Parse the number string as an integer and validate it. Return the
  // value. If the value is less than the min or greater than the max,
  // return the default value.  When the str is not valid, return the
  // default value.
  const value = parseInt(str, 10)
  if (isNaN(value))
    return def
  if (value < min || value > max)
    return def
  return value
}

function setFirstImage() {
  // Set the first image to show based on the url image query
  // parameter.
  log(`window.location.search = ${window.location.search}`)
  const searchParams = new URLSearchParams(window.location.search)
  const imageQ = searchParams.get("image")
  const imageNum = intDef(imageQ, 1, cJson.images.length, 0)
  log(`first image: ${imageNum}`)
  imageIx = imageNum - 1
}

function sizeImageArea() {
  // Size the image area to the size of the usable screen.

  // Get the available screen width and height and store them in
  // globals, areaWidth and areaHeight.

  const sizes = [
    [window.innerWidth, window.innerHeight, 'window.innerWidth x ...innerHeight'],
    [window.screen.availWidth, window.screen.availHeight, 'window.screen.availWidth x ...availHeight'],
    [document.documentElement.clientWidth, document.documentElement.clientHeight,
      'document.documentElement.clientWidth x ...clientHeight'],
    [document.body.clientWidth, document.body.clientHeight, 'document.body.clientWidth x ...clientHeight'],
  ]
  sizes.forEach((size, ix) => {
    const [w, h, msg] = size
    log(`${w} x ${h}: ${msg}`)
  })

  areaWidth = document.documentElement.clientWidth
  areaHeight = document.documentElement.clientHeight
  // Add 60 to account for the top toolbar height when PWA without top bar.
  if (true) {
    areaHeight += 60
    log("add 60 to height for top bar")
  }

  minVisible = areaWidth / 4

  // Size the image area to the available screen area.
  const area = get("area")
  area.style.width = `${areaWidth}px`
  area.style.height = `${areaHeight}px`
  const dim = `${areaWidth} x ${areaHeight}`
  log(`area size: ${dim}`)
  get('size').innerHTML = `${dim}`
}

function getZoomPoint(cjson=cJson) {
  // Return the zoom point for the given image index.
  const zoom_w_h = `${areaWidth}x${areaHeight}`
  const zoomPoints = cjson.zoomPoints[zoom_w_h]
  return zoomPoints[imageIx]
}

function sizeImages() {
  // Size the image containers and the images and create zoom points
  // when missing.

  let edge = 0
  leftEdges = []
  const zoom_w_h = `${areaWidth}x${areaHeight}`

  let zoomPoints
  const needZoomPoints = zoom_w_h in cJson.zoomPoints ? false : true
  if (needZoomPoints) {
    log("creating zoom points")
    zoomPoints = []
    cJson.zoomPoints[zoom_w_h] = zoomPoints
  }
  else {
    zoomPoints = cJson.zoomPoints[zoom_w_h]
  }

  cJson.images.forEach((image, ix) => {
    if (image.width < areaWidth || image.height < areaHeight) {
      logError("small images are not supported")
    }

    // Save the position of the left edge of all the images.
    leftEdges.push(edge)

    // Size all the containers to the size of the area.
    const container = get(`c${ix+1}`)
    container.style.width = `${areaWidth}px`
    container.style.height = `${areaHeight}px`

    // Create or fetch the zoom point for the image.
    let zoomPoint
    if (needZoomPoints) {
      // Create a zoom point where the image fits the screen.
      zoomPoint = {}
      // Fit the long side to the container.
      if (image.width - areaWidth > image.height - areaHeight) {
        zoomPoint.scale = areaWidth / image.width
      } else {
        zoomPoint.scale = areaHeight / image.height
      }
      zoomPoint.tx = 0
      zoomPoint.ty = 0
      zoomPoints.push(zoomPoint)
    }
    else {
      zoomPoint = zoomPoints[ix]
    }

    // Set the image to its zoom point.
    const img = get(`i${ix+1}`)
    img.style.width = `${zoomPoint.width}px`
    img.style.height = `${zoomPoint.height}px`
    img.style.transformOrigin = "0px 0px"
    // Note: translate runs from right to left.
    img.style.transform = `translate(${zoomPoint.tx}px, ${zoomPoint.ty}px) scale(${zoomPoint.scale})`;

    // Log the zoom point.
    log(`i${ix+1}: ${areaWidth} x ${areaHeight}, ` +
                `scale: ${two(zoomPoint.scale)}, ` +
                `t: (${two(zoomPoint.tx)}, ${two(zoomPoint.ty)})`)

    edge += areaWidth
  })

  // Scroll the current image into view.
  const area = get("area")
  log(`leftEdge: ${leftEdges[imageIx]}`)
  area.scrollLeft = leftEdges[imageIx]
  log(`area.scrollLeft: ${two(area.scrollLeft)}`)
}

// Timeout function used to determine when scrolling stops.
var scrollingTimeout

// True when scrolling has paused but the user is still touching.
var scrollingPaused

// When scrolling started.
var scrollStart

function areaScroll() {
  // When scolling stops, call handleScrollEnd.

  // Scrolling stops when no more scroll events happen within .35
  // seconds and a finger is not down. The .35 comes from
  // experimenting in safari. If the timeout value is too short, the
  // edge doesn't match up, but it will match eventually.

  if (scrollStart == null) {
    scrollStart = performance.now()
  }

  window.clearTimeout(scrollingTimeout)
  scrollingPaused = false
  scrollingTimeout = setTimeout(function() {
    if (touching) {
      log('Area scrolling has paused for a tenth of a second.')
      scrollingPaused = true
    }
    else {
      let seconds = (performance.now() - scrollStart) / 1000.0
      seconds = seconds.toFixed(3)
      log(`Area scrolling has stopped. ${seconds}s`)
      scrollStart = null
      handleScrollEnd()
    }
  }, 350)
}

// Finger touching the screen. Used with one finger horizontal scrolling.
var touching = false

function handleScrollEnd() {
  // Area horizontal scrolling has stopped. area.scrollLeft contains
  // the ending position. Update the current image and the page
  // details.

  const area = get("area")

  // Update the current image (imageIx) and the page details.
  let foundEdge = false
  const previousImageIx = imageIx
  for (let ix = 0; ix < leftEdges.length; ix++) {
    if (Math.round(area.scrollLeft) == leftEdges[ix]) {
      imageIx = ix
      log(`Scrolled to ${imageIx+1}`)
      foundEdge = true
      if (imageIx != previousImageIx)
        SetDetails()
      break
    }
  }
  if (!foundEdge) {
    log(`Edge not found: area.scrollLeft: ${two(area.scrollLeft)}, leftEdges: ${leftEdges}`)
  }
}

function SetDetails() {
  // Update the page details for the current image.

  const image = cJson.images[imageIx]
  get('title').innerHTML = image.title
  get('description').innerHTML = image.description
  get('size').innerHTML = `${areaWidth} x ${areaHeight}`
}

// Whether we are zooming an image or not.
let zooming = false

// The position when we started zooming and panning.
let start = {}

// The current touchmove position for zooming and panning.
let current = {}
let doubleClick = null

window.addEventListener('touchstart', (event) => {

  // Touching is true when a finger is down.
  touching = true

  // Start timer on first click. If second click comes before .5
  // seconds, it’s a double click. Only consider one finger cases.
  if (event.touches.length == 1) {
    if (doubleClick !== null) {
      let seconds = (performance.now() - doubleClick) / 1000.0
      if (seconds < .5) {
        restoreImageSize()
        doubleClick = null
        return
      }
    }
    doubleClick = performance.now()
  } else {
    doubleClick = null
  }

  // When not two fingers touching, return.
  if (event.touches.length != 2)
    return

  zooming = true

  // Disable the default browser zoom and pan behavior when two
  // fingers are down.
  event.preventDefault()

  // Log the client x and y values.
  const clientX0 = event.touches[0].clientX
  const clientX1 = event.touches[1].clientX
  const clientY0 = event.touches[0].clientY
  const clientY1 = event.touches[1].clientY
  // log(`touchstart: client0: (${clientX0}, ${clientY0}) client1: (${clientX1}, ${clientY1})`)

  const image = cJson.images[imageIx]
  const zoomPoint = getZoomPoint()

  // Save the point centered between the two fingers, the distance
  // between them, the current translation and the current scale.
  start.cx = (clientX0 + clientX1) / 2
  start.cy = (clientY0 + clientY1) / 2
  start.distance = Math.hypot(clientX0 - clientX1, clientY0 - clientY1)
  start.scale = zoomPoint.scale
  start.tx = zoomPoint.tx
  start.ty = zoomPoint.ty

  log(`i${imageIx+1}: touchstart: c: (${two(start.cx)}, ${two(start.cy)}) ` +
              `d: ${two(start.distance)}, scale: ${two(start.scale)}, ` +
              `t: (${two(start.tx)}, ${two(start.ty)})`)
})

function restoreImageSize() {
  log("restore image size")

  // Get the original zoom point.
  const image = cJson.images[imageIx]
  const origZP = getZoomPoint(cJsonOriginal)
  log(`original zoom point: (${two(origZP.tx)}, ${two(origZP.ty)}), scale: ${two(origZP.scale)}`)

  // Restore the current zoom point.
  let zoomPoint = getZoomPoint(cJson)
  zoomPoint.scale = origZP.scale;
  zoomPoint.tx = origZP.tx;
  zoomPoint.ty = origZP.ty;

  // Set the image scale and position to the original zoom point.
  const img = get(`i${imageIx+1}`)
  // Note: translate runs from right to left.
  img.style.transform = `translate(${zoomPoint.tx}px, ${zoomPoint.ty}px) scale(${zoomPoint.scale})`;
}

window.addEventListener('touchmove', (event) => {
  // Zoom and pan the image.

  if (event.touches.length != 2)
    return

  // Disable the default browser zoom and pan behavior when two
  // fingers are down.
  event.preventDefault()

  if (!zooming)
    return

  const clientX0 = event.touches[0].clientX
  const clientX1 = event.touches[1].clientX
  const clientY0 = event.touches[0].clientY
  const clientY1 = event.touches[1].clientY
  // log(`touchmove: client0: (${clientX0}, ${clientY0}) client1: (${clientX1}, ${clientY1})`)

  const image = cJson.images[imageIx]
  const zoomPoint = getZoomPoint()

  current.cx = (clientX0 + clientX1) / 2
  current.cy = (clientY0 + clientY1) / 2
  current.distance = Math.hypot(clientX0 - clientX1, clientY0 - clientY1)
  current.scale = (current.distance / start.distance) * start.scale

  // Calculate the new image scale and upper left hand corner based on
  // the center point between the two fingers and how far apart they
  // are compared to when zooming started.
  let movedCt = {};
  movedCt.cx = ((start.cx - start.tx) * current.scale) / start.scale + start.tx
  // log(`start.cx: ${start.cx}, start.tx: ${start.tx}, start.scale: ${start.scale}`)
  movedCt.cy = ((start.cy - start.ty) * current.scale) / start.scale + start.ty
  const tx = start.tx - (movedCt.cx - start.cx) + (current.cx - start.cx)
  const ty = start.ty - (movedCt.cy - start.cy) + (current.cy - start.cy)
  const newIw = image.width * current.scale
  const newIh = image.height * current.scale

  // If the new scale and position are within the screen constraints,
  // use them, else ignore them.
  const newOk = newPosOK(current.scale, tx, ty, newIw, newIh);
  if (newOk) {
    zoomPoint.scale = current.scale;
    zoomPoint.tx = tx;
    zoomPoint.ty = ty;

    const img = get(`i${imageIx+1}`)
    // Note: translate runs from right to left.
    img.style.transform = `translate(${zoomPoint.tx}px, ${zoomPoint.ty}px) scale(${zoomPoint.scale})`;
  }

}, {passive: false})

function newPosOK(newScale, tx, ty, newIw, newIh) {
  // Return true when the image size and position are good.

  const image = cJson.images[imageIx]

  // Scale up to 100%.
  if (newScale > 1) {
    log(`out of range: scale > 1`)
    return false
  }

  // Scale down to half the area width.
  if (newIw < areaWidth / 2) {
    log(`out of range: image size < half area width`)
    return false
  }

  // Allow the image to move but keep some of it visible.
  const rightEdge = tx + newIw
  if (tx > areaWidth - minVisible) {
    log(`out of range: tx > areaWidth - minVisible`)
    return false
  }
  if (rightEdge < minVisible) {
    log(`out of range: rightEdge < minVisible`)
    return false
  }
  const bottomEdge = ty + newIh
  if (ty > areaHeight - minVisible) {
    log(`out of range: ty > areaHeight - minVisible`)
    return false
  }
  if (bottomEdge < minVisible) {
    log(`out of range: image bottomEdge < minVisible`)
    return false
  }

  // The position is good.
  return true
}

document.addEventListener('touchend', handleTouchend, false)
document.addEventListener('touchcancel', handleTouchend, false)

function handleTouchcancel(event) {
  log("touchcancel")
  handleTouchend(event)
}

function handleTouchend(event) {

  touching = false

  if (scrollingPaused) {
    log("touchend: finger up after pausing the scroll.")
    areaScroll()
  }

  if (zooming) {
    zooming = false

    const image = cJson.images[imageIx]
    const zoomPoint = getZoomPoint()
    log(`i${imageIx+1}: touchend: c: (${two(current.cx)}, ${two(current.cy)}) ` +
              `d: ${two(current.distance)}, scale: ${two(zoomPoint.scale)}, ` +
              `t: (${two(zoomPoint.tx)}, ${two(zoomPoint.ty)})`)
  }
}

screen.orientation.addEventListener("change", (event) => {
  // When the phone orientation changes, update the image area and
  // size the images.
  const type = event.target.type;
  const angle = event.target.angle;
  log(`ScreenOrientation change: ${type}, ${angle} degrees.`);
  sizeImageArea()
  sizeImages()
})

function copyJson() {
  // Copy the json data to the clipboard.
  log("copy json to the clipboard");
  const msg = JSON.stringify(cJson, null, 2)
  navigator.clipboard.writeText(msg);
}
