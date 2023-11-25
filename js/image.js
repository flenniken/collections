"use strict";

// Javascript for the image page.

// cJson and cJsonOriginal are defined in the image html page.

// The current image index into the json list of images.
let imageIx = null

// The available screen area.
let areaWidth = null
let areaHeight = null

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
  // Time how many seconds code takes to run.
  constructor() {
    this.start = performance.now()
  }
  seconds() {
    return (performance.now() - this.start) / 1000.0
  }
  log(message) {
    const sec3 = this.seconds().toFixed(3)
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

async function handleLoad() {
  // The page finished loading, setup and size things.
  startTimer.log(`load: the collection contains ${cJson.images.length} images`)

  area = get("area")

  // Disable the default browser zoom and pan behavior.
  get("image-page").setAttribute("touch-action", "none")

  setFirstImage()

  startTimer.log("sizeImageArea")
  sizeImageArea()

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
  if (areaHeight > areaWidth && window.matchMedia(
      '(display-mode: standalone)').matches) {
    areaHeight += 60
    log("Add 60 to height for top bar")
  }

  zpan.minVisible = areaWidth / 4

  // Size the image area to the available screen area.
  area.style.width = `${areaWidth}px`
  area.style.height = `${areaHeight}px`
  log(`Area size: ${areaWidth} x ${areaHeight}`)
}

function getZoomPoint(cjson=cJson) {
  // Return the zoom point for the current image index.
  const zoom_w_h = `${areaWidth}x${areaHeight}`
  const zoomPoints = cjson.zoomPoints[zoom_w_h]
  return zoomPoints[imageIx]
}

function sizeImages() {
  // Size the image containers and the images and create zoom points
  // when missing.

  let edge = 0
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

  hscroll.leftEdges.length = 0
  log("Image zoom points:")
  cJson.images.forEach((image, ix) => {
    if (image.width < areaWidth || image.height < areaHeight) {
      logError("small images are not supported")
    }

    // Save the position of the left edge of all the images.
    hscroll.leftEdges.push(edge)

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

    // Size the image to its zoom point.
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
  log(`Current image left edge: ${hscroll.leftEdges[imageIx]}`)
  area.scrollLeft = hscroll.leftEdges[imageIx]
  log(`area.scrollLeft: ${two(area.scrollLeft)}`)
  log(`hscroll.leftEdges: ${hscroll.leftEdges}`)
}

function SetDetails() {
  // Update the page details for the current image.

  const image = cJson.images[imageIx]
  get('title').innerHTML = image.title
  get('description').innerHTML = image.description
  get('size').innerHTML = `${areaWidth} x ${areaHeight}`
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
  // The left edges (x scroll positions) of the images in the area.
  "leftEdges": [],
  "scrolling": false,
  "startScrollLeft": null,
  "startX": null,
  "startY": null,
  "currentScrollLeft": 0,
}

function handleTouchStart(event) {
  // Handle the touchstart event.

  // Remember the position incase we are starting to horizontal scroll.
  if (!hscroll.scrolling) {
    hscroll.startScrollLeft = area.scrollLeft;
    hscroll.startX = event.touches[0].clientX;
    hscroll.startY = event.touches[0].clientY;
    log(`touchstart: scroll image: ${imageIx+1}, hscroll.startScrollLeft: ${hscroll.startScrollLeft}`)
    // log(`touchstart: hscroll.startX: ${two(hscroll.startX)}`)
  }

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
  zpan.start.cx = (clientX0 + clientX1) / 2
  zpan.start.cy = (clientY0 + clientY1) / 2
  zpan.start.distance = Math.hypot(clientX0 - clientX1, clientY0 - clientY1)
  zpan.start.scale = zoomPoint.scale
  zpan.start.tx = zoomPoint.tx
  zpan.start.ty = zoomPoint.ty

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
  }
  // Determine whether horizontal scrolling is starting.
  const dx = Math.abs(hscroll.startX - event.touches[0].clientX)
  const dy = Math.abs(hscroll.startY - event.touches[0].clientY)
  if (dx > dy) {
    hscroll.scrolling = true;
    horizontalScrollMove(event)
    return
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
  if (newIw < areaWidth / 2) {
    zpan.current.scale = (areaWidth / 2) / image.width
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
  if (tx > areaWidth - zpan.minVisible) {
    tx = areaWidth - zpan.minVisible
  }
  if (ty > areaHeight - zpan.minVisible) {
    ty = areaHeight - zpan.minVisible
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
  if (hscroll.scrolling) {
    horizontalScrollEnd(event)
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

function copyJson() {
  // Copy the json data to the clipboard.
  log("Copy json to the clipboard");
  const msg = JSON.stringify(cJson, null, 2)
  navigator.clipboard.writeText(msg);
}

function horizontalScrollMove(event) {
  event.preventDefault();
  const currentScrollX = event.touches[0].clientX;
  hscroll.currentScrollLeft = hscroll.startScrollLeft + hscroll.startX - currentScrollX

  // // Limit movement to one page.
  const before = hscroll.startScrollLeft - areaWidth
  const after = hscroll.startScrollLeft + areaWidth
  if (hscroll.currentScrollLeft < before)
    hscroll.currentScrollLeft = before;
  else if (hscroll.currentScrollLeft > after)
    hscroll.currentScrollLeft = after;

  if (hscroll.currentScrollLeft <= 0) {
    hscroll.currentScrollLeft = 0;
  }

  area.scrollLeft = hscroll.currentScrollLeft;
}

function horizontalScrollEnd(event) {
  log(`ScrollEnd: hscroll.currentScrollLeft: ${two(hscroll.currentScrollLeft)}`);

  // Scroll to the left edge of the next, previous or current page.
  let addition;
  if (hscroll.currentScrollLeft > hscroll.startScrollLeft + areaWidth / 2) {
    addition = areaWidth;
  } else if (hscroll.currentScrollLeft < hscroll.startScrollLeft - areaWidth / 2) {
    addition = -areaWidth;
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

  // The maximum number of seconds for the animation.
  const maxDuration = 1.5;

  // The animation frames per second.
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
        SetDetails()
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

  sizeImageArea()
  start.log("sizeImages")
  sizeImages()
  start.log("resize  done")
}
