"use strict";

// Javascript for the image page.

// cJson and cJsonOriginal are defined in the image html page.

// The current image index into the json list of images.
let imageIx = null

// The available screen area.
let availWidth = null
let availHeight = null

// The area element.
let area = null

window.addEventListener("load", handleLoad)
window.addEventListener('touchstart', handleTouchStart)
window.addEventListener('restoreimage', handleRestoreImage, false)
window.addEventListener('touchmove', handleTouchMove, {passive: false})
window.addEventListener("resize", handleResize);
document.addEventListener('touchend', handleTouchEnd, false)
document.addEventListener('touchcancel', handleTouchCancel, false)
screen.orientation.addEventListener("change", handleChange)

class Timer {
  // Time how long code takes to run, accurate to about thousands of a
  // second.  Note: use date() instead of performance() for
  // microseconds accuracy.
  constructor() {
    this.start = performance.now()
  }
  seconds() {
    return (performance.now() - this.start) / 1000.0
  }
  log(message) {
    const sec3 = three(this.seconds())
    log(`${sec3}s ----- ${message}`)
  }
}

// The start time used for timing.
const startTimer = new Timer()

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

function three(num) {
  // Return the number rounded to three decimal places.
  return num.toFixed(3)
}

async function handleLoad() {
  // The page finished loading, setup and size things.
  startTimer.log(`load event; the collection contains ${cJson.images.length} images`)

  area = get("area")

  // Disable the default browser zoom and pan behavior.
  get("images").setAttribute("touch-action", "none")

  setFirstImage()

  startTimer.log("setAvailableArea")
  setAvailableArea()

  startTimer.log("sizeImages")
  sizeImages()

  // Show the page.
  document.body.style.visibility = 'visible'
  document.body.style.opacity = 1

  startTimer.log("load Done")
}

function setFirstImage() {
  // Set the first image to show based on the url image query
  // parameter.

  // Get the image query string.
  log(`window.location.search: ${window.location.search}`)
  const searchParams = new URLSearchParams(window.location.search)
  const queryStr = searchParams.get("image")
  log(`Image query string: ${queryStr}`)

  // Set the first image index.
  const imageNum = parseInt(queryStr, 10)
  if (!isNaN(imageNum) && imageNum >= 1 && imageNum <= cJson.images.length)
    imageIx = imageNum - 1
  else
    imageIx = 0
  log(`First image: ${imageIx + 1}`)
}

function setAvailableArea() {
  // Size the image area to the size of the usable screen. Return
  // false when the size did not change.

  // Get the available screen width and height and store them in
  // globals, availWidth and availHeight.
  const availW = document.documentElement.clientWidth
  let availH = document.documentElement.clientHeight

  // On a PWA the apple-mobile-web-app-status-bar-style setting allows
  // the toolbar area to be used, however, the area width and height
  // doesn't see this extra space. On a pwa, add the extra area.
  // todo: how do you determine the toolbar height? replace the 60.
  if (availH > availW && window.matchMedia(
      '(display-mode: standalone)').matches) {
    availH += 60
    log("Add 60 to height for the top bar.")
  }

  // Check whether the size changed.
  if (availW == availWidth && availH == availHeight) {
    log(`Available size is the same: ${availWidth} x ${availHeight}`)
    return false
  }

  availWidth = availW
  availHeight = availH

  zpan.minVisible = availWidth / 4

  // Size the image area to the available screen area.
  area.style.width = `${availWidth}px`
  // area.style.height = `${availHeight}px`
  log(`Available screen size: ${availWidth} x ${availHeight}`)
  return true
}

function getZoomPoint(cjson=cJson) {
  // Return the zoom point for the current image index.
  const zoom_w_h = `${availWidth}x${availHeight}`
  const zoomPoints = cjson.zoomPoints[zoom_w_h]
  return zoomPoints[imageIx]
}

