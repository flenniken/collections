// thumbnails.js
"use strict";

window.addEventListener("load", showPageSize)
window.addEventListener("resize", showPageSize)

function showPageSize() {
  // Show the width and height of the page.

  var width = window.innerWidth || document.documentElement.clientWidth ||
    document.body.clientWidth;

  var height = window.innerHeight || document.documentElement.clientHeight ||
      document.body.clientHeight;

  // var availWidth = window.screen.availWidth
  // var availHeight = window.screen.availHeight

  document.getElementById("width").innerHTML = width.toString()
  document.getElementById("height").innerHTML = height.toString()
}
