// image.js

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
      console.log(`pull left: xDiff = ${xDiff}`);
      /* pull right */
    } else {
      console.log(`pull right: xDiff = ${xDiff}`);
      /* pull left */
    }
  } else {
    console.log(`yDiff: ${yDiff}`);
    if ( yDiff > 0 ) {
      console.log(`pull up: xDiff = ${xDiff}`);
      /* pull up */
    } else {
      /* pull down */
      console.log(`pull down: xDiff = ${xDiff}`);
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
