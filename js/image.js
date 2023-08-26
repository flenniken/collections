// image.js
"use strict";

// cJson is defined in the image html page.

// The image index into the json collection of the image we are
// currently viewing.
var imageIx = null

// The available screen area.
var areaWidth = null
var areaHeight = null

// The left edges (scroll positions) of the images in the area.
var leftEdges = null

// Consider zoom point this close.
const closeDistance = 100

window.addEventListener("load", loadEvent)

// The start time used for startup timing.
const startTime = performance.now()

function logStartupTime(message) {
  let seconds = (performance.now() - startTime) / 1000.0
  seconds = seconds.toFixed(3)
  console.log(`${seconds}s -- ${message}`)
}

function get(id) {
  // Get the dom element with the given id.
  return document.getElementById(id)
}

async function loadEvent() {
  // The page finished loading, load json and size things.
  logStartupTime(`loadEvent: json contains ${cJson.images.length} images`)

  setFirstImage()

  logStartupTime("sizeImageArea")
  sizeImageArea()

  logStartupTime("sizeImages")
  sizeImages()

  // Show the page.
  document.body.style.visibility = 'visible'
  document.body.style.opacity = 1

  // Watch the area scroll and scroll end events.
  area.addEventListener('scroll', areaScroll, false)
  area.addEventListener('scrollend', () => {
    // Once the scrollend event is supported in the browsers you can
    // replace the code that figures out when scrolling ends.
    console.log("areaScrollEnd event exists!")
  })

  // Disable the default browser zoom and pan behavior.
  area.setAttribute("touch-action", "none")

  logStartupTime("loadEvent Done")
}

function intDef(str, min, max, def) {
  // Parse the number string as an integer and validate it. Return the
  // value. When the str is not valid, return the default value.
  const value = parseInt(str, 10)
  if (isNaN(value))
    return def
  if (value < min || value > max)
    return def
  return value
}

function setFirstImage() {
  // Set the first image to show based on the url image query
  // parameter.
  console.log(`window.location.search = ${window.location.search}`)
  const searchParams = new URLSearchParams(window.location.search)
  const imageQ = searchParams.get("image")
  const imageNum = intDef(imageQ, 1, cJson.images.length, 0)
  console.log(`first image: ${imageNum}`)
  imageIx = imageNum - 1
}

function sizeImageArea() {
  // Size the image area to the size of the usable screen.

  // Get the screen width and height that we can use and store them in
  // globals.
  console.log(`window.innerWidth: ${window.innerWidth}`)
  console.log(`window.innerHeight: ${window.innerHeight}`)

  console.log(`document.documentElement.clientWidth: ${document.documentElement.clientWidth}`)
  console.log(`document.documentElement.clientHeight: ${document.documentElement.clientHeight}`)

  console.log(`document.body.clientWidth: ${document.body.clientWidth}`)
  console.log(`document.body.clientHeight: ${document.body.clientHeight}`)

  areaWidth = document.documentElement.clientWidth
  areaHeight = document.documentElement.clientHeight

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

  let edge = 0
  leftEdges = []
  cJson.images.forEach((image, ix) => {
    leftEdges.push(edge)

    // Size all the containers to the size of the area.
    const container = get(`c${ix+1}`)
    container.style.width = `${areaWidth}px`
    container.style.height = `${areaHeight}px`

    // Fit the images in the container.
    // todo: account for the case where the height doesn't fit.
    console.assert(image.width != 0)
    const fitScale = areaWidth / image.width
    const img = get(`i${ix+1}`)
    const scaledw = image.width * fitScale
    const scaledh = image.height * fitScale
    img.style.width = `${scaledw}px`
    img.style.height = `${scaledh}px`

    // Find the zoom point for the screen size.
    const [zoomPoint, xDistance, yDistance] = getZoomPoint(image)

    // Scale and translate the image to the zoom point.
    img.style.scale = zoomPoint.scale
    img.style.translate = `${zoomPoint.translateX}px ${zoomPoint.translateY}px`

    // Log the image position information.
    const part1 = `i${ix+1}: ${image.width} x ${image.height}, `
    const part2 = `zp: ${zpStr(zoomPoint)} d: ${xDistance}, ${xDistance}`
    console.log(part1 + part2)

    edge += areaWidth
  })

  // Scroll the current image into view.
  const area = get("area")
  console.log(`leftEdge: ${leftEdges[imageIx]}`)
  area.scrollLeft = leftEdges[imageIx]
  console.log(`area.scrollLeft: ${two(area.scrollLeft)}`)
}

