// Code for the image page.

namespace CJson {
  // The collection json's typescript definition.

  export interface Image {
    url: string;
    thumbnail: string;
    title: string;
    description: string;
    width: number;
    height: number;
  }

  export interface ZoomPoint {
    scale: number;
    tx: number;
    ty: number;
  }

  export interface ZoomPoints {
    // The wxh array contains a element for each image in the collection.
    [wxh: string]: ZoomPoint[];
  }

  export interface Collection {
    title: string;
    description: string;
    posted: string;
    collection: number;
    imagePageUrl: string;
    thumbnailsPageUrl: string;
    // The image array contains a element for each image in the collection.
    images: Image[];
    zoomPoints: ZoomPoints;
  }
}

// Two versions of the collection data.  The first is mutable and
// holds the current state, the second is the original for undo. cJson
// and cJsonOriginal are defined in the image html page.
var cJson: CJson.Collection
var cJsonOriginal: CJson.Collection

// The current image index into the json list of images.
let imageIx = 0

// The available screen area.
let availWidth = 0
let availHeight = 0

// Height of the top header in portrait mode. Set from css
// --top-header-height variable in the load event.
let topHeaderHeight = 60

// The area element set at dom load time.
let area: HTMLElement | null = null

// The event handlers for the page. handleContainerTouchStart is
// another handler on the containers.
window.addEventListener("DOMContentLoaded", handleDOMContentLoaded)
window.addEventListener("load", handleLoad)
window.addEventListener('touchstart', handleTouchStart, {passive: false})
window.addEventListener('restoreimage', handleRestoreImage, false)
window.addEventListener('touchmove', handleTouchMove, {passive: false})
window.addEventListener("resize", handleResize);
document.addEventListener('touchend', handleTouchEnd, false)
document.addEventListener('touchcancel', handleTouchCancel, false)

function get(id: string) {
  // Get the dom element with the given id. Generate an exception
  // when not found.
  const element = document.getElementById(id)
  if (!element)
    throw new Error(`Element with "${id}" not found.`)
  return element
}

function log(message: string) {
  // Log the message to the console.
  console.log(message)
}

function logError(message: string) {
  // Log an error message to the console.
  console.error(message)
}

function two(num: number) {
  // Return the number rounded to two decimal places.
  return num.toFixed(2)
}

function three(num: number) {
  // Return the number rounded to three decimal places.
  return num.toFixed(3)
}

class Timer {
  // Time how long code takes to run, accurate to about thousands of a
  // second.  Note: use date() instead of performance() for
  // microseconds accuracy.
  start: number;
  constructor() {
    this.start = performance.now()
  }
  seconds() {
    return (performance.now() - this.start) / 1000.0
  }
  log(message: string) {
    log(`${three(this.seconds())}s ----- ${message}`)
  }
}

function cssNum(variable: string): number {
  // Return the given css number variable defined in the ":root"
  // pseudo class. It returns 100 for both of the following examples:
  // :root {
  //   --my-var: 100;
  //   --my-var2: 100px;
  // }
  return parseFloat(getComputedStyle(document.documentElement).getPropertyValue(variable));
}

// The start time used to time loading.
const startTimer = new Timer()


function handleDOMContentLoaded() {
  // The DOM has loaded.
  // Setup global variables and size the containers and images.
  startTimer.log("DOMContentLoaded event")
  log(`The collection contains ${cJson.images.length} images.`)

  area = get("area")

  setFirstImage()

  startTimer.log("setAvailableArea")
  setAvailableArea()

  startTimer.log("sizeImages")
  sizeImages()
}