function sizeImages() {
  // Size the image containers and the images and create zoom points
  // when missing.

  let edge = 0
  const zoom_w_h = `${availWidth}x${availHeight}`

  let zoomPoints
  const needZoomPoints = zoom_w_h in cJson.zoomPoints ? false : true
  if (needZoomPoints) {
    log("No zoom points for this size, create new zoom points.")
    log(`Existing zoom points: ${Object.keys(cJson.zoomPoints)}`)
    zoomPoints = []
    cJson.zoomPoints[zoom_w_h] = zoomPoints
  }
  else {
    zoomPoints = cJson.zoomPoints[zoom_w_h]
  }

  hscroll.leftEdges.length = 0
  log("Image zoom points:")
  cJson.images.forEach((image, ix) => {
    if (image.width < availWidth || image.height < availHeight) {
      logError("small images are not supported")
    }

    // Save the position of the left edge of all the images.
    hscroll.leftEdges.push(edge)

    const colbox = get(`cb${ix+1}`)
    colbox.style.width = `${availWidth}px`

    // Size all the containers to the size of the area.
    const container = get(`c${ix+1}`)
    container.style.width = `${availWidth}px`
    container.style.height = `${availHeight}px`

    // Create or fetch the zoom point for the image.
    let zoomPoint
    if (needZoomPoints) {
      // Create a zoom point where the image fits the screen.
      zoomPoint = {}
      // Fit the long side to the container.
      if (image.width - availWidth > image.height - availHeight) {
        zoomPoint.scale = availWidth / image.width
      } else {
        zoomPoint.scale = availHeight / image.height
      }
      zoomPoint.tx = 0
      zoomPoint.ty = 0
      zoomPoints.push(zoomPoint)
    }
    else {
      zoomPoint = zoomPoints[ix]
    }

    // Size the image to its zoom point.
    const img = get(`i${ix+1}`)
    img.style.width = `${zoomPoint.width}px`
    img.style.height = `${zoomPoint.height}px`
    img.style.transformOrigin = "0px 0px"
    // Note: translate runs from right to left.
    img.style.transform = `translate(${zoomPoint.tx}px, ${zoomPoint.ty}px) scale(${zoomPoint.scale})`;

    // Log the zoom point.
    log(`i${ix+1}: ${availWidth} x ${availHeight}, ` +
                `scale: ${two(zoomPoint.scale)}, ` +
                `t: (${two(zoomPoint.tx)}, ${two(zoomPoint.ty)})`)

    edge += availWidth
  })

  // Scroll the current image into view.
  area.scrollLeft = hscroll.leftEdges[imageIx]
  log(`area.scrollLeft: ${area.scrollLeft}`)
  log(`hscroll.leftEdges: ${hscroll.leftEdges}`)
}

// Zoom and pan variables.
let zpan = {
  // The minimum amount of image to keep visible when zooming and
  // panning.
  "minVisible": null,

  // Whether we are zooming an image or not.
  "zooming": false,
  // The position when we started zooming and panning.
  start: {},
  // The current touchmove position.
  current: {},
}

// A timer to detect a double touch.
let doubleClick = null

// Horizontal scrolling variables.
let hscroll = {
  // Flick the image when the scrolling speed is above this pixels per millisecond.
  "minFlick": 1.0,
  // The animation frames per second.
  "framesPerSec": 30,
  // The maximum number of seconds for the animation.
  "maxDuration": 1.5,
  // The number of pixels to scroll past the ends.
  // "extra": 50,


  "scrolling": false,
  // The left edges (x scroll positions) of the images in the area.
  "leftEdges": [],
  // The touch position when scrolling starts and ends.
  "startX": null,
  "startY": null,
  "currentX": null,
  // The touch times when scrolling starts and ends.
  "startXTime": null,
  "currentXTime": null,
  // The horizontal scroll positions when scrolling starts and ends.
  "startScrollLeft": null,
  "currentScrollLeft": 0,
}

function handleTouchStart(event) {
  // Handle the touchstart event.

  if (hscroll.scrolling)
    return

  // Remember the horizontal scroll position incase we are starting to
  // scroll.
  hscroll.startScrollLeft = area.scrollLeft;
  hscroll.currentX = hscroll.startX = event.touches[0].clientX;
  hscroll.currentXTime = hscroll.startXTime = performance.now()
  hscroll.startY = event.touches[0].clientY;
  log(`touchstart: scroll image: ${imageIx+1}, hscroll.startScrollLeft: ${hscroll.startScrollLeft}`)

  // Start timer on first click. If second click comes before .5
  // seconds, it’s a double click. Only consider one finger cases.
  if (event.touches.length == 1) {
    if (doubleClick !== null) {
      let seconds = doubleClick.seconds()
      if (seconds < .5) {
        const event = new Event("restoreimage");
        window.dispatchEvent(event);
        doubleClick = null
        return
      }
    }
    doubleClick = new Timer()
  } else {
    doubleClick = null
  }

  // When not two fingers touching, return.
  if (event.touches.length != 2)
    return

  zpan.zooming = true

  // Disable the default browser zoom and pan behavior when two
  // fingers are down.
  event.preventDefault()

  // Save the point centered between the two fingers, the distance
  // between them, the current translation and the current scale.
  const clientX0 = event.touches[0].clientX
  const clientX1 = event.touches[1].clientX
  const clientY0 = event.touches[0].clientY
  const clientY1 = event.touches[1].clientY
  zpan.start.cx = (clientX0 + clientX1) / 2
  zpan.start.cy = (clientY0 + clientY1) / 2
  zpan.start.distance = Math.hypot(clientX0 - clientX1, clientY0 - clientY1)
  const zoomPoint = getZoomPoint()
  zpan.start.scale = zoomPoint.scale
  zpan.start.tx = zoomPoint.tx
  zpan.start.ty = zoomPoint.ty

  const image = cJson.images[imageIx]
  log(`i${imageIx+1}: touchstart: c: (${two(zpan.start.cx)}, ${two(zpan.start.cy)}) ` +
              `d: ${two(zpan.start.distance)}, scale: ${two(zpan.start.scale)}, ` +
              `t: (${two(zpan.start.tx)}, ${two(zpan.start.ty)})`)
}

