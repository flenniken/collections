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

async function loadEvent() {
  // The page finished loading, load json and size things.

  logStartupTime(`loadEvent: json contains ${cJson.images.length} images`)

  setImageIx()
  sizeImageArea()
  sizeImages()

  // Scroll the current image into view.
  const area = document.getElementById("area")
  console.log(`leftEdges[${imageIx}]: ${leftEdges[imageIx]}`)
  area.scrollLeft = leftEdges[imageIx]
  console.log(`area.scrollLeft: ${area.scrollLeft.toFixed(2)}`)

  document.body.style.visibility = 'visible';
  document.body.style.opacity = 1;

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

function setImageIx() {
  // Set the first image to show based on the query parameter ix.
  logStartupTime("setImageIx")

  console.log(`window.location.search = ${window.location.search}`)
  const searchParams = new URLSearchParams(window.location.search);
  const ix = searchParams.get("ix")
  console.log(`query ix: ${ix}`)

  imageIx = int0(ix, 0, cJson.images.length - 1)
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

  let edge = 0
  cJson.images.forEach((image, ix) => {
    leftEdges.push(edge)
    // Set the image width and height scaled to fit the area.
    const {width, height} = wScaleImage(areaWidth, areaHeight, image.width, image.height)
    const img = document.querySelector(`#area :nth-child(${ix+1})`)
    setDimensionsImg(img, width, height, ix)
    edge += width
  })
}

function setDimensionsImg(img, width, height, msg) {
  // Set the image width and height and log the message.
  img.style.width = `${width}px`
  img.style.height = `${height}px`
  console.log(`set ${msg}: ${width.toFixed(2)} X ${height.toFixed(2)}`)
}

function wScaleImage(areaWidth, areaHeight, imageWidth, imageHeight) {
  // Fix the image width inside the area keeping the image aspect ratio
  // constant. Return the new image width and height.

  console.assert(imageWidth != 0 && imageHeight != 0)
  const hScale = areaWidth / imageWidth
  const scale = hScale
  const width = scale * imageWidth
  const height = scale * imageHeight
  return {width, height}
}
