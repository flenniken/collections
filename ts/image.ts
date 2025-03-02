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
    size: number;
    sizet: number;
    uniqueId: string;
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
    usedImages: number[];
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

// The available screen area.
let availWidth = 0
let availHeight = 0

// The area element set at dom load time.
let area: HTMLElement | null = null

// The index of the image we are currently on.
let imageIndex = 0

// The left edges (horizontal scroll positions) of the images in the
// area.
let leftEdges: number[] = []

// Frames per second when animating.
const framesPerSec = 30

// The event handlers for the page. handleContainerTouchStart is
// another handler on the containers.
window.addEventListener("DOMContentLoaded", handleDOMContentLoaded)
window.addEventListener("load", handleLoad)
window.addEventListener("touchstart", handleTouchStart, {passive: false})
window.addEventListener("restoreimage", handleRestoreImage, false)
window.addEventListener("touchmove", handleTouchMove, {passive: false})
window.addEventListener("resize", handleResize);
document.addEventListener("touchend", handleTouchEnd, false)
document.addEventListener("touchcancel", handleTouchCancel, false)

// The start time used to time loading.
const startTimer = new Timer()

function handleDOMContentLoaded() {
  // The DOM has loaded.
  // Setup global variables and size the containers and images.
  startTimer.log("image", "DOMContentLoaded event")
  log("image", `The collection contains ${cJson.images.length} images.`)

  area = get("area")

  // imageIndex = getFirstImage()
  imageIndex = 0
  log("image", `First image: ${imageIndex + 1}`)

  startTimer.log("image", "setAvailableArea")
  setAvailableArea()

  startTimer.log("image", "sizeImages")
  sizeImages(imageIndex)
}

async function handleLoad() {
  // The whole page has loaded including styles, images and other resources.
  startTimer.log("image", "load event")

  // Show the admin icons when an admin is logged in.
  // showAdminIcons("image")

  topHeaderHeight = cssNum("--top-header-height")
  log("image", `topHeaderHeight: ${topHeaderHeight}`)

  // Watch the touchstart event on the containers for double touch.
  const containers = area!.querySelectorAll(".container")
  containers.forEach(container => {
    container.addEventListener("touchstart", handleContainerTouchStart, {passive: false})

    // Watch the area scroll and scroll end events.
    area!.addEventListener("scroll", handleScroll, false)
    area!.addEventListener("scrollend", handleScrollEnd, false)
  })

  // Disable the default browser zoom and pan behavior.
  get("images").setAttribute("touch-action", "none")

  // Show the page now to cut down on page flashing.
  document.body.style.visibility = "visible"
  document.body.style.opacity = "1"

  startTimer.log("image", "load Done")
}

function getFirstImage() {
  // Return the index of the first image to show based on the url
  // image query parameter.

  // Get the image query string.
  log("image", `window.location.search: ${window.location.search}`)
  const queryStr = getSearchParam("image")
  log("image", `Image query string: "${queryStr}"`)

  // Set the first image index.
  let imageIx = 0
  if (queryStr) {
    const imageNum = parseInt(queryStr, 10)
    if (!isNaN(imageNum) && imageNum >= 1 && imageNum <= cJson.images.length)
      imageIx = imageNum - 1
  }
  return imageIx
}

function setAvailableArea() {
  // Size the image area to the size of the usable screen. Return
  // false when the size did not change.

  // Get the available screen width and height and store them in
  // globals, availWidth and availHeight.
  const [availW, availH] = getAvailableWidthHeight()
  if (availW == availWidth && availH == availHeight) {
    log("image", `Available size is the same: ${availWidth} x ${availHeight}`)
    return false
  }
  availWidth = availW
  availHeight = availH

  zpan.minVisible = availWidth / 4

  // Size the image area to the available screen area.
  area!.style.width = `${availWidth}px`
  // area!.style.height = `${availHeight}px`
  log("image", `Available screen size: ${availWidth} x ${availHeight}`)
  return true
}

function getZoomPoint(imageIx: number, cjson: CJson.Collection = cJson) {
  // Return the zoom point for the given image index.
  const zoom_w_h = `${availWidth}x${availHeight}`
  const zoomPoints = cjson.zoomPoints[zoom_w_h]
  return zoomPoints[imageIx]
}