async function handleLoad() {
  // The whole page has loaded including styles, images and other resources.
  startTimer.log("load event")

  topHeaderHeight = cssNum("--top-header-height")
  log(`topHeaderHeight: ${topHeaderHeight}`)

  // Watch the touchstart event on the containers for double touch.
  const containers = area!.querySelectorAll('.container')
  containers.forEach(container => {
    container.addEventListener("touchstart", handleContainerTouchStart, {passive: false})
  })

  // Disable the default browser zoom and pan behavior.
  get("images").setAttribute("touch-action", "none")

  // Show the page now to cut down on page flashing.
  document.body.style.visibility = 'visible'
  document.body.style.opacity = "1"

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
  imageIx = 0
  if (queryStr) {
    const imageNum = parseInt(queryStr, 10)
    if (!isNaN(imageNum) && imageNum >= 1 && imageNum <= cJson.images.length)
      imageIx = imageNum - 1
  }
  log(`First image: ${imageIx + 1}`)
}

function getAvailableWidthHeight() {
  // Get the available screen width and height.
  const availW = document.documentElement.clientWidth
  let availH = document.documentElement.clientHeight

  // On a PWA the apple-mobile-web-app-status-bar-style setting allows
  // the toolbar area to be used, however, the area width and height
  // doesn't see this extra space. On a pwa, add the extra area.
  if (availH > availW && window.matchMedia(
      '(display-mode: standalone)').matches) {
    availH += topHeaderHeight
    log(`Add ${topHeaderHeight} to height for the top bar.`)
  }
  return [availW, availH]
}

function setAvailableArea() {
  // Size the image area to the size of the usable screen. Return
  // false when the size did not change.

  // Get the available screen width and height and store them in
  // globals, availWidth and availHeight.
  const [availW, availH] = getAvailableWidthHeight()
  if (availW == availWidth && availH == availHeight) {
    log(`Available size is the same: ${availWidth} x ${availHeight}`)
    return false
  }
  availWidth = availW
  availHeight = availH

  zpan.minVisible = availWidth / 4

  // Size the image area to the available screen area.
  area!.style.width = `${availWidth}px`
  // area!.style.height = `${availHeight}px`
  log(`Available screen size: ${availWidth} x ${availHeight}`)
  return true
}

function getZoomPoint(cjson: CJson.Collection = cJson) {
  // Return the zoom point for the current image.
  const zoom_w_h = `${availWidth}x${availHeight}`
  const zoomPoints = cjson.zoomPoints[zoom_w_h]
  return zoomPoints[imageIx]
}

function sizeImages() {
  // Size the image containers and the images and create zoom points
  // when missing.

  let edge = 0
  const zoom_w_h = `${availWidth}x${availHeight}`

  let zoomPoints: CJson.ZoomPoint[]
  if (!(zoom_w_h in cJson.zoomPoints)) {
    log("No zoom points for this size, create new zoom points.")
    log(`Existing zoom points: ${Object.keys(cJson.zoomPoints)}`)

    zoomPoints = createZoomPoints()

    cJson.zoomPoints[zoom_w_h] = zoomPoints
    cJsonOriginal.zoomPoints[zoom_w_h] = zoomPoints
  }
  else {
    zoomPoints = cJson.zoomPoints[zoom_w_h]
  }

  hscroll.leftEdges.length = 0
  log(`Image zoom points for ${availWidth} x ${availHeight}`)
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

    const zoomPoint = zoomPoints[ix]

    // Size the image to its zoom point.
    const img = get(`i${ix+1}`)
    img.style.transformOrigin = "0px 0px"
    // Note: translate runs from right to left.
    img.style.transform = `translate(${zoomPoint.tx}px, ${zoomPoint.ty}px) scale(${zoomPoint.scale})`;

    // Log the zoom point.
    log(`i${ix+1}: ${image.width} x ${image.height}, ` +
                `scale: ${two(zoomPoint.scale)}, ` +
                `t: (${two(zoomPoint.tx)}, ${two(zoomPoint.ty)})`)

    edge += availWidth
  })

  // Scroll the current image into view.
  area!.scrollLeft = hscroll.leftEdges[imageIx]
  log(`area!.scrollLeft: ${area!.scrollLeft}`)
  log(`hscroll.leftEdges: ${hscroll.leftEdges}`)
}

