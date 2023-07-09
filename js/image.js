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

window.addEventListener("DOMContentLoaded", fnDOMContentLoaded)
window.addEventListener("readystatechange", fnreadystatechange)
window.addEventListener("load", loadEvent)
// window.addEventListener("resize", sizeCurrentImage)
document.addEventListener('touchstart', handleTouchStart, false)
document.addEventListener('touchmove', handleTouchMove, false)
document.addEventListener('touchend', handleTouchEnd, false)
document.addEventListener('touchcancel', handleTouchEnd, false)

function fnDOMContentLoaded() {
  console.log("DOMContentLoaded")
}

function fnreadystatechange() {
  console.log("readystatechange")
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
  firstImage()
  sizeImageArea()
  setCurrentImage()
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

function setCurrentImage() {
  // Set the current image.

  if (!cJson) {
    console.log("no cJson")
    return
  }
  if (imageIx == null) {
    console.log("no imageIx")
    return
  }
  if (!areaWidth) {
    console.log("no areaWidth")
    return
  }

  configureImage("previousImage", imageIx - 1)
  configureImage("image", imageIx)
  configureImage("nextImage", imageIx + 1)

  // Scroll the image into view.
  area.scrollLeft = getLeftEdge()
  console.log(`area.scrollLeft = ${area.scrollLeft}`)
}

function getLeftEdge() {
  const previousImg = document.getElementById("previousImage");
  return parseFloat(previousImg.style.width)
}

function configureImage(idName, ix) {
  // Configure the image in the image area with the given name and
  // image index.

  let img = document.getElementById(idName);

  let width, height
  if (ix < 0 || ix >= cJson.images.length) {
    width = '100'
    height = areaHeight
    if (ix < 0)
      img.src = "../icons/begin.svg"
    else
      img.src = "../icons/end.svg"
    img.style.width = `${width}px`;
    img.style.height = `${height}px`;
    console.log(`set ${idName} ${width} X ${height}`)
  }
  else {
    // Set the image width and height scaled to fit the area.
    const image = cJson.images[ix]
    const {width, height} = scaleImage(areaWidth, areaHeight, image.width, image.height)
    img.style.width = `${width}px`;
    img.style.height = `${height}px`;
    img.src = image.url
    console.log(`set ${idName} ${width} X ${height}`)
  }
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


// Handle swiping left, right and down using the touch events.


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

  // Swipe Right (on the online dating app Tinder) indicates that one
  // finds someone attractive by moving one's finger to the right across
  // an image of them on a touchscreen.  "I swiped right, but sadly for
  // me, she swiped left"
  let swipeType
  if (Math.abs(xDiff) > Math.abs(yDiff)) {
    if (xDiff > 0)
      swipeType = 'left'
    else
      swipeType = 'right'
    swipeImage(swipeType)
  }
  else {
    if (yDiff > 0)
      swipeType = 'up'
    else {
      swipeType = 'down'
      window.location.href = "thumbnails-1.html"
    }
  }

  xDown = null
  yDown = null
  xPt = null
  yPt = null
}

function swipeImage(swipeType) {
  // Swipe the image left or right or snap back to the middle image.

  const area = document.getElementById("area");
  console.log(`swipe ${swipeType}, area.scrollLeft: ${area.scrollLeft}`)

  const leftEdge = getLeftEdge()
  console.log(`leftEdge: ${leftEdge}`)
  const img = document.getElementById("image");
  const imageWidth = parseFloat(img.style.width)
  const imageMiddle = leftEdge + (imageWidth / 2)
  console.log(`imageMiddle: ${imageMiddle}`)

  if (swipeType == "left" && area.scrollLeft > imageMiddle) {
    console.log("next image")
    nextImage()
  }
  else if (swipeType == "right" && area.scrollLeft < imageMiddle) {
    console.log("previous image")
    previousImage()
  }
  else {
    // Snap back.
    console.log(`snap back: leftEdge: ${leftEdge}`)
    area.scrollLeft = leftEdge
  }
}
