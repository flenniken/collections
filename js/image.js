// image.js
"use strict";

// The collection's json data.
var cJson = null

// The image index into the json collection of the image we are
// currently viewing.
var imageIx = 0

// Area of the screen available.
var areaWidth = null
var areaHeight = null

function previousImage() {
  // Switch to the previous image in the collection.

  if (!cJson)
    return
  if (imageIx > 0)
    imageIx -= 1
  console.log(`set imageIx = ${imageIx}`)
  setCurrentImage()
}

function nextImage() {
  // Switch to the next image in the collection.

  if (!cJson)
    return
  if (imageIx < cJson.images.length - 1)
    imageIx += 1
  console.log(`set imageIx = ${imageIx}`)
  setCurrentImage()
}

function setCurrentImage() {
  // Set the current image.

  if (!cJson) {
    console.log("no cJson")
    return
  }

  const image = cJson.images[imageIx]
  const img = document.getElementById("image")
  img.src = image.url
  img.alt = image.alt

  if (!areaWidth) {
    console.log("no areaWidth")
    return
  }

  // Set the image to fit the area maintaining the image ratio.

  let width = null
  let height = null
  let longSide = null
  let shortSide = null

  if (areaWidth > areaHeight) {
    longSide = areaWidth
  } else {
    longSide = areaHeight
  }

  if (image.width > image.height) {
    shortSide = image.height * longSide / image.width
    width = longSide
    height = shortSide
  } else {
    shortSide = image.width * longSide / image.height
    width = shortSide
    height = longSide
  }

  img.style.width = `${width}px`;
  img.style.height = `${height}px`;

  console.log(`set image size: ${width} X ${height}`)
}

window.addEventListener("load", loadEvent)
// window.addEventListener("resize", sizeCurrentImage)

function loadEvent() {
  // The page finished loading, load json and size things.

  // Read the collection's json file.
  fetch('../pages/collection-1.json')
    .then(response => response.json())
    .then(json => setJson(json))
}

function setJson(json) {
  //
  cJson = json
  console.log(`read collection json, ${cJson.images.length} images`)

  sizeImageArea()
  setCurrentImage()
}

function sizeImageArea() {
  // Size the image area to the size of the screen.

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

// Handle swiping left, right and down using the touch events.

document.addEventListener('touchstart', handleTouchStart, false)
document.addEventListener('touchmove', handleTouchMove, false)
document.addEventListener('touchend', handleTouchEnd, false)
document.addEventListener('touchcancel', handleTouchEnd, false)

// Start touch point.
var xDown = null
var yDown = null

// Current touch point.
var xPt = null
var yPt = null

function handleTouchStart(evt) {
  const firstTouch = evt.touches[0]
  xDown = firstTouch.clientX
  yDown = firstTouch.clientY
}

function handleTouchMove(evt) {
  if (!xDown || !yDown)
    return
  xPt = evt.touches[0].clientX
  yPt = evt.touches[0].clientY
  const xPt2 = xPt.toFixed(2)
  const yPt2 = yPt.toFixed(2)
  // console.log(`${xPt2},${yPt2}`)
}

function handleTouchEnd(evt) {
  if (!xDown || !yDown)
    return
  if (!xPt || !yPt)
    return
  const xDiff = xDown - xPt
  const yDiff = yDown - yPt

  if (Math.abs(xDiff) > Math.abs(yDiff)) {
    if (xDiff > 0) {
      console.log(`swipe right: xDiff = ${xDiff}`)
      nextImage()
    } else {
      console.log(`swipe left: xDiff = ${xDiff}`)
      previousImage()
    }
  } else {
    if (yDiff > 0) {
      console.log(`swipe up: yDiff = ${yDiff}`)
    } else {
      console.log(`swipe down: yDiff = ${yDiff}`)
      window.location.href = "thumbnails-1.html"
    }
  }
  xDown = null
  yDown = null
  xPt = null
  yPt = null
}
