"use strict";

// Javascript for the image page.

// cJson is defined in the image html page.

// The current image index into the json list of images.
var imageIx = null

// The available screen area.
var areaWidth = null
var areaHeight = null

// The minimum amount of image to keep visible when zooming and
// panning.
var minVisible = null

// The left edges (scroll positions) of the images in the area.
var leftEdges = []

// The start time used for timing.
const startTime = performance.now()

window.addEventListener("load", loadEvent)

function logStartupTime(message, start) {
  // Log the elasped time since the start time.
  let seconds = (performance.now() - start) / 1000.0
  seconds = seconds.toFixed(3)
  log(`${seconds}s -- ${message}`)
}

function get(id) {
  // Get the dom element with the given id.
  return document.getElementById(id)
}

function log(message) {
  // Log the message to the console.
  console.log(message)
}

function logError(message) {
  // Log an error message to the console.
  console.error(message)
}

function two(num) {
  // Return the number rounded to two decimal places.
  return num.toFixed(2)
}

async function loadEvent() {
  // The page finished loading, setup and size things.
  logStartupTime(`loadEvent: json contains ${cJson.images.length} images`, startTime)

  // Disable the default browser zoom and pan behavior.
  get("image-page").setAttribute("touch-action", "none")

  setFirstImage()

  logStartupTime("sizeImageArea", startTime)
  sizeImageArea()

  logStartupTime("sizeImages", startTime)
  sizeImages()

  // Show the page.
  document.body.style.visibility = 'visible'
  document.body.style.opacity = 1

  logStartupTime("loadEvent Done", startTime)
}

function intDef(str, min, max, def) {
  // Parse the number string as an integer and validate it. Return the
  // value. If the value is less than the min or greater than the max,
  // return the default value.  When the str is not valid, return the
  // default value.
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
  log(`window.location.search = ${window.location.search}`)
  const searchParams = new URLSearchParams(window.location.search)
  const imageQ = searchParams.get("image")
  const imageNum = intDef(imageQ, 1, cJson.images.length, 0)
  log(`First image: ${imageNum}`)
  imageIx = imageNum - 1
}

function sizeImageArea() {
  // Size the image area to the size of the usable screen.

  // Get the available screen width and height and store them in
  // globals, areaWidth and areaHeight.

  // // Log some interesting sizes.
  // const sizes = [
  //   [window.innerWidth, window.innerHeight, 'window.innerWidth x ...innerHeight'],
  //   [window.screen.availWidth, window.screen.availHeight, 'window.screen.availWidth x ...availHeight'],
  //   [document.documentElement.clientWidth, document.documentElement.clientHeight,
  //     'document.documentElement.clientWidth x ...clientHeight'],
  //   [document.body.clientWidth, document.body.clientHeight, 'document.body.clientWidth x ...clientHeight'],
  // ]
  // sizes.forEach((size, ix) => {
  //   const [w, h, msg] = size
  //   log(`${w} x ${h}: ${msg}`)
  // })

  areaWidth = document.documentElement.clientWidth
  areaHeight = document.documentElement.clientHeight

  // On a PWA the apple-mobile-web-app-status-bar-style setting allows
  // the toolbar area to be used, however, the area width and height
  // doesn't see this extra space. On a pwa, add the extra area.
  // todo: how do you determine the toolbar height? replace the 60.
  if (window.matchMedia('(display-mode: standalone)').matches) {
    areaHeight += 60
    log("Add 60 to height for top bar")
  }

  minVisible = areaWidth / 4

  // Size the image area to the available screen area.
  const area = get("area")
  area.style.width = `${areaWidth}px`
  area.style.height = `${areaHeight}px`
  log(`Area size: ${areaWidth} x ${areaHeight}`)
}

function getZoomPoint(cjson=cJson) {
  // Return the zoom point for the given image index.
  const zoom_w_h = `${areaWidth}x${areaHeight}`
  const zoomPoints = cjson.zoomPoints[zoom_w_h]
  return zoomPoints[imageIx]
}