function sizeImages(firstImageIx: number) {
  // Size the image containers and the images and create zoom points
  // when missing and horizontally scroll the given image into view.

  let edge = 0
  const zoom_w_h = `${availWidth}x${availHeight}`

  let zoomPoints: CJson.ZoomPoint[]
  if (!(zoom_w_h in cJson.zoomPoints)) {
    log("image", "No zoom points for this size, create new zoom points.")
    log("image", `Existing zoom points: ${Object.keys(cJson.zoomPoints)}`)

    zoomPoints = createZoomPoints()

    cJson.zoomPoints[zoom_w_h] = zoomPoints
    cJsonOriginal.zoomPoints[zoom_w_h] = zoomPoints
  }
  else {
    zoomPoints = cJson.zoomPoints[zoom_w_h]
  }

  leftEdges.length = 0
  log("image", `Image zoom points for ${availWidth} x ${availHeight}`)
  cJson.images.forEach((image, imageIx) => {
    if (image.width < availWidth || image.height < availHeight) {
      logError("small images are not supported")
    }

    // Save the position of the left edge of all the images.
    leftEdges.push(edge)

    const colbox = get(`cb${imageIx+1}`)
    colbox.style.width = `${availWidth}px`

    // Size all the containers to the size of the area.
    const container = get(`c${imageIx+1}`)
    container.style.width = `${availWidth}px`
    container.style.height = `${availHeight}px`

    const zoomPoint = zoomPoints[imageIx]

    // Size the image to its zoom point.
    const img = get(`i${imageIx+1}`)

    add_border(img, zoomPoint)
    img.style.transformOrigin = "0px 0px"
    // Note: translate runs from right to left.
    img.style.transform = `translate(${zoomPoint.tx}px, ${zoomPoint.ty}px) scale(${zoomPoint.scale})`;

    // Log the zoom point.
    log("image", `i${imageIx+1}: ${image.width} x ${image.height}, ` +
                `scale: ${two(zoomPoint.scale)}, ` +
                `t: (${two(zoomPoint.tx)}, ${two(zoomPoint.ty)})`)

    edge += availWidth
  })

  // Scroll the current image into view.
  area!.scrollLeft = leftEdges[firstImageIx]
  log("image", `area!.scrollLeft: ${area!.scrollLeft}`)
  log("image", `leftEdges: ${leftEdges}`)
}