function defaultZoomPoints() {
  // Create a zoom points where the images fit the screen.

  let zoomPoints: CJson.ZoomPoint[] = []
  cJson.images.forEach((image, ix) => {
    // Create a zoom point where the image fits the screen.

    // Fit the long side to the container.
    let scale: number;
    if (image.width - availWidth > image.height - availHeight) {
      scale = availWidth / image.width
    } else {
      scale = availHeight / image.height
    }
    const zoomPoint = {"scale": scale, "tx": 0, "ty": 0}
    zoomPoints.push(zoomPoint)
    log(`Zoom point: (${two(zoomPoint.tx)}, ${two(zoomPoint.ty)}), scale: ${two(zoomPoint.scale)}`)
  })
  return zoomPoints
}

function createZoomPoints() {
  // Create zoom points for the current screen size. Base them on
  // existing zoom points if possible else fallback to the default.

  let zoomPoints: CJson.ZoomPoint[] = []

  const count = Object.keys(cJson.zoomPoints).length
  if (count === 0) {
    return defaultZoomPoints()
  }

  // Find closest existing zoom points.
  let closest = 9999999
  let closestKey = ""
  let closestWidth = 0
  let closestHeight = 0
  const keys = Object.keys(cJson.zoomPoints)
  keys.forEach((key) => {
    const [zpWidth, zpHeight] = parseZoomPointKey(key)
    if ((availWidth > availHeight && zpWidth > zpHeight) ||
        (availWidth < availHeight && zpWidth < zpHeight)) {
      const num = availWidth - zpWidth + availHeight - zpHeight
      if (num < closest) {
        closest = num
        closestKey = key
        closestWidth = zpWidth
        closestHeight = zpHeight
      }
    }
  })
  if (closestKey == "") {
    log("No closest key")
    return defaultZoomPoints()
  }

  log(`Closest zoompoint key: ${closestKey}`)
  const closestZoomPoints = cJson.zoomPoints[closestKey]
  cJson.images.forEach((image, ix) => {
    const closestZoomPoint = closestZoomPoints[ix]

    // The new scale is based on the closest scale.
    const scale = closestZoomPoint.scale / closestWidth * availWidth
    // log(`closest scale: ${two(closestZoomPoint.scale)}, new scale: ${two(scale)}`)

    const tx = availWidth * (closestZoomPoint.tx / closestWidth)
    const ty = availHeight * (closestZoomPoint.ty / closestHeight)
    const zoomPoint = {"scale": scale, "tx": tx, "ty": ty}
    zoomPoints.push(zoomPoint)
  })

  return zoomPoints
}

function parseZoomPointKey(key: string) {
  // Parse the width and height from a zoom point key.
  // Example "125x423" => [125, 423]
  const parts = key.split("x")
  if (parts.length != 2)
    throw new Error("Invalid key")
  return [parseFloat(parts[0]), parseFloat(parts[1])]
}

interface RuntimeZoomPoint {
  // Runtime zoom point data interface.
  cx: number;
  cy: number;
  distance: number;
  scale: number;
  tx: number;
  ty: number;
}

interface ZPan {
  // Runtime zoom and pan data interface.

  // The minimum number of pixels of the image to keep visible when
  // zooming and panning.
  minVisible: number;
  // Whether we are zooming an image or not.
  zooming: boolean;
  // The position when we started zooming and panning.
  start: RuntimeZoomPoint | null;
  // The current touchmove position.
  current: RuntimeZoomPoint | null;
}

let zpan: ZPan = {
  // Zoom and pan variables.

  // The minimum amount of image to keep visible when zooming and
  // panning.
  "minVisible": 10,

  // Whether we are zooming an image or not.
  "zooming": false,
  // The position when we started zooming and panning.
  start: null,
  // The current touchmove position.
  current: null,
}

// A timer to detect a double touch.
let doubleTouch: Timer | null = null

interface HScroll {
  // Horizontal scroll runtime interface.