function sizeImages() {
  // Size the image containers and the images and create zoom points
  // when missing.

  let edge = 0
  leftEdges = []
  const zoom_w_h = `${areaWidth}x${areaHeight}`

  let zoomPoints
  const needZoomPoints = zoom_w_h in cJson.zoomPoints ? false : true
  if (needZoomPoints) {
    log("Creating zoom points")
    zoomPoints = []
    cJson.zoomPoints[zoom_w_h] = zoomPoints
  }
  else {
    zoomPoints = cJson.zoomPoints[zoom_w_h]
  }

  cJson.images.forEach((image, ix) => {
    if (image.width < areaWidth || image.height < areaHeight) {
      logError("small images are not supported")
    }

    // Save the position of the left edge of all the images.
    leftEdges.push(edge)

    // Size all the containers to the size of the area.
    const container = get(`c${ix+1}`)
    container.style.width = `${areaWidth}px`
    container.style.height = `${areaHeight}px`

    // Create or fetch the zoom point for the image.
    let zoomPoint
    if (needZoomPoints) {
      // Create a zoom point where the image fits the screen.
      zoomPoint = {}
      // Fit the long side to the container.
      if (image.width - areaWidth > image.height - areaHeight) {
        zoomPoint.scale = areaWidth / image.width
      } else {
        zoomPoint.scale = areaHeight / image.height
      }
      zoomPoint.tx = 0
      zoomPoint.ty = 0
      zoomPoints.push(zoomPoint)
    }
    else {
      zoomPoint = zoomPoints[ix]
    }

    // Set the image to its zoom point.
    const img = get(`i${ix+1}`)
    img.style.width = `${zoomPoint.width}px`
    img.style.height = `${zoomPoint.height}px`
    img.style.transformOrigin = "0px 0px"
    // Note: translate runs from right to left.
    img.style.transform = `translate(${zoomPoint.tx}px, ${zoomPoint.ty}px) scale(${zoomPoint.scale})`;

    // Log the zoom point.
    log(`i${ix+1}: ${areaWidth} x ${areaHeight}, ` +
                `scale: ${two(zoomPoint.scale)}, ` +
                `t: (${two(zoomPoint.tx)}, ${two(zoomPoint.ty)})`)

    edge += areaWidth
  })

  // Scroll the current image into view.
  const area = get("area")
  log(`Leftedge: ${leftEdges[imageIx]}`)
  area.scrollLeft = leftEdges[imageIx]
  log(`area.scrollLeft: ${two(area.scrollLeft)}`)
}

function SetDetails() {
  // Update the page details for the current image.

  const image = cJson.images[imageIx]
  get('title').innerHTML = image.title
  get('description').innerHTML = image.description
  get('size').innerHTML = `${areaWidth} x ${areaHeight}`
}

// Whether we are zooming an image or not.
let zooming = false

// The position when we started zooming and panning.
let start = {}

// The current touchmove position for zooming and panning.
let current = {}
let doubleClick = null

// Horizontal scrolling variables.
let horizontalScrolling = false;
let startScrollLeft;
let startScrollX;
let startScrollY;
let currentScrollLeft = 0;

