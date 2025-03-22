// Main code file for the maker page. It is compiled by the gulp file
// maker task. Some other ts files are concatenated so functions
// are available that way, for example the log function.

// Add a event handler for the collection dropdown.
const collectionDropdown = get("collection-dropdown") as HTMLSelectElement;
collectionDropdown.addEventListener("change", populateCollection)

const saveButton = get("save-button") as HTMLElement;
saveButton.addEventListener("click", saveCollection)

// Add click event handlers for the collection images.
for (let ix = 0; ix < 16; ix++) {
  const collectionImgElement = get(`ci${ix}`) as HTMLImageElement
  collectionImgElement.addEventListener('click', () =>
    handleCollectionImageClick(ix))
}
// Add click event handlers for the available images.
for (let ix = 0; ix < 20; ix++) {
  const availableElement = get(`ai${ix}`) as HTMLImageElement
  availableElement.addEventListener('click', () =>
    handleAvailableImageClick(ix))
}

// This variable is the current collection information.
// It is set when you select a collection.
let cinfo: CJson.Collection | null = null;

function getCollectionNumber(selected: string) {
  // Parse the collection number from the selected string and return
  // the number. Return null on error.  For the string
  // collection34, 34 is returned.

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
  // Load the collection's cjson file given the collection number.

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

async function populateCollection(event: Event) {
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
  try {
    cinfo = await fetchCJson(num)
    log(cinfo)
  }
  catch {
    log("Fetch of cjson failed.")
    return
  }

  // When the order variable is missing make one using the images
  // natural order.
  if (!("order" in cinfo)) {
    cinfo.order = []
    for (let ix = 0; ix < cinfo.images.length; ix++) {
      if (ix < 16)
        cinfo.order.push(ix)
      else
        cinfo.order.push(-1)
    }
  }
  log(`cinfo.order: ${cinfo.order}`)

  // Loop through the images and put them in the collection images on
  // the left or in the available images on the right. Hide the
  // available image boxes not used.

  // c0 is the element id for box 0 and ci0 is the element index of
  // its collection image and the same goes for available images, a0
  // and ai0.

  // All images go in the available section. We hide and show them
  // when clicked.
  for (let ix = 0; ix < 20; ix++) {
    if (ix < cinfo.images.length) {
      const aImgElement = get(`ai${ix}`) as HTMLImageElement
      const image = cinfo.images[ix]
      aImgElement.src = image.thumbnail
      aImgElement.alt = encodeHtml(image.title)
    }
    else {
      // Hide the blank available boxes.
      get(`a${ix}`).style.display = "none"
    }
  }

  // Fill in the collection images and hide them in the available
  // images section.
  let nextCix = 0
  for (let ix = 0; ix < cinfo.images.length; ix++) {

    const orderIx = cinfo.order![ix]

    // Put the non -1 images in the collection and hide its associated
    // available image.
    if (orderIx != -1) {
      const image = cinfo.images[orderIx]

      // Put the image in the collection.
      const imgElement = get(`ci${nextCix}`) as HTMLImageElement
      imgElement.src = image.thumbnail
      imgElement.alt = encodeHtml(image.title)

      // Hide the associated available box.
      get(`a${orderIx}`).style.display = "none"

      nextCix++
    }
  }

  log("success")
}

async function handleCollectionImageClick(collectionIndex: number) {
  // Move the collection image to the available images section.

  log(`Collection image ${collectionIndex} clicked.`)

  if (cinfo == null || !cinfo.order) {
    log("No cinfo or no order array.")
    return
  }
  if (cinfo.order[collectionIndex] == -1) {
    log("No image here.")
    return
  }

  // Put the blank image back.
  const collectionImg = get(`ci${collectionIndex}`) as HTMLImageElement
  collectionImg.src = "icons/blank.svg"
  collectionImg.alt = `Image ${collectionIndex+1}`

  // Display the available image.
  const availableIx = cinfo.order[collectionIndex]
  const availableBox = get(`a${availableIx}`) as HTMLElement
  availableBox.style.display = "block"
  log(`availableIx: ${availableIx}`)

  // Set the order value to -1.
  cinfo.order[collectionIndex] = -1
  log(`Remove from the image order list. order: ${cinfo.order}`)
}

async function handleAvailableImageClick(availIndex: number) {
  // Move the available image to the collection's next free spot.
  log(`Available image ${availIndex} clicked.`)

  if (cinfo == null || !cinfo.order) {
    log("No cinfo or no order list.")
    return
  }

  // Find the first collection image that's blank, first -1 in the
  // order list.
  const firstBlankIx = cinfo.order?.indexOf(-1)
  if (firstBlankIx == -1 || firstBlankIx >= 16) {
    log("The collection is full.")
    return
  }
  log(`The first available collection index: ${firstBlankIx}`)

  // Hide the available box.
  const availableBox = get(`a${availIndex}`) as HTMLElement
  availableBox.style.display = "none"

  // Copy the source and alt text from the available image.
  const collectionImg = get(`ci${firstBlankIx}`) as HTMLImageElement
  const availableImg = get(`ai${availIndex}`) as HTMLImageElement

  collectionImg.src = availableImg.src
  collectionImg.alt = availableImg.alt

  // Add to used images list in the collection info
  cinfo.order[firstBlankIx] = availIndex
  log(`Added to the image order list. order: ${cinfo.order}`)
}

async function saveCollection(event: Event) {
  // Download the cjson file.
  log("The save-button was clicked.")

  if (!cinfo) {
    log("No collection info to save.")
    return
  }

  // Convert collection info to a json string.
  const cjson = JSON.stringify(cinfo, null, 2)

  // Create a download link.
  const blob = new Blob([cjson], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `c${cinfo.collection}.json`

  // Trigger download.
  document.body.appendChild(a)
  a.click()

  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