function handleRestoreImage(event) {
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
  }
}

function handleTouchMove(event) {
  // Zoom, pan and scroll the image.
  if (hscroll.scrolling) {
    horizontalScrollMove(event)
    return
  } else if (!zpan.zooming) {
    // Determine whether horizontal scrolling is starting.
    const dx = Math.abs(hscroll.startX - event.touches[0].clientX)
    const dy = Math.abs(hscroll.startY - event.touches[0].clientY)
    if (dx > dy) {
      hscroll.scrolling = true;
      doubleClick = null
      horizontalScrollMove(event)
      return
    }
  }

  if (event.touches.length != 2)
    return

  // Disable the default browser zoom and pan behavior when two
  // fingers are down.
  event.preventDefault()

  if (!zpan.zooming)
    return

  const clientX0 = event.touches[0].clientX
  const clientX1 = event.touches[1].clientX
  const clientY0 = event.touches[0].clientY
  const clientY1 = event.touches[1].clientY
  // log(`touchmove: client0: (${clientX0}, ${clientY0}) client1: (${clientX1}, ${clientY1})`)

  const image = cJson.images[imageIx]
  const zoomPoint = getZoomPoint()

  zpan.current.cx = (clientX0 + clientX1) / 2
  zpan.current.cy = (clientY0 + clientY1) / 2
  zpan.current.distance = Math.hypot(clientX0 - clientX1, clientY0 - clientY1)
  zpan.current.scale = (zpan.current.distance / zpan.start.distance) * zpan.start.scale

  // Limit the scale to a maximum of 1 and a minimum that results in a
  // image not less than half the area width.
  if (zpan.current.scale > 1.0)
    zpan.current.scale = 1.0
  let newIw = image.width * zpan.current.scale
  let newIh = image.height * zpan.current.scale
  if (newIw < availWidth / 2) {
    zpan.current.scale = (availWidth / 2) / image.width
    newIw = image.width * zpan.current.scale
    newIh = image.height * zpan.current.scale
  }

  // Calculate the new image upper left hand corner based on the
  // center point between the two fingers and how far apart they are
  // compared to when zooming started.
  let movedCt = {};
  movedCt.cx = ((zpan.start.cx - zpan.start.tx) * zpan.current.scale) / zpan.start.scale + zpan.start.tx
  // log(`zpan.start.cx: ${zpan.start.cx}, zpan.start.tx: ${zpan.start.tx}, zpan.start.scale: ${zpan.start.scale}`)
  movedCt.cy = ((zpan.start.cy - zpan.start.ty) * zpan.current.scale) / zpan.start.scale + zpan.start.ty
  let tx = zpan.start.tx - (movedCt.cx - zpan.start.cx) + (zpan.current.cx - zpan.start.cx)
  let ty = zpan.start.ty - (movedCt.cy - zpan.start.cy) + (zpan.current.cy - zpan.start.cy)

  // Keep some of the image visible.
  if (tx > availWidth - zpan.minVisible) {
    tx = availWidth - zpan.minVisible
  }
  if (ty > availHeight - zpan.minVisible) {
    ty = availHeight - zpan.minVisible
  }
  const rightEdge = tx + newIw
  if (rightEdge < zpan.minVisible) {
    tx = zpan.minVisible - newIw
  }
  const bottomEdge = ty + newIh
  if (bottomEdge < zpan.minVisible) {
    ty = zpan.minVisible - newIh
  }

  zoomPoint.scale = zpan.current.scale;
  zoomPoint.tx = tx;
  zoomPoint.ty = ty;

  const img = get(`i${imageIx+1}`)
  // Note: translate runs from right to left.
  img.style.transform = `translate(${zoomPoint.tx}px, ${zoomPoint.ty}px) scale(${zoomPoint.scale})`;

}

