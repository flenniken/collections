// Code for the thumbnails page.

function get(id: string) {
  // Get the dom element with the given id. Generate and exception
  // when not found.
  const element = document.getElementById(id)
  if (!element)
    throw new Error(`Element with "${id}" not found.`)
  return element
}