window.addEventListener('touchstart', (event) => {

  // Remember the position incase we are starting to horizontal scroll.
  if (!horizontalScrolling) {
    startScrollLeft = area.scrollLeft;
    startScrollX = event.touches[0].clientX;
    startScrollY = event.touches[0].clientY;
    log(`touchstart: start scrolling ${imageIx+1}, startScrollLeft: ${startScrollLeft}`)
    // log(`touchstart: startScrollX: ${two(startScrollX)}`)
  }

  // Start timer on first click. If second click comes before .5
  // seconds, it’s a double click. Only consider one finger cases.
  if (event.touches.length == 1) {
    if (doubleClick !== null) {
      let seconds = (performance.now() - doubleClick) / 1000.0
      if (seconds < .5) {
        const event = new Event("restoreimage");
        window.dispatchEvent(event);
        doubleClick = null
        return
      }
    }
    doubleClick = performance.now()
  } else {
    doubleClick = null
  }

  // When not two fingers touching, return.
  if (event.touches.length != 2)
    return

  zooming = true

  // Disable the default browser zoom and pan behavior when two
  // fingers are down.
  event.preventDefault()

  // Log the client x and y values.
  const clientX0 = event.touches[0].clientX
  const clientX1 = event.touches[1].clientX
  const clientY0 = event.touches[0].clientY
  const clientY1 = event.touches[1].clientY
  // log(`touchstart: client0: (${clientX0}, ${clientY0}) client1: (${clientX1}, ${clientY1})`)

  const image = cJson.images[imageIx]
  const zoomPoint = getZoomPoint()

  // Save the point centered between the two fingers, the distance
  // between them, the current translation and the current scale.
  start.cx = (clientX0 + clientX1) / 2
  start.cy = (clientY0 + clientY1) / 2
  start.distance = Math.hypot(clientX0 - clientX1, clientY0 - clientY1)
  start.scale = zoomPoint.scale
  start.tx = zoomPoint.tx
  start.ty = zoomPoint.ty

  log(`i${imageIx+1}: touchstart: c: (${two(start.cx)}, ${two(start.cy)}) ` +
              `d: ${two(start.distance)}, scale: ${two(start.scale)}, ` +
              `t: (${two(start.tx)}, ${two(start.ty)})`)
})

window.addEventListener('restoreimage', (event) => {
  // Restore an image position and scale to its zoom point.
  log("Restore image to its zoom point.")

  // Get the original zoom point.
  const image = cJson.images[imageIx]
  let zoomPoint = getZoomPoint(cJson)
  const origZP = getZoomPoint(cJsonOriginal)
  log(`Zoom point: (${two(zoomPoint.tx)}, ${two(zoomPoint.ty)}), scale: ${two(zoomPoint.scale)}`)
  log(`Original zoom point: (${two(origZP.tx)}, ${two(origZP.ty)}), scale: ${two(origZP.scale)}`)

  // Animate the image to its original zoom point.
  const img = get(`i${imageIx+1}`)
  const animation = img.animate([
    { transform: `translate(${zoomPoint.tx}px, ${zoomPoint.ty}px) scale(${zoomPoint.scale})`},
    { transform: `translate(${origZP.tx}px, ${origZP.ty}px) scale(${origZP.scale})`},
  ],
  {
    duration: 300,
    iterations: 1,
  })
  animation.onfinish = (event) => {
    // Restore the current zoom point and set the finish size and
    // position.
    log("Restore image finished")
    zoomPoint.scale = origZP.scale;
    zoomPoint.tx = origZP.tx;
    zoomPoint.ty = origZP.ty;
    img.style.transform = `translate(${zoomPoint.tx}px, ${zoomPoint.ty}px) scale(${zoomPoint.scale})`;
  };
}, false)

