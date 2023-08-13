// image.js
"use strict";

// The start time used for startup timing.
const startTime = performance.now()

// cJson is defined in the image html page.

// The image index into the json collection of the image we are
// currently viewing.
var imageIx = null

// The available screen area.
var areaWidth = null
var areaHeight = null

// The left edges (scroll positions) of the images in the area.
var leftEdges = []

// Consider zoom point this close.
const closeDistance = 100

window.addEventListener("load", loadEvent)

function logStartupTime(message) {
  let seconds = (performance.now() - startTime) / 1000.0
  seconds = seconds.toFixed(3)
  console.log(`${seconds}s -- ${message}`)
}

function get(id) {
  return document.getElementById(id)
}

async function loadEvent() {
  // The page finished loading, load json and size things.

  logStartupTime(`loadEvent: json contains ${cJson.images.length} images`)

  setFirstImage()
  sizeImageArea()
  sizeImages()

  // Scroll the current image into view.
  const area = get("area")
  console.log(`leftEdge: ${leftEdges[imageIx]}`)
  area.scrollLeft = leftEdges[imageIx]
  console.log(`area.scrollLeft: ${two(area.scrollLeft)}`)

  // Show the page.
  document.body.style.visibility = 'visible'
  document.body.style.opacity = 1

  // Watch the area scroll and scroll end events.
  area.addEventListener('scroll', areaScroll, false)
  area.addEventListener('scrollend', () => {
    // Once the scrollend event is supported in the browsers you can
    // replace the code that figures out when scrolling ends.
    console.log("areaScrollEnd event exists")
  })

  // Disable the default browser zoom and pan behavior.
  area.setAttribute("touch-action", "none")

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

function setFirstImage() {
  // Set the first image to show based on the url query parameter image.
  logStartupTime("setFirstImage")
  console.log(`window.location.search = ${window.location.search}`)
  const searchParams = new URLSearchParams(window.location.search)
  const imageQ = searchParams.get("image")
  const imageNum = int0(imageQ, 1, cJson.images.length)
  console.log(`first image: ${imageNum}`)
  imageIx = imageNum - 1
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
  const area = get("area")
  area.style.width = `${areaWidth}px`
  area.style.height = `${areaHeight}px`
  const dim = `${areaWidth} x ${areaHeight}`
  console.log(`area size: ${dim}`)
  get('size').innerHTML = `${dim}`
}

function sizeImages() {
  // Size the image containers and the images.
  logStartupTime("sizeImages")

  let edge = 0
  cJson.images.forEach((image, ix) => {
    leftEdges.push(edge)

    // Size all the containers to the size of the area.
    const container = get(`c${ix+1}`)
    container.style.width = `${areaWidth}px`
    container.style.height = `${areaHeight}px`

    // Fit the images in the container.
    console.assert(image.width != 0)
    const fitScale = areaWidth / image.width
    const img = get(`i${ix+1}`)
    const scaledw = image.width * fitScale
    const scaledh = image.height * fitScale
    img.style.width = `${scaledw}px`
    img.style.height = `${scaledh}px`

    // Find the zoom point for the screen size.
    const [zoomPoint, distance] = getZoomPoint(image)

    // Scale and translate the image to the zoom point.
    const [w,h,s,x,y] = zoomPoint
    img.style.scale = s
    img.style.translate = `${x}px ${y}px`

    if (distance > closeDistance) {
      console.log(`No good zoom point found for image ${ix+1}, distance: ${distance}`)
      for (let ix = 0; ix < image.zoomPoints.length; ix++) {
        console.log(`zoom point: ${image.zoomPoints[ix]}`)
      }
    }

    // Log the image position information.
    const part1 = `i${ix+1}: ${image.width} x ${image.height}, `
    const part2 = `${w} x ${h} (${x}, ${y}) scale: ${two(s)} d: ${distance}`
    console.log(part1 + part2)

    edge += areaWidth
  })
}

function getZoomPoint(image) {
  // Return the close zoom point and distance away from it for the
  // given image.

  let zoomPoint = [areaWidth, areaHeight, 1, 0, 0]
  let distance = Math.abs(areaWidth - image.width) + Math.abs(areaHeight - image.height)
  if (distance == 0)
    return [zoomPoint, distance]

  for (let zix = 0; zix < image.zoomPoints.length; zix++) {
    const zp = image.zoomPoints[zix]
    const width = zp[0]
    const height = zp[1]

    // todo: don't need to test orientation, it's built into the distance check.
    // Only consider zoom points matching the screen orientation, either portrait or
    // landscape.
    if ((areaWidth > areaHeight && width > height) ||
        (areaWidth <= areaHeight && width <= height)) {
      const dist = Math.abs(areaWidth - width) + Math.abs(areaHeight - height)
      if (dist < closeDistance && dist < distance) {
        distance = dist
        zoomPoint = zp
        if (distance == 0)
          break
      }
    }
  }
  return [zoomPoint, distance]
}

// Timeout function used to determine when scrolling stops.
var scrollingTimeout

// True when scrolling has paused but the user is still touching.
var scrollingPaused

// When scrolling started.
var scrollStart

function areaScroll() {
  // When scolling stops, call handleScrollEnd.

  // Scrolling stops when no more scroll events happen within .35
  // seconds and a finger is not down. The .35 comes from
  // experimenting in safari. If the timeout value is too short, the
  // edge doesn't match up, but it will match eventually.

  if (scrollStart == null) {
    scrollStart = performance.now()
  }

  window.clearTimeout(scrollingTimeout)
  scrollingPaused = false
  scrollingTimeout = setTimeout(function() {
    if (touching) {
      console.log('Area scrolling has paused for a tenth of a second.')
      scrollingPaused = true
    }
    else {
      let seconds = (performance.now() - scrollStart) / 1000.0
      seconds = seconds.toFixed(3)
      console.log(`Area scrolling has stopped. ${seconds}s`)
      scrollStart = null
      handleScrollEnd()
    }
  }, 350)
}

// Finger touching the screen.
var touching = false

function handleScrollEnd() {
  // Area horizontal scrolling has stopped. area.scrollLeft contains
  // the ending position.

  const area = get("area")

  // Update the current image (imageIx) and the page details.
  let foundEdge = false
  const previousImageIx = imageIx
  for (let ix = 0; ix < leftEdges.length; ix++) {
    if (Math.round(area.scrollLeft) == leftEdges[ix]) {
      imageIx = ix
      console.log(`Scrolled to ${imageIx+1}`)
      foundEdge = true
      if (imageIx != previousImageIx)
        SetDetails()
      break
    }
  }
  if (!foundEdge) {
    console.log(`Edge not found: area.scrollLeft: ${two(area.scrollLeft)}, leftEdges: ${leftEdges}`)
  }
}

function SetDetails() {
  // Update the page details for the current image.

  const image = cJson.images[imageIx]
  get('title').innerHTML = image.title
  get('description').innerHTML = image.description
  get('keywords').innerHTML = image.keywords
  get('size').innerHTML = `${areaWidth} x ${areaHeight}`
}

function twoFingerDistance(event) {
  // Calculate distance between two fingers.
  return Math.hypot(event.touches[0].pageX - event.touches[1].pageX,
                    event.touches[0].pageY - event.touches[1].pageY)
}

function parseTranslate(translate) {
  // Parse the translate string and return x and y numbers.  This
  // assumes translate uses px units and 2d space. Returns [0, 0] on
  // error.

  // example: 0px -76px

  let x = 0
  let y = 0
  const parts = translate.split(" ")
  if (parts.length > 0)
    x = parseFloat(parts[0], 10)
  if (parts.length > 1)
    y = parseFloat(parts[1], 10)
  return [x, y]
}

function two(num) {
  // Return the number rounded to two decimal places.
  return num.toFixed(2)
}

// The startZoom object contains the zoom information when two fingers
// touch. The zoom object contains the zoom information as the fingers
// move around. Each contains the center point between the two fingers
// (x, y), the distance between them (distance), the scale of the
// image (scale) and the translation point of the image (translateX,
// translateY).

let startZoom = {}
let zoom = {}

// Whether we are zooming an image or not.
let zooming = false

window.addEventListener('touchstart', (event) => {

  touching = true

  if (event.touches.length != 2)
    return

  zooming = true

  // Disable the default browser zoom and pan behavior.
  event.preventDefault()
  const area = get("area")
  // area.setAttribute("overflow-x", "clip")

  // Get the point centered between the two fingers.
  startZoom.x = (event.touches[0].pageX + event.touches[1].pageX) / 2
  startZoom.y = (event.touches[0].pageY + event.touches[1].pageY) / 2

  // Get the distance between the two fingers.
  startZoom.distance = twoFingerDistance(event)

  console.log(`touchstart: finger center: (${startZoom.x}, ${startZoom.y}) distance apart: ${two(startZoom.distance)}`)

  // Get the initial translate x and y values of the current image.
  const imageId = `i${imageIx+1}`
  const img = get(imageId)
  const [x, y] = parseTranslate(img.style.translate)
  startZoom.translateX = x
  startZoom.translateY = y
  startZoom.scale = parseFloat(img.style.scale, 10)

  console.log(`touchstart: ${imageId} translation: (${x}, ${y}) scale: ${two(startZoom.scale)}`)
})

window.addEventListener('touchmove', (event) => {
  if (event.touches.length != 2)
    return

  if (!zooming)
    return

  // todo: is this needed?
  event.preventDefault()

  // Calculate the new image scale from the amount the fingers moved apart.
  // Limit the scale between .2 and 4.
  zoom.distance = twoFingerDistance(event)
  const scale = (zoom.distance / startZoom.distance) * startZoom.scale
  zoom.scale = Math.min(Math.max(.2, scale), 4)
  // console.log(`touchmove: distance: ${zoom.distance} ratio: ${ratio}`)

  // Calculate the image's translation point from how much the fingers
  // have moved on the X and Y axis.
  zoom.x = (event.touches[0].pageX + event.touches[1].pageX) / 2
  zoom.y = (event.touches[0].pageY + event.touches[1].pageY) / 2
  const deltaX = (zoom.x - startZoom.x)
  const deltaY = (zoom.y - startZoom.y)

  // todo: limit the translation point.
  zoom.translateX = startZoom.translateX + deltaX
  zoom.translateY = startZoom.translateY + deltaY
  // console.log(`touchmove: delta (${deltaX}, ${deltaY}) ${two(scale)}`)

  const img = get(`i${imageIx+1}`)
  img.style.scale = scale
  img.style.translate = `${zoom.translateX}px ${zoom.translateY}px`
}, {passive: false})

document.addEventListener('touchend', handleTouchend, false)
document.addEventListener('touchcancel', handleTouchend, false)

function handleTouchcancel(event) {
  console.log("touchcancel")
  handleTouchend(event)
}

function handleTouchend(event) {

  touching = false
  if (scrollingPaused) {
    console.log("touchend: finger up after pausing the scroll.")
    areaScroll()
  }

  if (zooming) {
    // todo: wait until double click to zoom is back to normal before
    // turning on touch actions.
    // const area = get("area")
    // area.removeAttribute("touch-action")

    console.log(`touchend: finger center: (${zoom.x}, ${zoom.y}) distance apart: ${two(zoom.distance)}`)
    console.log(`touchend: i${imageIx+1} translation: (${zoom.translateX}, ${zoom.translateY}) scale: ${two(zoom.scale)}`)

    // Log zoom point.
    // [1290, 2796, 3, 200.2, 700],
    const message1 = `zoom point for i${imageIx+1}: `
    const message2 = `[${areaWidth}, ${areaHeight}, ${two(zoom.scale)}, ${zoom.translateX}, ${zoom.translateY}]`
    console.log(message1 + message2)

    zooming = false
  }
}

screen.orientation.addEventListener("change", (event) => {
  const type = event.target.type;
  const angle = event.target.angle;
  console.log(`ScreenOrientation change: ${type}, ${angle} degrees.`);
  sizeImageArea()
  sizeImages()
})
