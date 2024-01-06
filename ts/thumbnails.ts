// Code for the thumbnails page.

window.addEventListener("load", showPageSize)

function get(id: string) {
  // Get the dom element with the given id. Generate and exception
  // when not found.
  const element = document.getElementById(id)
  if (!element)
    throw `Element with "${id}" not found.`
  return element
}

function showPageSize() {
  // Show the width and height of the page.

  var width = window.innerWidth || document.documentElement.clientWidth ||
    document.body.clientWidth

  var height = window.innerHeight || document.documentElement.clientHeight ||
      document.body.clientHeight

  // var availWidth = window.screen.availWidth
  // var availHeight = window.screen.availHeight

  get("width").innerHTML = width.toString()
  get("height").innerHTML = height.toString()
}
