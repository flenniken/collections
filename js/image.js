// image.js
"use strict";

// The start time used for startup timing.
const start = performance.now()

// cJson is defined in the image html page.

// The image index into the json collection of the image we are
// currently viewing.
var imageIx = null

// The available screen area.
var areaWidth = null
var areaHeight = null

// The left edges (scroll positions) of the images in the area.
var leftEdges = []

window.addEventListener("load", loadEvent)

function logStartupTime(message) {
  let seconds = (performance.now() - start) / 1000.0
  seconds = seconds.toFixed(3)
  console.log(`${seconds}s -- ${message}`);
}

function get(id) {
  return document.getElementById(id)
}

async function loadEvent() {
  // The page finished loading, load json and size things.

  logStartupTime(`loadEvent: json contains ${cJson.images.length} images`)

  setFirstImage()
  sizeImageArea()
  sizeImages()

  // Scroll the current image into view.
  const area = get("area")
  console.log(`leftEdge: ${leftEdges[imageIx]}`)
  area.scrollLeft = leftEdges[imageIx]
  console.log(`area.scrollLeft: ${area.scrollLeft.toFixed(2)}`)

  // Show the page.
  document.body.style.visibility = 'visible';
  document.body.style.opacity = 1;

  // Watch the area scroll and scroll end events.
  area.addEventListener('scroll', areaScroll, false)
  area.addEventListener('scrollend', areaScrollEnd, false)

  logStartupTime("loadEvent Done")
}

function int0(str, min, max) {
  // Parse the number string as an integer and validate it. Return the
  // value or 0 when the str is not valid.
  const value = parseInt(str, 10)
  if (isNaN(value))
    return 0
  if (value < min || value > max)
    return 0
  return value
}

function setFirstImage() {
  // Set the first image to show based on the query parameter image.
  logStartupTime("setFirstImage")
  console.log(`window.location.search = ${window.location.search}`)
  const searchParams = new URLSearchParams(window.location.search);
  const imageQ = searchParams.get("image")
  const imageNum = int0(imageQ, 1, cJson.images.length)
  console.log(`first image: ${imageNum}`)
  imageIx = imageNum - 1
}

function sizeImageArea() {
  // Size the image area to the size of the usable screen.

  // Get the screen width and height that we can use and store them in
  // globals.
  logStartupTime("sizeImageArea")
  areaWidth = window.innerWidth || document.documentElement.clientWidth ||
    document.body.clientWidth
  areaHeight = window.innerHeight || document.documentElement.clientHeight ||
      document.body.clientHeight

  // Size the image area to the screen area.
  const area = get("area")
  area.style.width = `${areaWidth}px`
  area.style.height = `${areaHeight}px`
  const dim = `${areaWidth} x ${areaHeight}`
  console.log(`area size: ${dim}`)
  get('size').innerHTML = `${dim}`
}

function sizeImages() {
  // Size the image containers and the images.
  logStartupTime("sizeImages")

  let edge = 0
  cJson.images.forEach((image, ix) => {
    leftEdges.push(edge)

    // Size all the containers to the size of the area.
    const container = get(`c${ix+1}`)
    container.style.width = `${areaWidth}px`
    container.style.height = `${areaHeight}px`

    // Fit the images in the container.
    console.assert(image.width != 0)
    const fitScale = areaWidth / image.width

    const img = get(`i${ix+1}`)
    const scaledw = image.width * fitScale
    const scaledh = image.height * fitScale
    img.style.width = `${scaledw}px`
    img.style.height = `${scaledh}px`

    // Find the zoom point for the screen size.

    let foundZoomPoint = false
    for (let zix = 0; zix < image.zoomPoints.length; zix++) {
      const zoomPoint = image.zoomPoints[zix]

      const width = zoomPoint[0]
      const height = zoomPoint[1]
      const scale = zoomPoint[2]
      const x = zoomPoint[3]
      const y = zoomPoint[4]

      // Only consider zoom points matching the screen orientation, either portrait or
      // landscape.
      if ((areaWidth > areaHeight && width > height) ||
          (areaWidth <= areaHeight && width <= height)) {
        img.style.scale = scale
        img.style.translate = `${x}px ${y}px`
        console.log(`i${ix+1}: ${image.width} x ${image.height}, ${width} x ${height} (${x}, ${y}) scale: ${scale.toFixed(2)}`)
        foundZoomPoint = true
        break
      }
    }
    if (!foundZoomPoint) {
      console.log("zoom point not found")
      console.log(`image.zoomPoints: ${image.zoomPoints}`)
      console.log(`i${ix+1}: ${image.width} x ${image.height} (0, 0) scale: 1`)
    }

    edge += areaWidth
  })
}

// Timeout function.
var scrollingTimeout

// True when scrolling has paused but the user is still touching.
var scrollingPaused

document.addEventListener('touchstart', handleTouchStart, false)
document.addEventListener('touchmove', handleTouchMove, false)
document.addEventListener('touchend', handleTouchEnd, false)
document.addEventListener('touchcancel', handleTouchCancel, false)

function areaScroll() {
  // console.log("areaScroll")

  window.clearTimeout(scrollingTimeout)
  scrollingPaused = false
  scrollingTimeout = setTimeout(function() {
    if (touching) {
      console.log('Area scrolling has paused for a tenth of a second.')
      scrollingPaused = true
    }
    else {
      console.log('Area scrolling has stopped.')
      handleScrollEnd()
    }
  }, 100)
}

// Start touch point.
var xDown = null
var yDown = null

// Current touch point.
var xPt = null
var yPt = null

// Finger touching the screen.
var touching = false

function handleTouchStart(evt) {
  console.log("handleTouchStart")
  touching = true

  const firstTouch = evt.touches[0]
  xDown = firstTouch.clientX
  yDown = firstTouch.clientY
}

function handleTouchMove(evt) {
  if (!xDown || !yDown)
    return
  xPt = evt.touches[0].clientX
  yPt = evt.touches[0].clientY
}

function handleTouchEnd(evt) {
  console.log("handleTouchEnd")
  touching = false
  xDown = null
  yDown = null
  xPt = null
  yPt = null
  if (scrollingPaused) {
    console.log("Area scrolling has stopped after pausing.")
    handleScrollEnd()
  }
}

function handleTouchCancel(evt) {
  console.log("handleTouchCancel")
  handleTouchEnd(evt)
}

function areaScrollEnd() {
  // Once the scrollend event is supported in the browsers you can
  // remove the code above.
  console.log("areaScrollEnd")
}

function handleScrollEnd() {
  // Area horizontal scrolling has stopped.  scrollLeft is the ending
  // position.
  const area = get("area")
  console.log(`area.scrollLeft: ${area.scrollLeft.toFixed(2)}`)
  console.log(`leftEdges: ${leftEdges}`)
  let foundEdge = false
  for (let ix = 0; ix < leftEdges.length; ix++) {
    if (Math.round(area.scrollLeft) <= leftEdges[ix]) {
      imageIx = ix
      console.log(`image: ${imageIx+1}`)
      foundEdge = true
      SetDetails()
      break
    }
  }
  if (!foundEdge)
    console.log('edge not found')
}

function SetDetails() {
  const image = cJson.images[imageIx]
  get('title').innerHTML = image.title
  get('description').innerHTML = image.description
  get('keywords').innerHTML = image.keywords
  get('size').innerHTML = `${areaWidth} x ${areaHeight}`
}