function handleTouchCancel(event) {
  log("touchcancel")
  handleTouchEnd(event)
}

function handleTouchEnd(event) {
  log("touchend")
  if (event.touches.length == 0 && hscroll.scrolling) {
    horizontalScrollEnd()
    return
  }

  if (zpan.zooming) {
    zpan.zooming = false

    const image = cJson.images[imageIx]
    const zoomPoint = getZoomPoint()
    log(`i${imageIx+1}: touchend: c: (${two(zpan.current.cx)}, ${two(zpan.current.cy)}) ` +
              `d: ${two(zpan.current.distance)}, scale: ${two(zoomPoint.scale)}, ` +
              `t: (${two(zoomPoint.tx)}, ${two(zoomPoint.ty)})`)
  }
}

function logJson() {
  // Log the current json.
  const msg = JSON.stringify(cJson, null, 2)
  log(msg)

  // log("Copy json to the clipboard");
  // navigator.clipboard.writeText(msg);
}

function horizontalScrollMove(event) {
  event.preventDefault();

  hscroll.currentXTime = performance.now()
  hscroll.currentX = event.touches[0].clientX;
  hscroll.currentScrollLeft = hscroll.startScrollLeft + hscroll.startX - hscroll.currentX

  // scrollLeft cannot go past the ends so no need to adjust it.
  area.scrollLeft = hscroll.currentScrollLeft;
}

function horizontalScrollEnd() {
  // If the last move was big and fast, flick the image to the next
  // one.
  const hDuration = hscroll.currentXTime  - hscroll.startXTime
  const dx = hscroll.currentX - hscroll.startX
  const pps = dx / hDuration
  log(`ScrollEnd: pps: ${two(pps)}, dx: ${dx}, hDuration: ${three(hDuration/1000)}s`)
  log(`ScrollEnd: hscroll.currentScrollLeft: ${two(hscroll.currentScrollLeft)}`);
  log(`ScrollEnd: hscroll.currentX: ${hscroll.currentX}, hscroll.startX: ${hscroll.startX},  ` +
      `hscroll.currentXTime: ${Math.floor(hscroll.currentXTime)}, ` +
      `hscroll.startXTime: ${Math.floor(hscroll.startXTime)}`)
  const flick = (Math.abs(pps) > hscroll.minFlick)

  // Scroll to the left edge of the next, previous or current page.
  let addition;
  if (flick) {
    log("Flick the image.")
    addition = (dx > 0) ? -availWidth : availWidth
  } else if (hscroll.currentScrollLeft > hscroll.startScrollLeft + availWidth / 2) {
    addition = availWidth;
  } else if (hscroll.currentScrollLeft < hscroll.startScrollLeft - availWidth / 2) {
    addition = -availWidth;
  } else {
    addition = 0;
  }
  // log(`ScrollEnd: addition: ${addition}`);

  const startLeft = hscroll.currentScrollLeft;
  const finishLeft = hscroll.startScrollLeft + addition;

  if (area.scrollLeft == finishLeft) {
    scrollDone()
    return
  }

  log(`ScrollEnd: animate from ${two(startLeft)} to ${finishLeft}`);

  // The maximum distance is half the screen width.  If you scroll
  // past the middle, you go to the next image and less than half you
  // go back.
  const maxDistance = availWidth / 2;
  const maxFrames = hscroll.maxDuration * hscroll.framesPerSec;

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
  const duration = frames / hscroll.framesPerSec;
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
    // Scrolling has finished.  Update the image index.

    // Set the image index to the image we scrolled to.
    const ix = hscroll.leftEdges.indexOf(area.scrollLeft)
    if (ix == -1)
      logError(`area.scrollLeft ${area.scrollLeft} was not found.`)
    else {
      if (imageIx == ix) {
        log(`ScrollEnd: scrolled back to the original item ${imageIx+1}.`)
      }
      else {
        imageIx = ix
        log(`ScrollEnd: scroll done: area.scrollLeft: ${area.scrollLeft}, image: ${imageIx+1}`);
      }
    }
    hscroll.scrolling = false;
  }
}

function distanceList(start, finish, numberSteps) {
  // Evenly divide the start to finish range into the given number of
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

function handleChange(event) {
  const type = event.target.type;
  const angle = event.target.angle;
  log(`change: ${type}, ${angle} degrees.`)
}

function handleResize() {
  // When the phone orientation changes, update the image area and
  // size the images.
  const start = new Timer()
  start.log("resize")

  const changed = setAvailableArea()
  if (changed) {
    start.log("sizeImages")
    sizeImages()
  }
  start.log("resize  done")
}
