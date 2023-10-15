"use strict";

// Javascript for the image page.

// cJson is defined in the image html page.

// The image index into the json collection of the image we are
// currently viewing.
var imageIx = null

// The available screen area.
var areaWidth = null
var areaHeight = null

// The left edges (scroll positions) of the images in the area.
var leftEdges = null

// Consider a zoom point this close.
const closeDistance = 100

window.addEventListener("load", loadEvent)

// The start time used for timing.
const startTime = performance.now()

function logStartupTime(message) {
  // Log the elasped time since the startTime.
  let seconds = (performance.now() - startTime) / 1000.0
  seconds = seconds.toFixed(3)
  console.log(`${seconds}s -- ${message}`)
}

function get(id) {
  // Get the dom element with the given id.
  return document.getElementById(id)
}

async function loadEvent() {
  // The page finished loading, setup and size things.
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
  console.log(`window.innerWidth, height: (${window.innerWidth}, ${window.innerHeight})`)

  let w = document.documentElement.clientWidth
  let h = document.documentElement.clientHeight
  console.log(`document.documentElement.clientWidth, height: (${w}, ${h})`)

  w = document.body.clientWidth
  h = document.body.clientHeight
  console.log(`document.body.clientWidth, height: (${w}, ${h})`)

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


    if (image.width < areaWidth || image.height < areaHeight) {
      console.log("small images are not supported")
    }

    // Fit the long side to the container.
    if (image.width - areaWidth > image.height - areaHeight) {
      image.scale = areaWidth / image.width
    } else {
      image.scale = areaHeight / image.height
    }

    // Center the image in the container.
    image.tx = areaWidth / 2 - (image.scale * image.width) / 2
    image.ty = areaHeight / 2 - (image.scale * image.height) / 2

    // Position the image with the data calculated above.
    const img = get(`i${ix+1}`)
    img.style.width = `${image.width}px`
    img.style.height = `${image.height}px`
    img.style.transformOrigin = "0px 0px"
    // Note: translate runs from right to left.
    img.style.transform = `translate(${image.tx}px, ${image.ty}px) scale(${image.scale})`;

    // Log the image information.
    console.log(`i${ix+1}: ${image.width} x ${image.height}, ` +
                `${areaWidth} x ${areaHeight}, scale: ${two(image.scale)}, ` +
                `t: (${two(image.tx)}, ${two(image.ty)})`)

    edge += areaWidth
  })

  // Scroll the current image into view.
  const area = get("area")
  console.log(`leftEdge: ${leftEdges[imageIx]}`)
  area.scrollLeft = leftEdges[imageIx]
  console.log(`area.scrollLeft: ${two(area.scrollLeft)}`)
}

