// image.js
"use strict";

// The collection's json data.
var cJson = null

// The index of the image we are currently viewing.
var imageIx = 0

function previousImage() {
  // Switch to the previous image in the collection.
  if (!cJson)
    return
  imageIx -= 1
  if (imageIx < 0)
    imageIx = cJson.images.length - 1
  console.log(`previous image. imageIx = ${imageIx}`);
  setImage(imageIx)
}

function nextImage() {
  // Switch to the next image in the collection.
  if (!cJson)
    return
  imageIx += 1
  if (imageIx >= cJson.images.length)
    imageIx = 0
  console.log(`next image. imageIx = ${imageIx}`);
  setImage(imageIx)
}

function setImage(ix) {
  // Set the current image.
  let image = cJson.images[ix]
  var img = document.getElementById("image")
  img.src = image.url
  img.alt = image.alt
  img.style.width = `${image.width}px`;
  img.style.height = `${image.height}px`;
  sizeImage()
}

// Read the collection's json file.
fetch('../pages/collection-1.json')
    .then((response) => response.json())
    .then((json) => cJson = json);

window.addEventListener("load", sizeImage)
window.addEventListener("resize", sizeImage)

function sizeImage() {
  // Size the image to fit the screen.

  var width = window.innerWidth || document.documentElement.clientWidth ||
    document.body.clientWidth;

  setImageSizeByWidth(document.getElementById("image"), width)
}

function setImageSizeByWidth(img, newWidth) {
  // Set an image size to the specified width keeping the aspect ratio
  // the same.
  const oldWidth =  Number.parseFloat(getComputedStyle(img).width || img.getAttribute("width"));
  const oldHeight = Number.parseFloat(getComputedStyle(img).height || img.getAttribute("height"));
  const newHeight = (newWidth * oldHeight)/oldWidth;
  img.style.width = `${newWidth}px`;
  img.style.height = `${newHeight}px`;
}

document.addEventListener('touchstart', handleTouchStart, false)
document.addEventListener('touchmove', handleTouchMove, false)
document.addEventListener('touchend', handleTouchEnd, false)
document.addEventListener('touchcancel', handleTouchEnd, false)

var xDown = null
var yDown = null
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
  console.log(`${xPt},${yPt}`)
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
