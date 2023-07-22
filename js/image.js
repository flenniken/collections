// image.js
"use strict";

// The start time used for startup timing.
const start = performance.now()

// The image index into the json collection of the image we are
// currently viewing.
var imageIx = null

// The available screen area.
var areaWidth = null
var areaHeight = null

// Finger touching the screen.
var touching = false

// The left edges (scroll positions) of the images in the area not
// including the border beginning and ending images.
var leftEdges = []

// The scaled width of each image.
var imageWidths = []

window.addEventListener("DOMContentLoaded", fnDOMContentLoaded)
window.addEventListener("readystatechange", fnreadystatechange)
window.addEventListener("load", loadEvent)
// window.addEventListener("resize", sizeCurrentImage)
document.addEventListener('touchstart', handleTouchStart, false)
document.addEventListener('touchmove', handleTouchMove, false)
document.addEventListener('touchend', handleTouchEnd, false)
document.addEventListener('touchcancel', handleTouchCancel, false)

function logStartupTime(message) {
  let seconds = (performance.now() - start) / 1000.0
  seconds = seconds.toFixed(3)
  console.log(`${seconds} s -- ${message}`);
}

function fnDOMContentLoaded() {
  logStartupTime("DOMContentLoaded")
}

function fnreadystatechange() {
  logStartupTime("readystatechange")
}

// Timeout function.
var scrollingTimeout

// True when scrolling has paused but the user is still touching.
var scrollingPaused

// The scroll position when scrolling starts.
var areaScrollStart = null

function areaScroll() {
  console.log("areaScroll")

  if (!areaScrollStart) {
    const area = document.getElementById("area")
    areaScrollStart = area.scrollLeft
  }

  window.clearTimeout(scrollingTimeout)
  scrollingPaused = false
  scrollingTimeout = setTimeout(function() {
    if (touching) {
      console.log('Area scrolling has paused for tenth of a second.')
      scrollingPaused = true
    }
    else {
      console.log('Area scrolling has stopped.')
      swipeArea()
    }
  }, 100)
}

function areaScrollEnd() {
  console.log("---areaScrollEnd")
}

async function loadEvent() {
  // The page finished loading, load json and size things.

  logStartupTime("read json file")
  const response = await fetch("../pages/collection-1.json");

  logStartupTime("read and parse json")
  cJson = await response.json();
  logStartupTime(`json contains ${cJson.images.length} images`)

  setImageIx()
  sizeImageArea()
  sizeImages()

  // Scroll the current image into view.
  const area = document.getElementById("area")
  console.log(`leftEdges[${imageIx}]: ${leftEdges[imageIx]}`)
  area.scrollLeft = leftEdges[imageIx]
  console.log(`area.scrollLeft: ${area.scrollLeft.toFixed(2)}`)

  // Delay setting smooth scrolling so the initial scroll position is
  // set quickly.
  setTimeout(() => {
    // Watch the area scroll and scroll end events.
    area.addEventListener('scroll', areaScroll, false)
    area.addEventListener('scrollend', areaScrollEnd, false)
    area.style.scrollBehavior = "smooth"
  }, 500)

  document.body.style.visibility = 'visible';
  document.body.style.opacity = 1;

  logStartupTime("loadEvent Done")
}

function setImageIx() {
  // Set the first image to show based on the query parameter ix.
  logStartupTime("setImageIx")

  console.log(`window.location.search = ${window.location.search}`)
  const searchParams = new URLSearchParams(window.location.search);
  const ix = searchParams.get("ix")
  if (ix && ix >= 0)
    imageIx = parseInt(ix);
  else {
    imageIx = 0
    console.log(`query ix: ${ix}`)
  }
  console.log(`first imageIx: ${imageIx}`)
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
  const area = document.getElementById("area")
  area.style.width = `${areaWidth}px`
  area.style.height = `${areaHeight}px`
  console.log(`set area: ${areaWidth} X ${areaHeight}`)
}

function sizeImages() {
  // Size all the images to fit the view and create the leftEdges
  // array.
  logStartupTime("sizeImages")

  const beginImg = document.getElementById('begin-edge')

  const beginWidth = 100
  beginImg.style.width = `${beginWidth}px`
  beginImg.style.height = `${areaHeight}px`
  console.log(`set begin image: ${beginWidth.toFixed(2)} X ${areaHeight.toFixed(2)}`)
  let edge = beginWidth

  cJson.images.forEach((image, index) => {
    leftEdges.push(edge)
    // Set the image width and height scaled to fit the area.
    const {width, height} = scaleImage(areaWidth, areaHeight, image.width, image.height)

    const ix = index + 2
    const img = document.querySelector(`#area :nth-child(${ix})`)
    img.style.width = `${width}px`;
    img.style.height = `${height}px`;
    img.src = image.url
    console.log(`set image ${index}: ${width.toFixed(2)} X ${height.toFixed(2)}`)
    edge += width
    imageWidths.push(width)
  })

  const endWidth = 100
  const endImg = document.getElementById('end-edge');
  beginImg.style.width = `${endWidth}px`
  beginImg.style.height = `${areaHeight}px`
  console.log(`set end image: ${endWidth.toFixed(2)} X ${areaHeight.toFixed(2)}`)
}

function scaleImage(areaWidth, areaHeight, imageWidth, imageHeight) {
  // Fix the image tite inside the area keeping the image aspect ratio
  // constant. Return the new image width and height.

  console.assert(imageWidth != 0 && imageHeight != 0)
  const hScale = areaWidth / imageWidth
  const vScale = areaHeight / imageHeight
  const scale = Math.min(hScale, vScale)
  const width = scale * imageWidth
  const height = scale * imageHeight
  return {width, height}
}

// Start touch point.
var xDown = null
var yDown = null

// Current touch point.
var xPt = null
var yPt = null

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

function handleTouchCancel(evt) {
  console.log("handleTouchCancel")
  handleTouchEnd(evt)
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
    swipeArea()
  }
}

function swipeArea() {
  // Switch to the closest image or snap back to the current image.
  logStartupTime("swipeArea")

  const area = document.getElementById("area");
  console.log(`swipe areaScrollStart: ${areaScrollStart.toFixed(2)}, area.scrollLeft: ${area.scrollLeft.toFixed(2)}`)

  let closestIx = imageIx
  if (area.scrollLeft < leftEdges[0])
    closestIx = 0
  else if (area.scrollLeft > leftEdges[leftEdges.length - 1])
    closestIx = leftEdges.length - 1
  else {
    // Note: leftEdges includes the two boundry images.
    for (let ix = 0; ix < leftEdges.length - 1; ix++) {
      const left = leftEdges[ix]
      const right = leftEdges[ix+1]
      if (area.scrollLeft >= left && area.scrollLeft < right) {
        if (area.scrollLeft - left < right - area.scrollLeft)
          closestIx = ix
        else
          closestIx = ix + 1
        break
      }
    }
  }
  imageIx = closestIx
  area.scrollLeft = leftEdges[closestIx]

  console.log(`imageIx: ${imageIx}`)
  console.log(`area.scrollLeft: ${area.scrollLeft.toFixed(2)}`)
  areaScrollStart = null

  logStartupTime("swipeArea done")
}