  minFlick: number;
  framesPerSec: number;
  maxDuration: number;
  scrolling: boolean;
  leftEdges: number[];
  startX: number;
  startY: number;
  currentX: number;
  startXTime: number;
  currentXTime: number;
  startScrollLeft: number;
  currentScrollLeft: number;
}

let hscroll: HScroll = {
  // Horizontal scrolling variables.

  // Flick the image when the scrolling speed is above this pixels per millisecond.
  "minFlick": 1.0,
  // The animation frames per second.
  "framesPerSec": 30,
  // The maximum number of seconds for the animation.
  "maxDuration": .15,
  "scrolling": false,
  // The left edges (x scroll positions) of the images in the area.
  "leftEdges": [],
  // The touch position when scrolling starts and ends.
  "startX": 0,
  "startY": 0,
  "currentX": 0,
  // The touch times when scrolling starts and ends.
  "startXTime": 0,
  "currentXTime": 0,
  // The horizontal scroll positions when scrolling starts and ends.
  "startScrollLeft": 0,
  "currentScrollLeft": 0,
}

function handleTouchStart(event: TouchEvent) {
  // Handle v and h scrolling. See handleContainerTouchStart for zoom
  // and pan.

  if (hscroll.scrolling) {
    event.preventDefault();
    return
  }

  // Remember the horizontal scroll position incase we are starting to
  // scroll.
  hscroll.startScrollLeft = area!.scrollLeft;
  hscroll.currentX = hscroll.startX = event.touches[0].clientX;
  hscroll.currentXTime = hscroll.startXTime = performance.now()
  hscroll.startY = event.touches[0].clientY;
  log(`On image: ${imageIx+1}, hscroll: ${hscroll.startScrollLeft}`)
}

function handleContainerTouchStart(event: Event) {
  // Handle the touchstart event for the container elements for double
  // touch and zoom and pan.

  const touches = (<TouchEvent>event).touches;

  // Start timer on first touch. If second touch comes before .5
  // seconds, it’s a double touch. Only consider one finger cases.
  if (touches.length == 1) {
    if (doubleTouch !== null) {
      let seconds = doubleTouch.seconds()
      if (seconds < .5) {
        const event = new Event("restoreimage");
        window.dispatchEvent(event);
        doubleTouch = null
        return
      }
    }
    doubleTouch = new Timer()
  } else {
    doubleTouch = null
  }

  // When not two fingers touching, return.
  if (touches.length != 2)
    return

  zpan.zooming = true

  // Disable the default browser zoom and pan behavior when two
  // fingers are down.
  event.preventDefault()

  // Save the point centered between the two fingers, the distance
  // between them, the current translation and the current scale.
  const clientX0 = touches[0].clientX
  const clientX1 = touches[1].clientX
  const clientY0 = touches[0].clientY
  const clientY1 = touches[1].clientY

  const zoomPoint = getZoomPoint()
  zpan.start = {
    "cx": (clientX0 + clientX1) / 2,
    "cy": (clientY0 + clientY1) / 2 + pageYOffset,
    "distance": Math.hypot(clientX0 - clientX1, clientY0 - clientY1),
    "scale": zoomPoint.scale,
    "tx": zoomPoint.tx,
    "ty": zoomPoint.ty,
  }

  const image = cJson.images[imageIx]
  log(`i${imageIx+1}: touchstart: c: (${two(zpan.start.cx)}, ${two(zpan.start.cy)}) ` +
              `d: ${two(zpan.start.distance)}, scale: ${two(zpan.start.scale)}, ` +
              `t: (${two(zpan.start.tx)}, ${two(zpan.start.ty)})`)
}