function getZoomPoint(image) {
  // Return the closest close zoom point and (x, y) distance away.  If
  // no close zoom point, return the default 1, 0, 0.

  let zoomPoint =  newZp(areaWidth, areaHeight, 1, 0, 0, 0, 0, 0)

  let xDistance = closeDistance+1
  let yDistance = closeDistance+1
  for (let zpt of image.zoomPoints) {
    const xDist = Math.abs(areaWidth - zpt.w)
    const yDist = Math.abs(areaHeight - zpt.h)

    if (xDist < closeDistance && yDist < closeDistance) {
      let combined = xDist + yDist
      if (combined < xDistance + yDistance) {
        xDistance = xDist
        yDistance = yDist

        zoomPoint = zpt
        zoomPoint.centerX = 0
        zoomPoint.centerY = 0
        zoomPoint.distance = 0

        if (combined == 0)
          break
      }
    }
  }
  return [zoomPoint, xDistance, yDistance]
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
  // the ending position. Update the current image and the page
  // details.

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
  get('size').innerHTML = `${areaWidth} x ${areaHeight}`
}

function twoFingerDistance(event) {
  // Calculate distance between two touching fingers.
  return Math.hypot(event.touches[0].pageX - event.touches[1].pageX,
                    event.touches[0].pageY - event.touches[1].pageY)
}

