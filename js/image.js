// image.js
"use strict";

// The collection's json data.
var cJson = null

// The image index into the json collection of the image we are
// currently viewing.
var imageIx = null

// Area of the screen available.
var areaWidth = null
var areaHeight = null

window.addEventListener("load", loadEvent)
window.addEventListener("DOMContentLoaded", fnDOMContentLoaded)
window.addEventListener("readystatechange", fnreadystatechange)
// window.addEventListener("resize", sizeCurrentImage)

function fnDOMContentLoaded() {
  console.log("DOMContentLoaded")
}

function fnreadystatechange() {
  console.log("readystatechange")
}

function firstImage() {
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

function previousImage() {
  // Switch to the previous image in the collection.

  if (!cJson) {
    console.log("no cJson")
    return
  }
  if (imageIx === null) {
    console.log("no imageIx")
    return
  }
  if (imageIx > 0)
    imageIx -= 1
  console.log(`set imageIx = ${imageIx}`)
  setCurrentImage()
}

function nextImage() {
  // Switch to the next image in the collection.

  if (!cJson) {
    console.log("no cJson")
    return
  }
  if (imageIx === null) {
    console.log("no imageIx")
    return
  }
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
  if (imageIx === null) {
    console.log("no imageIx")
    return
  }
  if (!areaWidth) {
    console.log("no areaWidth")
    return
  }

  const image = cJson.images[imageIx]
  const img = document.getElementById("image")

  // Fit the image in the area maintaining the image ratio.
  let {width, height} = scaleImage(areaWidth, areaHeight, image.width, image.height)
  img.style.width = `${width}px`;
  img.style.height = `${height}px`;

  img.src = image.url

  console.log(`set image size: ${width} X ${height}`)
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
  firstImage()
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