window.addEventListener('touchmove', (event) => {
  // Zoom, pan and scroll the image.
  if (horizontalScrolling) {
    horizontalScrollMove(event)
    return
  }
  // Determine whether horizontal scrolling is starting.
  const dx = Math.abs(startScrollX - event.touches[0].clientX)
  const dy = Math.abs(startScrollY - event.touches[0].clientY)
  if (dx > dy) {
    horizontalScrolling = true;
    horizontalScrollMove(event)
    return
  }

  if (event.touches.length != 2)
    return

  // Disable the default browser zoom and pan behavior when two
  // fingers are down.
  event.preventDefault()

  if (!zooming)
    return

  const clientX0 = event.touches[0].clientX
  const clientX1 = event.touches[1].clientX
  const clientY0 = event.touches[0].clientY
  const clientY1 = event.touches[1].clientY
  // log(`touchmove: client0: (${clientX0}, ${clientY0}) client1: (${clientX1}, ${clientY1})`)

  const image = cJson.images[imageIx]
  const zoomPoint = getZoomPoint()

  current.cx = (clientX0 + clientX1) / 2
  current.cy = (clientY0 + clientY1) / 2
  current.distance = Math.hypot(clientX0 - clientX1, clientY0 - clientY1)
  current.scale = (current.distance / start.distance) * start.scale

  // Limit the scale to a maximum of 1 and a minimum that results in a
  // image not less than half the area width.
  if (current.scale > 1.0)
    current.scale = 1.0
  let newIw = image.width * current.scale
  let newIh = image.height * current.scale
  if (newIw < areaWidth / 2) {
    current.scale = (areaWidth / 2) / image.width
    newIw = image.width * current.scale
    newIh = image.height * current.scale
  }

  // Calculate the new image upper left hand corner based on the
  // center point between the two fingers and how far apart they are
  // compared to when zooming started.
  let movedCt = {};
  movedCt.cx = ((start.cx - start.tx) * current.scale) / start.scale + start.tx
  // log(`start.cx: ${start.cx}, start.tx: ${start.tx}, start.scale: ${start.scale}`)
  movedCt.cy = ((start.cy - start.ty) * current.scale) / start.scale + start.ty
  let tx = start.tx - (movedCt.cx - start.cx) + (current.cx - start.cx)
  let ty = start.ty - (movedCt.cy - start.cy) + (current.cy - start.cy)

  // Keep some of the image visible.
  if (tx > areaWidth - minVisible) {
    tx = areaWidth - minVisible
  }
  if (ty > areaHeight - minVisible) {
    ty = areaHeight - minVisible
  }
  const rightEdge = tx + newIw
  if (rightEdge < minVisible) {
    tx = minVisible - newIw
  }
  const bottomEdge = ty + newIh
  if (bottomEdge < minVisible) {
    ty = minVisible - newIh
  }

  zoomPoint.scale = current.scale;
  zoomPoint.tx = tx;
  zoomPoint.ty = ty;

  const img = get(`i${imageIx+1}`)
  // Note: translate runs from right to left.
  img.style.transform = `translate(${zoomPoint.tx}px, ${zoomPoint.ty}px) scale(${zoomPoint.scale})`;

}, {passive: false})

document.addEventListener('touchend', handleTouchend, false)
document.addEventListener('touchcancel', handleTouchend, false)

function handleTouchcancel(event) {
  log("Touchcancel")
  handleTouchend(event)
}

function handleTouchend(event) {
  if (horizontalScrolling) {
    horizontalScrollEnd(event)
    return
  }

  if (zooming) {
    zooming = false

    const image = cJson.images[imageIx]
    const zoomPoint = getZoomPoint()
    log(`i${imageIx+1}: touchend: c: (${two(current.cx)}, ${two(current.cy)}) ` +
              `d: ${two(current.distance)}, scale: ${two(zoomPoint.scale)}, ` +
              `t: (${two(zoomPoint.tx)}, ${two(zoomPoint.ty)})`)
  }
}

screen.orientation.addEventListener("change", (event) => {
  // When the phone orientation changes, update the image area and
  // size the images.
  const start = performance.now()
  const type = event.target.type;
  const angle = event.target.angle;
  logStartupTime(`ScreenOrientation change: ${type}, ${angle} degrees.`, start);
  sizeImageArea()
  logStartupTime("sizeImages", start)
  sizeImages()
  logStartupTime("ScreenOrientation done", start)
})

function copyJson() {
  // Copy the json data to the clipboard.
  log("Copy json to the clipboard");
  const msg = JSON.stringify(cJson, null, 2)
  navigator.clipboard.writeText(msg);
}

function horizontalScrollMove(event) {
  event.preventDefault();
  const currentScrollX = event.touches[0].clientX;
  currentScrollLeft = startScrollLeft + startScrollX - currentScrollX

  // // Limit movement to one page.
  const before = startScrollLeft - areaWidth
  const after = startScrollLeft + areaWidth
  if (currentScrollLeft < before)
    currentScrollLeft = before;
  else if (currentScrollLeft > after)
    currentScrollLeft = after;

  if (currentScrollLeft <= 0) {
    currentScrollLeft = 0;
  }

  const area = get("area")
  area.scrollLeft = currentScrollLeft;
}