function handleRestoreImage(event: Event) {
  // Restore an image position and scale to it's original zoom point.

  log("Restore image to its zoom point.")

  // Get the original zoom point.
  let zoomPoint = getZoomPoint(cJson)
  const origZP = getZoomPoint(cJsonOriginal)
  log(`Zoom point: scale: ${two(zoomPoint.scale)}, (${two(zoomPoint.tx)}, ${two(zoomPoint.ty)})`)
  log(`Original zoom point: scale: ${two(origZP.scale)}, (${two(origZP.tx)}, ${two(origZP.ty)})`)

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

function handleTouchMove(event: TouchEvent) {
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
      doubleTouch = null
      horizontalScrollMove(event)
      return
    }
  }

  if (!zpan.zooming)
    return

  // Disable the default browser zoom and pan behavior when two
  // fingers are down.
  event.preventDefault()

  const clientX0 = event.touches[0].clientX
  const clientX1 = event.touches[1].clientX
  const clientY0 = event.touches[0].clientY
  const clientY1 = event.touches[1].clientY
  // log(`touchmove: client0: (${clientX0}, ${clientY0}) client1: (${clientX1}, ${clientY1})`)

  const image = cJson.images[imageIx]
  const zoomPoint = getZoomPoint()

  const distance = Math.hypot(clientX0 - clientX1, clientY0 - clientY1)
  zpan.current = {
    cx: (clientX0 + clientX1) / 2,
    cy: (clientY0 + clientY1) / 2 + pageYOffset,
    distance: distance,
    scale: (distance / zpan.start!.distance) * zpan.start!.scale,
    tx: 0,
    ty: 0,
  }

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
  const movedCx = ((zpan.start!.cx - zpan.start!.tx) * zpan.current.scale) /
    zpan.start!.scale + zpan.start!.tx
  const movedCy = ((zpan.start!.cy - zpan.start!.ty) * zpan.current.scale) /
    zpan.start!.scale + zpan.start!.ty
  let tx = zpan.start!.tx - (movedCx - zpan.start!.cx) + (zpan.current.cx - zpan.start!.cx)
  let ty = zpan.start!.ty - (movedCy - zpan.start!.cy) + (zpan.current.cy - zpan.start!.cy)

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

function handleTouchCancel(event: TouchEvent) {
  log("touchcancel")
  handleTouchEnd(event)
}

function handleTouchEnd(event: TouchEvent) {
  // Finish scrolling or log the current zoom point.

  if (event.touches.length == 0 && hscroll.scrolling) {
    horizontalScrollEnd()
    return
  }

  if (zpan.zooming) {
    zpan.zooming = false

    const image = cJson.images[imageIx]
    const zoomPoint = getZoomPoint()
    log(`i${imageIx+1}: touchend: c: (${two(zpan.current!.cx)}, ${two(zpan.current!.cy)}) ` +
              `d: ${two(zpan.current!.distance)}, scale: ${two(zoomPoint.scale)}, ` +
              `t: (${two(zoomPoint.tx)}, ${two(zoomPoint.ty)})`)
  }
}

function logJson() {
  // Log the current collection json data.

  function replacer(key: string, value: any) {
    // Write two decimals points for zoom points.
    if (["scale", "tx", "ty"].includes(key)) {
      return two(value)
    }
    else
      return value
  }

  // Log the current json.
  log(JSON.stringify(cJson, replacer, 2))

  // log("Copy json to the clipboard");
  // navigator.clipboard.writeText(msg);
}

function horizontalScrollMove(event: TouchEvent) {
  // Horizontally scroll that page.

  event.preventDefault();

  hscroll.currentXTime = performance.now()
  hscroll.currentX = event.touches[0].clientX;
  hscroll.currentScrollLeft = hscroll.startScrollLeft + hscroll.startX - hscroll.currentX

  // scrollLeft cannot go past the ends so no need to adjust it.
  area!.scrollLeft = hscroll.currentScrollLeft;
}

