// thumbnails.js
"use strict";

window.addEventListener("load", showPageSize)
window.addEventListener("resize", showPageSize)

function showPageSize() {
  // Show the width and height of the page.

  var width = window.innerWidth || document.documentElement.clientWidth ||
    document.body.clientWidth

  var height = window.innerHeight || document.documentElement.clientHeight ||
      document.body.clientHeight

  // var availWidth = window.screen.availWidth
  // var availHeight = window.screen.availHeight

  document.getElementById("width").innerHTML = width.toString()
  document.getElementById("height").innerHTML = height.toString()
}

// Handle swiping down to go back to the collections page.

document.addEventListener('touchstart', handleTouchStart, false)
document.addEventListener('touchmove', handleTouchMove, false)
document.addEventListener('touchend', handleTouchEnd, false)
document.addEventListener('touchcancel', handleTouchEnd, false)

var xDown = null
var yDown = null
var xPt = null
var yPt = null

function handleTouchStart(evt) {
  const firstTouch = evt.touches[0]
  xDown = firstTouch.clientX
  yDown = firstTouch.clientY
}

function handleTouchMove(evt) {
  if (!xDown || !yDown)
    return
  xPt = evt.touches[0].clientX
  yPt = evt.touches[0].clientY
  console.log(`${xPt},${yPt}`)
}

function handleTouchEnd(evt) {
  if (!xDown || !yDown)
    return
  if (!xPt || !yPt)
    return
  const xDiff = xDown - xPt
  const yDiff = yDown - yPt

  if (Math.abs(xDiff) > Math.abs(yDiff)) {
    if (xDiff > 0) {
      console.log(`swipe right: xDiff = ${xDiff}`)
    } else {
      console.log(`swipe left: xDiff = ${xDiff}`)
    }
  } else {
    if (yDiff > 0) {
      console.log(`swipe up: yDiff = ${yDiff}`)
    } else {
      console.log(`swipe down: yDiff = ${yDiff}`)
      window.location.href = "../index.html"
    }
  }
  xDown = null
  yDown = null
  xPt = null
  yPt = null
}
