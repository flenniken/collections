// Main code file for the maker page. It is compile by the gulp file
// maker task. Some other ts files are concatenated so functions
// are available that way, for example the log function.

window.addEventListener("load", handleLoad)
window.addEventListener("resize", handleResize)

const collectionDropdown = get("collection-dropdown") as HTMLSelectElement;
collectionDropdown.addEventListener("change", selectCollection)

async function handleLoad() {
  log("Window load event")
}

function getCollectionNumber(selected: string) {
  // Parse the collection number from the selected string and return
  // the number. Return null on error.

  const prefix = "collection"
  if (!selected.startsWith(prefix)) {
    return null
  }

  const numberStr = selected.slice(prefix.length)
  try {
    const num = parseInt(numberStr, 10)
    if (Number.isNaN(num))
      return null
    return num
  }
  catch {
    return null
  }
}

async function fetchCJson(num: number): Promise<CJson.Collection> {
  // Load the collection's cjson file.

  const url = `/images/c${num}/c${num}.json`
  const response = await fetch(url)
  if (!response.ok) {
    log(`Unable to fetch the url: ${url}`)
    throw new Error(`HTTP status: ${response.status}`)
  }
  return await response.json()
}

function encodeHtml(text: string) {
  // Return the given text where the html special characters are encoded
  // with their equivalent safe entities, < to &lt; etc.
  return document.createElement('div').textContent = text
}

async function selectCollection(event: Event) {
  // Populate the page with the selected collection.

  // Parse the selection string to get the collection number.
  const target = event.target as HTMLSelectElement;
  const selected = target.value
  log("Populate the page. Selected value:", selected);
  const num = getCollectionNumber(selected)
  if (num == null) {
    log(`Invalid selection.`)
    return
  }

  // Read the cjson file.
  let cinfo: CJson.Collection
  try {
    cinfo = await fetchCJson(num)
    log(cinfo)
  }
  catch {
    log("Fetch of cjson failed.")
    return
  }

  // Loop through the images and put them in the collection images on
  // the left or in the available images on the right. Hide the
  // available image boxes not used.
  let cindex = 0
  for (let ix = 0; ix < cinfo.images.length; ix++) {

    // Look for the index in the usedImages list.
    const used = cinfo.usedImages.includes(ix)

    // <div id="c0" class="image-box collection-box">
    //   <img id="ci0" src="icons/blank.svg" alt="Image 1">

    const image = cinfo.images[ix]

    let imgElement: HTMLImageElement
    if (used) {
      // The image goes in the collection.
      imgElement = get(`ci${cindex}`) as HTMLImageElement
      cindex += 1

      // Hide the available box.
      get(`a${ix}`).style.display = "none"
    }
    else {
      // The image goes in the available images section.
      imgElement = get(`ai${ix}`) as HTMLImageElement
    }
    imgElement.src = image.thumbnail
    imgElement.alt = encodeHtml(image.title)
  }

  // Hide any remaining unused available image boxes.
  for (let ix = cinfo.images.length; ix < 20; ix++) {
    get(`a${ix}`).style.display = "none"
  }
  log("success")
}

function handleResize() {
  log("resize event")
}