function horizontalScrollEnd() {
  // If the last move was big and fast, flick the image to the next
  // one.

  function hScrollDone() {
    // Scrolling has finished.  Update the image index.

    // Set the image index to the image we scrolled to.
    const ix = hscroll.leftEdges.indexOf(area!.scrollLeft)
    if (ix == -1)
      logError(`area!.scrollLeft ${area!.scrollLeft} was not found.`)
    else {
      if (imageIx == ix) {
        log(`Scrolled back to the original item ${imageIx+1}.`)
      }
      else {
        imageIx = ix
        log(`On image: ${imageIx+1}, hscroll: ${area!.scrollLeft}`)
      }
    }
    hscroll.scrolling = false;
  }

  const hDuration = hscroll.currentXTime  - hscroll.startXTime
  const dx = hscroll.currentX - hscroll.startX
  const pps = dx / hDuration
  // log(`ScrollEnd: pps: ${two(pps)}, dx: ${two(dx)}, hDuration: ${three(hDuration/1000)}s`)
  // log(`ScrollEnd: hscroll.currentScrollLeft: ${two(hscroll.currentScrollLeft)}`);
  // log(`ScrollEnd: hscroll.currentX: ${two(hscroll.currentX)}, ` +
  //     `hscroll.startX: ${two(hscroll.startX)},  ` +
  //     `hscroll.currentXTime: ${two(Math.floor(hscroll.currentXTime))}, ` +
  //     `hscroll.startXTime: ${two(Math.floor(hscroll.startXTime))}`)
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

  if (area!.scrollLeft == finishLeft) {
    hScrollDone()
    return
  }

  // The maximum distance is half the screen width.  If you scroll
  // past the middle, you go to the next image and less than half you
  // go back.
  const maxDistance = availWidth / 2;

  animatePosition(startLeft, finishLeft, hscroll.framesPerSec,
    maxDistance, hscroll.maxDuration, hScrollDone, (position) => {
        area!.scrollLeft = position
  })
}

function animatePosition(start: number, finish: number, framesPerSec: number,
    maxDistance: number, maxDuration: number,
    allDone: () => void,
    posFunction: (position: number) => void) {
  // Animate the position from start to finish. Call the posFunction
  // callback for each position and call allDone when finished.

  const maxFrames = maxDuration * framesPerSec;
  // log(`maxFrames: ${maxFrames} = maxDuration: ${maxDuration} * framesPerSec: ${framesPerSec}`)

  // Move at the same rate no matter the distance. Use the ratio of
  // max frames to max distance equal to the ratio of the frames to
  // the distance.
  const distance = Math.abs(finish - start)
  const frames = (distance * maxFrames) / maxDistance;
  // log(`frames: ${two(frames)} = (distance: ${two(distance)} * maxFrames: ${two(maxFrames)}) / maxDistance: ${two(maxDistance)}`)

  // Get the positions to animate.
  let distancesIndex = 0;
  const frameDistances = distanceList(start, finish, frames);
  // log(`frameDistances: [${frameDistances}]`)

  // Determine the delay between each of the animations in seconds.
  const delay = 1 / hscroll.framesPerSec;

  // log(`frames: ${two(frames)}, distance: ${two(distance)}, delay: ${two(delay)} seconds`)

  log(`Animate positions [${frameDistances}] one per ${two(delay)} seconds`);

  // Animate to the new position.
  const annimationId = setInterval(animateInterval, delay * 1000);
  function animateInterval() {
    if (distancesIndex >= frameDistances.length) {
      // Stop animating.
      clearInterval(annimationId);
      if (allDone !== null)
        allDone()
    } else {
      // Set the new position.
      posFunction(frameDistances[distancesIndex])
      distancesIndex += 1;
    }
  }
}

function distanceList(start: number, finish: number, numberSteps: number) {
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

function handleResize() {
  // When the phone orientation changes, update the image area and
  // size the images.
  log("resize event")

  // Skip the resize events until the area object is set.
  if (area === null) {
    log("Wait for DOM elements to exist and be sized.")
    return
  }

  const start = new Timer()
  start.log("resize")

  const changed = setAvailableArea()
  if (changed) {
    start.log("sizeImages")
    sizeImages()
  }

  start.log("resize  done")
}

