// Main code file for the maker page. It is compiled by the gulp file
// maker task. Some other ts files are concatenated so functions
// are available that way, for example the log function.

// Current collection information.  It is set when you select a
// collection.
let cinfo: CJson.Collection | null = null;

// The current index thumbnail. It is an index into the order list.
let currentIndexThumbnail: number = 0;

// The current image thumbnail. It is an index into the order list.
let currentImageThumbnail: number = 0;


getElement<HTMLSelectElement>("collection-dropdown")
  .addEventListener("change", populateCollection)

getElement<HTMLElement>("save-button")
  .addEventListener("click", saveCollection)

const tie = get("collection-title") as HTMLInputElement
tie.addEventListener('blur', () => {
  if (cinfo) {
    cinfo.title = tie.value;
    log(`Store title: ${cinfo.title}`)
  }
})

const dse = get("description") as HTMLTextAreaElement
dse.addEventListener('blur', () => {
  if (cinfo) {
    cinfo.description = dse.value;
    log(`Store description: ${cinfo.description}`)
  }
})

const ide = get("index-description") as HTMLTextAreaElement;
ide.addEventListener('blur', () => {
  if (cinfo) {
    cinfo.indexDescription = ide.value;
    log(`Store index description: ${cinfo.indexDescription}`)
  }
});

const ite = get("index-thumbnail") as HTMLTextAreaElement;
ite.addEventListener('blur', () => {
  if (cinfo) {
    cinfo.indexThumbnail = ite.value;
    log(`Store the index thumbnail: ${cinfo.indexThumbnail}`)
  }
});

const pde = get("post-date") as HTMLInputElement;
pde.addEventListener('blur', () => {
  if (cinfo) {
    cinfo.posted = pde.value;
    log(`Store post date: ${cinfo.posted}`)
  }
});

// Add click event handlers for the collection images.
for (let ix = 0; ix < 16; ix++) {
  const collectionImgElement = get(`ci${ix}`) as HTMLImageElement
  collectionImgElement.addEventListener('click', () =>
    handleCollectionImageClick(ix))
}
// Add click event handlers for the available images.
for (let ix = 0; ix < 20; ix++) {
  getElement<HTMLImageElement>(`ai${ix}`)
    .addEventListener('click', () => handleAvailableImageClick(ix))
}

getElement<HTMLElement>("previous-image")
  .addEventListener('click', () => previousImage())
getElement<HTMLElement>("next-image")
  .addEventListener('click', () => nextImage())
getElement<HTMLElement>("index-previous-image")
  .addEventListener('click', () => indexPreviousImage())
getElement<HTMLElement>("index-next-image")
  .addEventListener('click', () => indexNextImage())


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

  // Add the time to the url so it is not found in the cache.
  const timestamp = new Date().getTime()
  const url = `/images/c${num}/c${num}.json?t=${timestamp}`

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

function getElement<T extends HTMLElement>(id: string): T {
  const element = get(id)
  return element as T;
}

async function populateCollection(event: Event) {
  // Populate the page with the selected collection.

  if (cinfo != null) {
    log("cinfo already populated.")
  }
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
  }
  catch {
    log("Fetch of cjson failed.")
    return
  }
  log(cinfo)

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

  getElement<HTMLInputElement>("post-date").value = cinfo.posted
  getElement<HTMLTextAreaElement>("description").value = cinfo.description
  getElement<HTMLTextAreaElement>("index-description").value = cinfo.indexDescription
  getElement<HTMLInputElement>("collection-title").value = cinfo.title

  if (cinfo.indexThumbnail != "")
    getElement<HTMLInputElement>("index-thumbnail").value = cinfo.indexThumbnail
  else
    getElement<HTMLInputElement>("index-thumbnail").value = "icons/blank.svg"

  // Set the image details image to the first one in the collection.
  setImageDetailsThumbnail(cinfo.order![0])
}

function setImageDetailsThumbnail(index: number) {
  if (!cinfo) {
    log("No cinfo.")
    return
  }
  const detailsElement = get("image-details") as HTMLImageElement
  if (index == -1) {
    detailsElement.src = "icons/blank.svg"
    detailsElement.alt = ""
    log("Added blank image to image details.")
  }
  else {
    const image = cinfo.images[index]
    detailsElement.src = image.thumbnail
    detailsElement.alt = encodeHtml(image.title)
    log(`Added image index ${index} to image details.`)
  }
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

  const availableIx = cinfo.order[collectionIndex]
  const availableBox = get(`a${availableIx}`) as HTMLElement
  const availableImg = get(`ai${availableIx}`) as HTMLImageElement

  // Set initial state for animation
  availableImg.style.transition = 'opacity 0.5s ease-in-out'
  availableBox.style.display = "block"
  availableImg.style.opacity = '0'

  // Use requestAnimationFrame to ensure the initial state is rendered
  requestAnimationFrame(() => {
    availableImg.style.opacity = '1'
  })

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
  getElement<HTMLElement>(`a${availIndex}`).style.display = "none"

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

function nextImage() {
  log('nextImage')
  if (cinfo == null || !cinfo.order) {
    log("No cinfo or no order array.")
    return
  }

  // Loop through the order array until you find the next non-negative
  // value. Then show this image. Wrap around when you get to the
  // end. Stop if you get back to where you started.

  let orderIndex = currentImageThumbnail
  for (let ix = 0; ix < cinfo.order.length; ix++) {
    orderIndex += 1
    if (orderIndex >= cinfo.order.length) {
      orderIndex = 0
    }
    if (cinfo.order[orderIndex] != -1) {
      // Found the next image.
      currentImageThumbnail = orderIndex
      setImageDetailsThumbnail(cinfo.order[orderIndex])
      break
    }
  }
}

function previousImage() {
  log('previousImage')
  if (cinfo == null || !cinfo.order) {
    log("No cinfo or no order array.")
    return
  }
  let orderIndex = currentImageThumbnail
  for (let ix = 0; ix < cinfo.order.length; ix++) {
    orderIndex -= 1
    if (orderIndex < 0) {
      orderIndex = cinfo.order.length - 1
    }
    if (cinfo.order[orderIndex] != -1) {
      // Found the next image.
      currentImageThumbnail = orderIndex
      setImageDetailsThumbnail(cinfo.order[orderIndex])
      break
    }
  }
}


function indexPreviousImage() {
  log('indexPreviousImage')
  // currentIndexThumbnail
}

function indexNextImage() {
  log('indexNextImage')
  // currentIndexThumbnail
}
