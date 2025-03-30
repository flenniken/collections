// Main code file for the maker page. It is compiled by the gulp file
// maker task. Some other ts files are concatenated so functions
// are available that way, for example the log function.

// Current collection information.  It is set when you select a
// collection.
let cinfo: CJson.Collection | null = null;

// The current index thumbnail. It is an index into the image list.
let currentThumbnail: number = 0;

// The current image thumbnail. It is an index into the image list.
let currentImage: number = 0;


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

const imageTitle = get("image-title") as HTMLInputElement
imageTitle.addEventListener('blur', () => {
  if (cinfo) {
    const image = cinfo.images[currentImage]
    image.title = imageTitle.value;
    log(`Store image title: ${image.title}`)
  }
})

const imageDesc = get("image-description") as HTMLTextAreaElement
imageDesc.addEventListener('blur', () => {
  if (cinfo) {
    const image = cinfo.images[currentImage]
    image.description = imageDesc.value;
    log(`Store image description: ${image.description}`)
  }
})


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

  // Set the index thumbnail image to the one specified in the
  // collection or when not specified the first one.
  currentThumbnail = 0
  for (let ix = 0; ix < cinfo.order!.length; ix++) {
    const imageIx = cinfo.order![ix]
    if (imageIx == -1)
      continue
    const image = cinfo.images[imageIx]
    if (image.thumbnail == cinfo.indexThumbnail) {
      currentThumbnail = imageIx
      break
    }
  }
  log(`currentThumbnail: ${currentThumbnail}`)
  setImgElement("index-thumbnail", currentThumbnail)

  setImgElement("image-details", currentImage)
  setImageTitleDesc(currentImage)
}

function setImageTitleDesc(imageIndex: number) {
  console.assert(cinfo != null)
  console.assert(imageIndex != -1)
  const image = cinfo!.images[imageIndex]
  getElement<HTMLInputElement>("image-title").value = image.title
  getElement<HTMLTextAreaElement>("image-description").value = image.description
}

function setImgElement(id: string, imageIndex: number) {
  if (!cinfo) {
    log("No cinfo.")
    return
  }
  const imgElement = get(id) as HTMLImageElement
  if (imageIndex == -1) {
    imgElement.src = "icons/blank.svg"
    imgElement.alt = ""
    log(`Set ${id}'s image to the blank image.`)
  }
  else {
    const image = cinfo.images[imageIndex]
    imgElement.src = image.thumbnail
    imgElement.alt = encodeHtml(image.title)
    log(`Set ${id}'s image to image index ${imageIndex}`)
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

function getPreviousNext(orderList: number[], imageIndex: number) {
  // Return the previous and next index for the given image index
  // wrapping around if necessary, [ix-1, ix+1]. If the image doesn't
  // exist return, [-1, -1]. Return the image index when one image
  // exists, [ix, ix].

  // Make a list of the non-negative image indexes from the order
  // list.
  let imageIndexes = []
  for (let ix = 0; ix < orderList.length; ix++) {
    const imageIx = orderList[ix]
    if (imageIx != -1) {
      imageIndexes.push(imageIx)
    }
  }

  // Find the image index.
  let iix = -1
  for (let ix = 0; ix < imageIndexes.length; ix++) {
    if (imageIndexes[ix] == imageIndex) {
      iix = ix
      break
    }
  }
  if (iix == -1)
    return [-1, -1]

  let previousOrderIx = iix-1
  if (previousOrderIx < 0)
    previousOrderIx = imageIndexes.length - 1
  const previous = imageIndexes[previousOrderIx]

  let nextOrderIx = iix+1
  if (nextOrderIx >= imageIndexes.length)
    nextOrderIx = 0
  const next = imageIndexes[nextOrderIx]

  return [previous, next]
}

function noCinfo(): boolean {
  if (cinfo == null || !cinfo.order) {
    log("No cinfo or no order array.")
    return true
  }
  return false
}

function goPreviousNext(id: string, imageIndex: number, goNext: boolean) {
  if (noCinfo())
    return 0

  const [previous, next] = getPreviousNext(cinfo!.order!, imageIndex)
  if (next == -1)
    return 0

  const index = goNext ? next : previous
  setImgElement(id, index)

  if (id == "image-details")
    setImageTitleDesc(index)

  return index
}

function previousImage() {
  currentImage = goPreviousNext("image-details", currentImage, false)
}

function nextImage() {
  currentImage = goPreviousNext("image-details", currentImage, true)
}

function indexPreviousImage() {
  currentThumbnail = goPreviousNext("index-thumbnail", currentThumbnail, false)
}

function indexNextImage() {
  currentThumbnail = goPreviousNext("index-thumbnail", currentThumbnail, true)
}

// Test code:

function gotExpected(got: any, expected: any) {
  if (got !== expected) {
    const message = `
Error:
     got: ${got}
expected: ${expected}
`
    throw new Error(message)
  }
  return 0
}

function testGetPreviousNext(orderList: number[], imageIndex: number,
    ePrevious: number, eNext: number) {
  const [previous, next] = getPreviousNext(orderList, imageIndex)
  gotExpected(previous, ePrevious)
  gotExpected(next, eNext)
  return 0
}

let testNumber = 1
function test(rc: number): void {
  log(`${testNumber}: ✅ pass`)
  testNumber += 1
}

function testMaker() {
  const [previous, next] = getPreviousNext([], 0)
  test(gotExpected(previous, -1))
  test(gotExpected(next, -1))

  const fn = testGetPreviousNext
  test(fn([], 0, -1, -1))
  test(fn([-1], 0, -1, -1))
  test(fn([-1,-1], 0, -1, -1))
  test(fn([1], 6, -1, -1))
  test(fn([1,-1], 6, -1, -1))
  test(fn([1], 1, 1, 1))
  test(fn([8,7], 7, 8, 8))
  test(fn([8,7], 8, 7, 7))
  test(fn([1,3,2], 1, 2, 3))
  test(fn([1,3,2], 2, 3, 1))
  test(fn([1,3,2], 3, 1, 2))
  test(fn([-1,5,-1,-1,8,-1,3,-1], 8, 5, 3))

  log("success")
  return 0
}