function getZoomPoint(image) {
  // Return the closest close zoom point and a message telling how
  // close it is.  If no close zoom point return one that fits the
  // image to the area.

  // todo: when no close zoom point is found, and one or more zoom
  // points exist, generate a new zoom point based on the closest one
  // found.

  let found = false
  let zoomPoint = null
  let xDistance = closeDistance+1
  let yDistance = closeDistance+1

  // Loop though the zoom points looking for a close one.
  for (let zpt of image.zoomPoints) {
    const xDist = Math.abs(areaWidth - zpt.w)
    const yDist = Math.abs(areaHeight - zpt.h)

    if (xDist < closeDistance && yDist < closeDistance) {
      let combined = xDist + yDist
      if (combined < xDistance + yDistance) {
        found = true
        zoomPoint = zpt
        xDistance = xDist
        yDistance = yDist
        if (combined == 0) {
          break
        }
      }
    }
  }

  // When no zoom point found, fit the image to the area.
  if (!found) {
    // Fix the image in the image area then center it.
    console.assert(image.width != 0)

    // todo: account for the case where the height doesn't fit.
    const fitScale = areaWidth / image.width

    // The upper left corner of the image in image space.
    const tx = 0
    const ty = ((areaHeight / fitScale) - image.height) / 2

    zoomPoint = newZoomPoint(areaWidth, areaHeight, fitScale, tx, ty, true)
  }

  // Return a message with the zoom point.
  const message = (xDistance == 101) ? "not found" : `d: ${two(xDistance)}, ${yDistance}`

  return [zoomPoint, message]
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

function parseXYPos(xypos) {
  // Parse the transform origin style string or the translate style
  // string and return cx and cy numbers.  This assumes it uses px
  // units and 2d space. Returns [null, null] on error.

  // example: 10px 76px

  let x = null
  let y = null
  const parts = xypos.split(" ")
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

function newZoomPoint(w, h, scale, tx, ty, def) {
  // Return a new zoom point.

  // w -- width of the area
  // h -- height of the area
  // scale -- scale of the image
  // tx, ty -- The position of the upper left corner of the image in area space.
  // def -- true for default

  return  {
    "w": w,
    "h": h,
    "scale": scale,
    "tx": tx,
    "ty": ty,
    "def": def,
  }
}

function zpStr(zp) {
  // Return a string representation of a zoom point.

  return `${zp.w} x ${zp.h}, scale: ${two(zp.scale)}, t: (${two(zp.tx)}, ${two(zp.ty)})`
}

// Whether we are zooming an image or not.
let zooming = false

let startCx
let startCy
let startDistance
let startScale
let startTx
let startTy

window.addEventListener('touchstart', (event) => {

  touching = true

  // When not two fingers touching, return.
  if (event.touches.length != 2)
    return

  zooming = true

  // Disable the default browser zoom and pan behavior.
  // todo: disable the whole page instead.
  event.preventDefault()

  // Log the client x and y values.
  const clientX0 = event.touches[0].clientX
  const clientX1 = event.touches[1].clientX
  const clientY0 = event.touches[0].clientY
  const clientY1 = event.touches[1].clientY
  console.log(`touchstart: client0: (${clientX0}, ${clientY0}) client1: (${clientX1}, ${clientY1})`)

  const image = cJson.images[imageIx]

  // Save the point centered between the two fingers, the distance
  // between them, the current translation and the current scale.
  startCx = (clientX0 + clientX1) / 2
  startCy = (clientY0 + clientY1) / 2
  startDistance = Math.hypot(clientX0 - clientX1, clientY0 - clientY1)

  startScale = image.scale
  startTx = image.tx
  startTy = image.ty
  console.log(`touchstart: c: (${two(startCx)}, ${two(startCy)}) d: ${two(startDistance)}, scale: ${two(startScale)}, t: ${two(startTx)}, ${two(startTy)}`)
})


  // const img = get(`i${imageIx+1}`)

  // const image = cJson.images[imageIx]
  // console.log(`touchstart: image: ${two(image.width)}, ${two(image.height)}`)

  // const shiftx = 0 //image.width / 4
  // const shifty = 0 //image.height / 4
  // console.log(`touchstart: shift: ${two(shiftx)}, ${two(shifty)}`)

  // const cx = (image.width / 2) + shiftx
  // const cy = (image.height / 2) + shifty
  // console.log(`touchstart: c: ${two(cx)}, ${two(cy)}`)

  // const tx = -cx + (areaWidth / 2)
  // const ty = -cy + (areaHeight / 2)
  // console.log(`touchstart: t: ${two(tx)}, ${two(ty)}`)

  // const img = get(`i${imageIx+1}`)
  // img.style.transformOrigin = `${cx}px ${cy}px`
  // img.style.translate = `${tx}px ${ty}px`



//   // Save the point centered between the two fingers, the distance
//   // between them and the current scale.
//   startCx = (clientX0 + clientX1) / 2
//   startCy = (clientY0 + clientY1) / 2
//   startDistance = Math.hypot(clientX0 - clientX1, clientY0 - clientY1)
//   const img = get(`i${imageIx+1}`)
//   startScale = parseFloat(img.style.scale, 10)
//   let [cx, cy] = parseXYPos(img.style.transformOrigin)
//   console.assert(cx != -1 && cy != -1)
//   console.log(`touchstart: c: ${two(cx)}, ${two(cy)}`)

//   const image = cJson.images[imageIx]
//   const ncx = startCx * (image.width / areaWidth) + (areaWidth / 2)
//   const ncy = startCy * (image.height / areaHeight) + (areaHeight / 2)
//   console.log(`touchstart: nc: ${two(ncx)}, ${two(ncy)}`)

//   const deltax = ncx - cx
//   const deltay = ncy - cy
//   console.log(`touchstart: delta: ${two(deltax)}, ${two(deltay)}`)

//   // const ictx = -cx + (areaWidth / 2)
//   // const icty = -cy + (areaHeight / 2)

//   // const ncx = icx + deltax
//   // const ncy = icy + deltay
//   const tx = -(ncx + deltax)
//   const ty = -(ncy + deltay)

//   // console.log(`touchstart: delta: ${deltax}, ${deltay}`)

//   img.style.transformOrigin = `${ncx}px ${ncy}px`
//   img.style.translate = `${tx}px ${ty}px`

//   // console.log(`touchstart: ca: (${startCx}, ${startCy}), c: (${two(cx)}, ${two(cy)}), ` +
//   //   `d: ${two(startDistance)}  t: (${two(tx)}, ${two(ty)}), s: ${two(startScale)}`)
// })

window.addEventListener('touchmove', (event) => {

  if (event.touches.length != 2)
    return

  if (!zooming)
    return

  // todo: is this needed?
  event.preventDefault()

  const clientX0 = event.touches[0].clientX
  const clientX1 = event.touches[1].clientX
  const clientY0 = event.touches[0].clientY
  const clientY1 = event.touches[1].clientY
  // console.log(`touchmove: client0: (${clientX0}, ${clientY0}) client1: (${clientX1}, ${clientY1})`)

  const image = cJson.images[imageIx]

  const endCx = (clientX0 + clientX1) / 2
  const endCy = (clientY0 + clientY1) / 2
  const endDistance = Math.hypot(clientX0 - clientX1, clientY0 - clientY1)
  const endScale = (endDistance / startDistance) * startScale

  const endTx = startTx + (endCx - startCx)
  const endTy = startTy + (endCy - startCy)
  // console.log(`touchmove: c: (${two(endCx)}, ${two(endCy)}), d: ${two(endDistance)}, s: ${two(endScale)}, ` +
  //             `t: ${two(endTx)}, ${two(endTy)}`)

  const img = get(`i${imageIx+1}`)
  img.style.transform  = `translate(${endTx}px, ${endTy}px) ` +
    `scale(${endScale})`

  image.scale = endScale
  image.tx = endTx
  image.ty = endTy

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

    zooming = false

    const image = cJson.images[imageIx]
    console.log(`touchend: s: ${two(image.scale)}, t: ${two(image.tx)}, ${two(image.ty)}`)
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

  // Get each image's zoom point from the UI.
  let uiZoomPoints = []
  for (let ix = 0; ix < cJson.images.length; ix++) {
    let img = get(`i${ix+1}`)
    let scale = parseFloat(img.style.scale, 10)
    let [tx, ty] = parseXYPos(img.style.translation)
    console.assert(tx != null && ty != null)
    let uiZp = newZoomPoint(areaWidth, areaHeight, scale, tx, ty, false)
    uiZoomPoints.push(uiZp)
  }

  // Merge in the UI zoom points into a copy of the existing json
  // data.  If the ui zoom point is not the default, add it to the
  // zoom points.  Replace the existing zoom point when the width and
  // height are the same. Tell when the json changes or not.
  const data = structuredClone(cJson);
  let changed = false
  for (let ix = 0; ix < data.images.length; ix++) {
    // Get the image's UI zoom point.
    const uiZp = uiZoomPoints[ix]

    // Skip default zoom points values.
    if (uiZp.def)
      continue

    // Loop over the image zoom points and build a new list of
    // them. If one of image zoom points has the same width and height
    // as the UI zoom point, use the UI zoom point replacing that
    // image zoom point, otherwize use the existing zoom point.
    let newZoomPoints = []
    let foundSameDim = false
    const imageZoomPoints = data.images[ix].zoomPoints
    for (let zpIx = 0; zpIx < imageZoomPoints.length; zpIx++) {
      let zpt = imageZoomPoints[zpIx]

      let zp = {}
      zp = zpt

      // When the dimensions are the same, use the UI zoom point if it
      // is different than the image zoom point.
      let sameDim = (same(zp.w, uiZp.w, .01) && same(zp.h, uiZp.h, .01))
      if (sameDim) {
        foundSameDim = true

        let differentZoom = (different(zp.tx, uiZp.tx, .01) ||
            different(zp.ty, uiZp.ty, .01) ||
            different(zp.scale, uiZp.scale, .01))

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
