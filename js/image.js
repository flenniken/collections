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

// The left edges (scroll positions) of the images in the area not
// including the border beginning and ending images.
var leftEdges = []

// The scaled width of each image.
var imageWidths = []

window.addEventListener("load", loadEvent)

function logStartupTime(message) {
  let seconds = (performance.now() - start) / 1000.0
  seconds = seconds.toFixed(3)
  console.log(`${seconds} s -- ${message}`);
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
