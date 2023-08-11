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

// Consider zoom point this close.
const closeDistance = 100

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
    const [zoomPoint, distance] = getZoomPoint(image)

    // Scale the translate the image to the zoom point.
    const [w,h,s,x,y] = zoomPoint
    img.style.scale = s
    img.style.translate = `${x}px ${y}px`

    if (distance > closeDistance) {
      console.log(`no good zoom point found for image ${ix+1}, distance: ${distance}`)
      for (let ix = 0; ix < image.zoomPoints.length; ix++) {
        console.log(`zoom point ${ix}: ${image.zoomPoints[ix]}`)
      }
    }

    const part1 = `i${ix+1}: ${image.width} x ${image.height}, `
    const part2 = `${w} x ${h} (${x}, ${y}) scale: ${s.toFixed(2)} d: ${distance}`
    console.log(part1 + part2)

    edge += areaWidth
  })
}

function getZoomPoint(image) {
  // Return the zoom point and distance for the given image.

  let zoomPoint = [areaWidth, areaHeight, 1, 0, 0]
  let distance = Math.abs(areaWidth - image.width) + Math.abs(areaHeight - image.height)
  if (distance == 0)
    return [zoomPoint, distance]

  for (let zix = 0; zix < image.zoomPoints.length; zix++) {
    const zp = image.zoomPoints[zix]
    const width = zp[0]
    const height = zp[1]

    // Only consider zoom points matching the screen orientation, either portrait or
    // landscape.
    if ((areaWidth > areaHeight && width > height) ||
        (areaWidth <= areaHeight && width <= height)) {
      const dist = Math.abs(areaWidth - width) + Math.abs(areaHeight - height)
      if (dist < closeDistance && dist < distance) {
        distance = dist
        zoomPoint = zp
        if (distance == 0)
          break
      }
    }
  }
  return [zoomPoint, distance]
}

// Timeout function.
var scrollingTimeout

// True when scrolling has paused but the user is still touching.
var scrollingPaused

document.addEventListener('touchstart', handleTouchStart, false)
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

// Finger touching the screen.
var touching = false

function handleTouchStart(evt) {
  console.log("handleTouchStart")
  touching = true
}

function handleTouchEnd(evt) {
  console.log("handleTouchEnd")
  touching = false
  if (scrollingPaused) {
    console.log("figure up after pausing the scroll.")
    areaScroll()
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
  const previousImageIx = imageIx
  for (let ix = 0; ix < leftEdges.length; ix++) {
    if (Math.round(area.scrollLeft) == leftEdges[ix]) {
      imageIx = ix
      console.log(`image: ${imageIx+1}`)
      foundEdge = true
      if (imageIx != previousImageIx)
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
