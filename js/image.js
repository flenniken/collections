// image.js
"use strict";

// The collection's json data.
var cJson = null

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

function fnDOMContentLoaded() {
  console.log("DOMContentLoaded")
}

function fnreadystatechange() {
  console.log("readystatechange")
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

function loadEvent() {
  // The page finished loading, load json and size things.

  // Read the collection's json file.
  fetch('../pages/collection-1.json')
    .then(response => response.json())
    .then(json => setupPage(json))
}

function setupPage(json) {
  //
  cJson = json
  console.log(`read collection json, ${cJson.images.length} images`)
  setImageIx()
  sizeImageArea()
  sizeImages()

  // Scroll the current image into view.
  const area = document.getElementById("area")
  area.scrollLeft = leftEdges[imageIx]
  console.log(`area.scrollLeft = ${area.scrollLeft}`)

  // Watch the area scroll and scroll end events.
  area.addEventListener('scroll', areaScroll, false)
  area.addEventListener('scrollend', areaScrollEnd, false)
}

function setImageIx() {
  // Set the first image to show based on the query parameter ix.

  console.log(`window.location.search = ${window.location.search}`)
  const searchParams = new URLSearchParams(window.location.search);
  const ix = searchParams.get("ix")
  if (ix && ix >= 0)
    imageIx = parseInt(ix);
  else
    imageIx = 0
  console.log(`first imageIx = ${imageIx}`)
}

function sizeImageArea() {
  // Size the image area to the size of the usable screen.

  // Get the screen width and height that we can use and store them in
  // globals.
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

  const beginImg = document.getElementById('begin-edge')
  console.log(`beginImg: ${beginImg}`)

  const beginWidth = 100
  beginImg.style.width = `${beginWidth}px`
  beginImg.style.height = `${areaHeight}px`
  console.log(`set begin image: ${beginWidth} X ${areaHeight}`)
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
    console.log(`set image ${index}: ${width} X ${height}`)
    edge += width
    imageWidths.push(width)
  })

  const endWidth = 100
  const endImg = document.getElementById('end-edge');
  beginImg.style.width = `${endWidth}px`
  beginImg.style.height = `${areaHeight}px`
  console.log(`set end image: ${endWidth} X ${areaHeight}`)
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
  // Switch to the image left or right image or snap back to the
  // current image.

  const area = document.getElementById("area");
  console.log(`swipe areaScrollStart:${areaScrollStart}, area.scrollLeft: ${area.scrollLeft}`)

  const leftEdge = leftEdges[imageIx]
  const halfImage = imageWidths[imageIx] / 2

  // If less than half of the image is visible, switch to the previous
  // or next image.
  if (Math.abs(area.scrollLeft - leftEdge) > halfImage) {

    if (area.scrollLeft > areaScrollStart) {
      console.log(`next image; leftEdge = ${leftEdge}`)

      if (imageIx < cJson.images.length - 1) {
        imageIx += 1
        console.log(`set imageIx = ${imageIx}`)
        area.scrollLeft = leftEdges[imageIx]
      }
    }
    else {
      console.log(`previous image; leftEdge = ${leftEdge}`)
      if (imageIx > 0) {
        imageIx -= 1
        console.log(`set imageIx = ${imageIx}`)
        area.scrollLeft = leftEdges[imageIx]
      }
    }
  }
  else {
    // Snap back.
    console.log(`snap back: leftEdge: ${leftEdge}`)
    area.scrollLeft = leftEdge
  }
  areaScrollStart = null
}
