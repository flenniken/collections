// Main code file for the maker page. It is compile by the gulp file
// maker task. Some other ts files are concatenated so functions
// are available that way, for example the log function.

window.addEventListener("load", handleLoad)
window.addEventListener("resize", handleResize)

async function handleLoad() {
  log("Window load event")

}

function handleResize() {
  log("resize event")
}