function defaultZoomPoints() {
  // Create zoom points where the images fit the screen.

  let zoomPoints: CJson.ZoomPoint[] = []
  cJson.images.forEach((image, imageIx) => {
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
    log("image", `Zoom point: (${two(zoomPoint.tx)}, ${two(zoomPoint.ty)}), scale: ${two(zoomPoint.scale)}`)
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
    log("image", "No closest key")
    return defaultZoomPoints()
  }

  log("image", `Closest zoompoint key: ${closestKey}`)
  const closestZoomPoints = cJson.zoomPoints[closestKey]
  cJson.images.forEach((image, imageIx) => {
    const closestZoomPoint = closestZoomPoints[imageIx]

    // The new scale is based on the closest scale.
    const scale = closestZoomPoint.scale / closestWidth * availWidth
    // log("image", `closest scale: ${two(closestZoomPoint.scale)}, new scale: ${two(scale)}`)

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

function preventSwipe(event: Event) {
  // Prevent swipe back default gesture when near the edges.  This
  // workaround is not perfect.
  const touches = (<TouchEvent>event).touches;

  if (touches.length == 1) {
    const clientX = touches[0].clientX;
    const margin = 20
    const left = margin
    const right = window.innerWidth - margin
    // log("image", `position: ${clientX}, left: ${left}, right: ${right}`)
    if (clientX < left || clientX > right) {
      // Sometimes preventDefault doesn't prevent swiping.
      event.preventDefault();
      return true
    }
  }
  return false
}

// A timer to detect a double touch.
let doubleTouch: Timer | null = null

function handleTouchStart(event: TouchEvent) {
  // Log the current image. See handleContainerTouchStart for zoom
  // and pan.

  log("image", `Touched image: ${imageIndex+1}`)
  preventSwipe(event)
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
  const imageIx = imageIndex

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

  const zoomPoint = getZoomPoint(imageIx)
  zpan.start = {
    "cx": (clientX0 + clientX1) / 2,
    "cy": (clientY0 + clientY1) / 2 + pageYOffset,
    "distance": Math.hypot(clientX0 - clientX1, clientY0 - clientY1),
    "scale": zoomPoint.scale,
    "tx": zoomPoint.tx,
    "ty": zoomPoint.ty,
  }

  const image = cJson.images[imageIx]
  log("image", `i${imageIx+1}: touchstart: c: (${two(zpan.start.cx)}, ${two(zpan.start.cy)}) ` +
              `d: ${two(zpan.start.distance)}, scale: ${two(zpan.start.scale)}, ` +
              `t: (${two(zpan.start.tx)}, ${two(zpan.start.ty)})`)
}

function handleRestoreImage(event: Event) {
  // Restore an image position and scale to it's original zoom point.

  log("image", "Restore image to its zoom point.")
  const imageIx = imageIndex

  // Get the original zoom point.
  let zoomPoint = getZoomPoint(imageIx, cJson)
  const origZP = getZoomPoint(imageIx, cJsonOriginal)
  log("image", `Zoom point: scale: ${two(zoomPoint.scale)}, (${two(zoomPoint.tx)}, ${two(zoomPoint.ty)})`)
  log("image", `Original zoom point: scale: ${two(origZP.scale)}, (${two(origZP.tx)}, ${two(origZP.ty)})`)

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
    log("image", "Restore image finished")
    zoomPoint.scale = origZP.scale;
    zoomPoint.tx = origZP.tx;
    zoomPoint.ty = origZP.ty;
    add_border(img, zoomPoint)
    img.style.transform = `translate(${zoomPoint.tx}px, ${zoomPoint.ty}px) scale(${zoomPoint.scale})`;
  }
}

function add_border(img: HTMLElement, zoomPoint: CJson.ZoomPoint) {
  // Add a border to the element when it's upper left corner is inside
  // the area.
  if (zoomPoint.tx > 0 && zoomPoint.ty > 0) {
    img.style.border = "solid black 80px"
  }
  else {
    img.style.border = ""
  }
}

function handleTouchMove(event: TouchEvent) {
  // Zoom and pan the image.

  if (!zpan.zooming)
    return

  const imageIx = imageIndex

  // Disable the default browser zoom and pan behavior when two
  // fingers are down.
  event.preventDefault()

  const clientX0 = event.touches[0].clientX
  const clientX1 = event.touches[1].clientX
  const clientY0 = event.touches[0].clientY
  const clientY1 = event.touches[1].clientY
  // log("image", `touchmove: client0: (${clientX0}, ${clientY0}) client1: (${clientX1}, ${clientY1})`)

  const image = cJson.images[imageIx]
  const zoomPoint = getZoomPoint(imageIx)

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

  add_border(img, zoomPoint)

  // Note: translate runs from right to left.
  img.style.transform = `translate(${zoomPoint.tx}px, ${zoomPoint.ty}px) scale(${zoomPoint.scale})`;
}

function handleTouchCancel(event: TouchEvent) {
  log("image", "touchcancel")
  handleTouchEnd(event)
}

function handleTouchEnd(event: TouchEvent) {
  // Log the current zoom point.

  if (zpan.zooming) {
    zpan.zooming = false

    const imageIx = imageIndex
    const image = cJson.images[imageIx]
    const zoomPoint = getZoomPoint(imageIx)
    log("image", `i${imageIx+1}: touchend: c: (${two(zpan.current!.cx)}, ${two(zpan.current!.cy)}) ` +
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
  log("image", JSON.stringify(cJson, replacer, 2))

  // log("image", "Copy json to the clipboard");
  // navigator.clipboard.writeText(msg);
}

function animatePosition(start: number, finish: number, framesPerSec: number,
    maxDistance: number, maxDuration: number,
    allDone: () => void,
    posFunction: (position: number) => void) {
  // Animate the position from start to finish. Call the posFunction
  // callback for each position and call allDone when finished.

  const maxFrames = maxDuration * framesPerSec;
  // log("image", `maxFrames: ${maxFrames} = maxDuration: ${maxDuration} * framesPerSec: ${framesPerSec}`)

  // Move at the same rate no matter the distance. Use the ratio of
  // max frames to max distance equal to the ratio of the frames to
  // the distance.
  const distance = Math.abs(finish - start)
  const frames = (distance * maxFrames) / maxDistance;
  // log("image", `frames: ${two(frames)} = (distance: ${two(distance)} * maxFrames: ${two(maxFrames)}) / maxDistance: ${two(maxDistance)}`)

  // Get the positions to animate.
  let distancesIndex = 0;
  const frameDistances = distanceList(start, finish, frames);
  // log("image", `frameDistances: [${frameDistances}]`)

  // Determine the delay between each of the animations in seconds.
  const delay = 1 / framesPerSec;

  // log("image", `frames: ${two(frames)}, distance: ${two(distance)}, delay: ${two(delay)} seconds`)

  log("image", `Animate positions [${frameDistances}] one per ${two(delay)} seconds`);

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

let centerElement = null

function handleResize() {
  // When the phone orientation changes, update the image area and
  // size the images.
  log("image", "resize event")

  // Skip the resize events until the area object is set.
  if (area === null) {
    log("image", "Wait for DOM elements to exist and be sized.")
    return
  }

  const start = new Timer()
  start.log("image", "resize")

  const changed = setAvailableArea()
  if (changed) {
    log("image", `on image: ${imageIndex+1}`)
    start.log("image", "sizeImages")
    sizeImages(imageIndex)
  }

  start.log("image", "resize  done")
}

let scrollStopId = 0

function handleScroll() {
  // When an image is scrolled left or right, set the image index once
  // it stops on an image.

  // When we have an stop interval process already going don't start
  // another one.
  if (scrollStopId != 0)
    return

  log("image", "scroll started")
  log("image", `leftEdges: ${leftEdges}`)
  log("image", `area.scrollLeft: ${area!.scrollLeft}`)

  scrollStopId = window.setInterval(() => {
    // If the current scroll position is on a left edge, we know
    // scrolling has stopped, set the imageIndex to the current image.
    const imageIx = leftEdges.indexOf(area!.scrollLeft)
    if (imageIx != -1) {
      // Set the image index and stop the interval checking.
      imageIndex = imageIx
      log("image", `scolling stopped on image: ${imageIndex + 1}`)
      clearInterval(scrollStopId);
      scrollStopId = 0
    }
  }, 100)
}

function handleScrollEnd() {
  // When the scrollend event is supported by all browsers, we can do
  // away with the handleScroll method.
  log("image", "The scrollEnd event exists.")
}
