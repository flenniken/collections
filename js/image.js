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
  sizeImage()
}

function setImage(ix) {
  // Set the current image.
  let image = cJson.images[ix]
  let img = `<img id="image" width="${image.width}" height="${image.height}" src="${image.url}" alt="${image.title}">`
  console.log(`${img}`);
  document.getElementById("imageDiv").innerHTML = img
}

// Read the collection's json file.
fetch('../pages/collection-1.json')
    .then((response) => response.json())
    .then((json) => cJson = json);

// Handle swiping.
document.addEventListener('touchstart', handleTouchStart, false);
document.addEventListener('touchmove', handleTouchMove, false);

var xDown = null;
var yDown = null;

function getTouches(evt) {
  return evt.touches ||             // browser API
         evt.originalEvent.touches; // jQuery
}

function handleTouchStart(evt) {
  const firstTouch = getTouches(evt)[0];
  xDown = firstTouch.clientX;
  yDown = firstTouch.clientY;
};

function handleTouchMove(evt) {
  if ( ! xDown || ! yDown ) {
    return;
  }

  var xUp = evt.touches[0].clientX;
  var yUp = evt.touches[0].clientY;

  var xDiff = xDown - xUp;
  var yDiff = yDown - yUp;

  if (Math.abs(xDiff) > Math.abs(yDiff)) {
    if ( xDiff > 0 ) {
      console.log(`swipe right: xDiff = ${xDiff}`);
      nextImage()
    } else {
      console.log(`swipe left: xDiff = ${xDiff}`);
      previousImage()
    }
  } else {
    console.log(`yDiff: ${yDiff}`);
    if ( yDiff > 0 ) {
      console.log(`swipe up: xDiff = ${xDiff}`);
    } else {
      console.log(`swipe down: xDiff = ${xDiff}`);
      window.location.href = "thumbnails-1.html"
    }
  }
  xDown = null;
  yDown = null;
};

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