function horizontalScrollEnd(event) {
  const area = get("area")
  log(`ScrollEnd: currentScrollLeft: ${two(currentScrollLeft)}`);

  // Scroll to the left edge of the next, previous or current page.
  let addition;
  if (currentScrollLeft > startScrollLeft + areaWidth / 2) {
    addition = areaWidth;
  } else if (currentScrollLeft < startScrollLeft - areaWidth / 2) {
    addition = -areaWidth;
  } else {
    addition = 0;
  }
  // log(`ScrollEnd: addition: ${addition}`);

  const startLeft = currentScrollLeft;
  const finishLeft = startScrollLeft + addition;

  if (area.scrollLeft == finishLeft) {
    scrollDone()
    return
  }

  log(`ScrollEnd: animate from ${two(startLeft)} to ${finishLeft}`);

  // The maximum time for the animation.
  const maxDuration = 1.5;

  // The frame rate as frames per second.
  const framesPerSec = 30;

  // The maximum distance is half the screen width.  If you scroll
  // past the middle, you go to the next image and less than half you
  // go back.
  const maxDistance = areaWidth / 2;
  const maxFrames = maxDuration * framesPerSec;
  // log(`ScrollEnd: maxDuration: ${maxDuration}, framesPerSec: ${framesPerSec}, ` +
  //     `maxDistance: ${maxDistance}, maxFrames: ${maxFrames}`);

  // Scroll at the same rate no matter the distance. Use the ratio of
  // max frames to max distance equal to the ratio of the frames to
  // the distance.
  const distance = Math.abs(finishLeft - startLeft)
  const frames = (distance * maxFrames) / maxDistance;
  // log(`ScrollEnd: distance: ${two(distance)}, frames: ${two(frames)}`);

  // Get the distances to animate.
  let distancesIndex = 0;
  const frameDistances = distanceList(startLeft, finishLeft, frames);
  // log(`frameDistances: ${frameDistances}`);

  // Determine the duration of the animation in seconds.
  const duration = frames / framesPerSec;
  log(`ScrollEnd: number of frames: ${frameDistances.length}, duration: ${two(duration)} seconds`);

  // Animate to the new scroll position.
  const annimationId = setInterval(animateScrollLeft, duration / 1000);
  function animateScrollLeft() {
    // Set the area scroll position and stop scrolling after the last
    // frame.
    if (distancesIndex >= frameDistances.length) {
      clearInterval(annimationId);
      scrollDone()
    } else {
      area.scrollLeft = frameDistances[distancesIndex];
      distancesIndex += 1;
    }
  }

  function scrollDone() {
    // Scrolling has finished.  Update the image index and the page details.

    // Set the image index to the image we scrolled to.
    const ix = leftEdges.indexOf(area.scrollLeft)
    if (ix == -1)
      logError(`area.scrollLeft ${area.scrollLeft} was not found.`)
    else {
      if (imageIx == ix) {
        log(`ScrollEnd: scrolled back to the original item ${imageIx+1}.`)
      }
      else {
        imageIx = ix
        log(`ScrollEnd: scroll done: area.scrollLeft: ${area.scrollLeft}, image: ${imageIx+1}`);
        SetDetails()
      }
    }
    horizontalScrolling = false;
  }
}

function distanceList(start, finish, numberSteps) {
  // Evenly Divide the start to finish range into the given number of
  // steps. Don't include the start and always include the finish.
  let steps = [];
  const range = finish - start;
  if (numberSteps > 1 && Math.abs(range) > 1) {
    let step = range / numberSteps;
    for (let ix = 1; ix < numberSteps - 1; ix++) {
      steps.push(Math.round(start + step * ix));
    }
  }
  steps.push(finish);
  return steps;
}