function parseTranslate(translate) {
  // Parse the translate style string and return x and y numbers.
  // This assumes translate uses px units and 2d space. Returns [0, 0]
  // on error.

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
// move around.
//
// w -- width of the screen
// h -- height of the screen
// scale -- scale of the image
// (translateX, translateY) -- translation point
// (centerX, centerY) - center point
// distance -- distance between the two touch points

let startZoom = {}
let endZoom = {}

// todo: center and distance are temporary and shouldn't be stored in
// the JSON data zoom points.
function newZp(w, h, scale, translateX, translateY, centerX, centerY, distance) {
  // Return a new zoom point.
  return  {
    "w": w,
    "h": h,
    "scale": scale,
    "translateX": translateX,
    "translateY": translateY,
    "centerX": centerX,
    "centerY": centerY,
    "distance": distance,
  }
}

function zpStr(zp) {
  // Return a string representation of a zoom point.
  // not shown: center and distance.

  return `${zp.w} x ${zp.h}, scale: ${two(zp.scale)}, (${zp.translateX} x ${zp.translateY})`
}

// Whether we are zooming an image or not.
let zooming = false

window.addEventListener('touchstart', (event) => {

  touching = true

  // When not two fingers touching, return.
  if (event.touches.length != 2)
    return

  zooming = true

  // Disable the default browser zoom and pan behavior.
  event.preventDefault()
  const area = get("area")
  // area.setAttribute("overflow-x", "clip")

  endZoom.w = startZoom.w = areaWidth
  endZoom.h = startZoom.h = areaHeight

  // Get the point centered between the two fingers.
  startZoom.centerX = (event.touches[0].pageX + event.touches[1].pageX) / 2
  startZoom.centerY = (event.touches[0].pageY + event.touches[1].pageY) / 2

  // Get the distance between the two fingers.
  startZoom.distance = twoFingerDistance(event)

  console.log(`touchstart: finger center: (${startZoom.centerX}, ${startZoom.centerY}) distance apart: ${two(startZoom.distance)}`)

  // Get the initial translate x and y values of the current image.
  const imageId = `i${imageIx+1}`
  const img = get(imageId)
  const [x, y] = parseTranslate(img.style.translate)
  startZoom.translateX = x
  startZoom.translateY = y
  startZoom.scale = parseFloat(img.style.scale, 10)

  console.log(`touchstart: i${imageIx+1} startZoom: ${zpStr(startZoom)}`)
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
  // todo: limit the max scale to not exceed the image resolution.
  // todo: limit the min scale to not go below 100 pixel width.
  endZoom.distance = twoFingerDistance(event)
  const scale = (endZoom.distance / startZoom.distance) * startZoom.scale
  endZoom.scale = Math.min(Math.max(.2, scale), 4)
  // console.log(`touchmove: distance: ${endZoom.distance} ratio: ${ratio}`)

  // Calculate the image's translation point from how much the fingers
  // have moved on the X and Y axis.
  endZoom.centerX = (event.touches[0].pageX + event.touches[1].pageX) / 2
  endZoom.centerY = (event.touches[0].pageY + event.touches[1].pageY) / 2
  const deltaX = (endZoom.centerX - startZoom.centerX)
  const deltaY = (endZoom.centerY - startZoom.centerY)

  // todo: limit the translation point to keep the image visible on the screen.
  endZoom.translateX = startZoom.translateX + deltaX
  endZoom.translateY = startZoom.translateY + deltaY
  // console.log(`touchmove: delta (${deltaX}, ${deltaY}) ${two(scale)}`)

  const img = get(`i${imageIx+1}`)
  img.style.scale = scale
  img.style.translate = `${endZoom.translateX}px ${endZoom.translateY}px`
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
    // todo: leave it off?
    // turning on touch actions.
    // const area = get("area")
    // area.removeAttribute("touch-action")

    console.log(`touchend: finger center: (${endZoom.centerX}, ${endZoom.centerY}) distance apart: ${two(endZoom.distance)}`)
    console.log(`touchend: i${imageIx+1} endZoom: ${zpStr(endZoom)}`)
    zooming = false
  }
}

screen.orientation.addEventListener("change", (event) => {
  // When the phone orientation changes, update the image area and
  // size the images.
  const type = event.target.type;
  const angle = event.target.angle;
  console.log(`ScreenOrientation change: ${type}, ${angle} degrees.`);
  sizeImageArea()
  sizeImages()
})

function different(a, b, delta) {
  return !same(a, b, delta)
}

function same(a, b, delta) {
  // Return true when a is close to b.
  console.assert(!isNaN(a))
  console.assert(!isNaN(b))
  return Math.abs(a - b) < delta
}

function saveZoomPoints() {
  // Log the json data with the UI zoom points in it.

  console.log("saveZoomPoints");

  // Get each image's UI zoom point from the UI.
  let uiZoomPoints = []
  // console.log("ui zoom points:")
  for (let ix = 0; ix < cJson.images.length; ix++) {
    let img = get(`i${ix+1}`)
    let scale = parseFloat(img.style.scale, 10)
    let [x, y] = parseTranslate(img.style.translate)
    let uiZp = newZp(areaWidth, areaHeight, scale, x, y, 0, 0, 0)
    uiZoomPoints.push(uiZp)
    // console.log(`uiZp ${ix+1}: ${zpStr(uiZp)}`)
  }

  // Merge in the UI zoom points into a copy of the existing json
  // data.  If the ui zoom point is not the default, add it to the
  // zoom points.  Replace the existing zoom point when the width and
  // height are the same. Tell when the json changes or not.
  const data = structuredClone(cJson);
  let changed = false
  for (let ix = 0; ix < data.images.length; ix++) {
    // Get the image UI zoom point.
    const uiZp = uiZoomPoints[ix]

    // Skip default zoom points values.
    if (uiZp.translateX == 0 && uiZp.translateY == 0 && uiZp.scale == 1)
      continue

    // Loop over the image zoom points and build a new list of
    // them. If one of image zoom points has the same width and height
    // as the UI zoom point, use the UI zoom point replacing that
    // image zoom point.
    let newZoomPoints = []
    let foundSameDim = false
    const imageZoomPoints = data.images[ix].zoomPoints
    for (let zpIx = 0; zpIx < imageZoomPoints.length; zpIx++) {
      let zpt = imageZoomPoints[zpIx]

      let zp = {}
      zp = zpt
      zp.centerX = 0
      zp.centerY = 0
      zp.distance = 0

      // When the dimensions are the same, use the UI zoom point if it is different.
      let sameDim = (same(zp.w, uiZp.w, .01) && same(zp.h, uiZp.h, .01))
      if (sameDim) {
        let differentZoom = (different(zp.translateX, uiZp.translateX, .01) ||
            different(zp.translateY, uiZp.translateY, .01) ||
            different(zp.scale, uiZp.scale, .01))

        foundSameDim = true
        if (differentZoom) {
          newZoomPoints.push(uiZp)
          console.log("use UI zoom point:")
          console.log(`image ${ix+1},  zp ${zpIx+1}: ${zpStr(zp)}`)
          console.log(`image ${ix+1}, UI zp: ${zpStr(uiZp)}`)
          console.log("")
          changed = true
        }
        else {
          // console.log("use image zoom point")
          newZoomPoints.push(zp)
        }
      }
      else {
        // console.log("use image zoom point")
        newZoomPoints.push(zp)
      }
    }
    // When the ui dimensions didn't match any of the image zoom
    // points, add it to the image list.
    if (!foundSameDim){
      console.log("add new ui zoom point:")
      console.log(`image ${ix+1}, UI zp: ${zpStr(uiZp)}`)
      console.log("")
      newZoomPoints.push(uiZp)
      changed = true
    }
    data.images[ix].zoomPoints = newZoomPoints
  }

  if (changed) {
    // Log the json data.
    console.log("the json was changed")
    console.log(JSON.stringify(data, null, 2))
  }
  else
    console.log("json unchanged")
}
