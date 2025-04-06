// Main code file for the maker page. It is compiled by the gulp file
// maker task. Some other ts files are concatenated so functions
// are available that way, for example the log function.

// Current collection information.  It is set when you select a
// collection.
let cinfo: CJson.Collection | null = null;

// The current index thumbnail. It is an index into the image list.
let currentThumbnailIx: number = 0;

// The current image thumbnail. It is an index into the image list.
let currentImageIx: number = 0;

// These are boxes for images in the collection. Each number refers
// to an image object index. Empty ones are -1. It has 16 entries.
let collectionImages: number[]

// You can build the cinfo.order list from the collectionImages.

// let order: number[]
// for (let ix = 0; ix < cinfo.images.length; ix++) {
//   order.push(-1)
// }
// for (let ix = 0; ix < 16; ix++) {
//   imageIndex = collectionImages[ix]
//   if (imageIndex != -1)
//     order[imageIndex] = ix
// }


// You can look up the image in a box:
// imageIndex = collectionImages[ix]
// if (imageIndex != -1)
//   image = cinfo.images[imageIndex]
//
//     cinfo.images[]: 0 1 2 ... n  -- contains image objects where length is 8 - 20.
//          available: 0 1 2 ... 19 -- page element ids, abx, aix
//         collection: 0 1 2 ... 15 -- page element ids, cbx, cix
// collectionImages[]: 0 1 2 ... 15  -- contains indexes to images or -1


getElement<HTMLSelectElement>("collection-dropdown")
  .addEventListener("change", populateCollection)


addClickListener("save-button", saveCollection)

function storeText(field: TextType, requiredId: RequiredIdType, text: string): void {
  // Store the text in the cinfo field and update the required status
  // of the associated page element.
  if (cinfo == null)
    return
  cinfo[field] = text;
  setRequired(requiredId, text ? false : true)
  log(`Stored text in field "cinfo.${field}": ${text}`)
}

type ImageTextType = "title" | "description";
function storeImageText(field: ImageTextType, requiredId: RequiredIdType,
    imageIndex: number, text: string): void {
  // Store the text in the cinfo field of the given image and update
  // the required status of the associated page element.
  if (cinfo == null)
    return

  const image = cinfo.images[imageIndex];
  image[field] = text;

  setRequired(requiredId, text ? false : true);
  log(`Stored text in field "image.${field}": ${text}`);
}

function storeIndexThumbnail(cinfo: CJson.Collection | null,
    url: string): void {
  // Store the image url in the cinfo index thumbnail field and update
  // the required status of the associated page element.  The
  // collection title is used as the alt text.
  if (cinfo) {
    cinfo.indexThumbnail = url;
    setRequired("index-thumbnail-required", true)
    log(`Stored the index thumbnail url: ${url}`);
  }
  else {
    setRequired("index-thumbnail-required", true)
  }
}
type TextType = "title" | "description" | "indexDescription" | "posted";
function addBlurListener(id: string, field: TextType,
    requiredId: RequiredIdType) {
  const element = get(id) as HTMLTextAreaElement;
  element.addEventListener('blur', () => {
    storeText(field, requiredId, element.value)
  });
}

addBlurListener("collection-title", "title", "collection-title-required")
addBlurListener("description", "description", "description-required")
addBlurListener("index-description", "indexDescription", "index-description-required")
addBlurListener("post-date", "posted", "post-date-required")

function addBlurImageTextListener(id: string, field: ImageTextType, requiredId: RequiredIdType) {
  const element = get(id) as HTMLTextAreaElement;
  element.addEventListener('blur', () => {
    storeImageText(field, requiredId, currentImageIx, element.value)
  });
}

addBlurImageTextListener("image-title", "title", "")
addBlurImageTextListener("image-description", "description",
  "image-description-required")

// Add click event handlers for the collection images.
for (let ix = 0; ix < 16; ix++) {
  const collectionImgElement = get(`ci${ix}`) as HTMLImageElement
  collectionImgElement.addEventListener('click', (event) => {
    // The cmd/alt key is handled by handleCmdAltClick.
    if (event.metaKey || event.altKey) {
      return
    }
    collectionImageClick(ix)
  })
}
// Add click event handlers for the available images.
for (let ix = 0; ix < 20; ix++) {
  const img = get(`ai${ix}`) as HTMLImageElement;
  img.addEventListener('click', (event) => {
    availableImageClick(ix)
  })
}

addClickListener("previous-image", previousImage)
addClickListener("next-image", nextImage)
addClickListener("index-previous-image", indexPreviousImage)
addClickListener("index-next-image", indexNextImage)

// Add cmd/alt click event handlers for the collection boxes.
for (let ix = 0; ix < 16; ix++) {
  const collectionImgElement = get(`cb${ix}`) as HTMLImageElement;
  collectionImgElement.addEventListener('click', (event) => {
    if (event.metaKey || event.altKey) {
      handleCmdAltClick(ix);
    }
  });
}

function addClickListener(id: string, listener: (this: HTMLElement, ev: MouseEvent) => void) {
  const element = get(id) as HTMLElement
  element.addEventListener('click', listener)
}

function handleCmdAltClick(collectionIndex: number) {
  // Shift the collection images up or down.
  log(`Cmd/Alt clicked on collection box ${collectionIndex}.`);
  if (cinfo == null)
    return

  shiftImages(collectionImages, collectionIndex)
  log(`Shifted the images. order: ${collectionImages}`)

  // Update the collection images to match the new order.
  for (let ix = 0; ix < 8; ix++) {
    setImage(`ci${ix}`, `cb${ix}`, collectionImages[ix])
  }
  for (let ix = 8; ix < 16; ix++) {
    setImage(`ci${ix}`, null, collectionImages[ix])
  }
}

function shiftImages(orderList: number[], collectionIndex: number) {
  // Shift the entries in the given order list.  If the clicked box is
  // blank (-1), shift the images below up one space. If the box
  // contains an image (not -1), shift the images below down one
  // space.

  const imageIx = orderList[collectionIndex]
  if (imageIx == -1) {
    // Shift the images below up one space.

    // Remove the item clicked on and add a -1 to the end of the list.
    orderList.splice(collectionIndex, 1);
    orderList.push(-1);
  }
  else {
    // Shift the images below down one space. They move down to the first
    // blank image box.

    // If there are no blank image boxes below, you cannot shift them.
    const nextBlankIx = orderList.indexOf(-1, collectionIndex + 1);
    if (nextBlankIx == -1) {
      //log("Cannot shift the images. No blank image boxes below.")
      return
    }
    // Remove the blank image below from the list.
    orderList.splice(nextBlankIx, 1);

    // Insert a blank image in the list where the clicked image was
    // without removing the element.
    orderList.splice(collectionIndex, 0, -1);
  }
}

function parseSelection(selected: string) {
  // Parse the collection number from the selected string and return
  // the number. Return null on error.  For the string
  // "collection34", 34 is returned.

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

// todo: make sure text we put on the page is encoded. See all the set
// methods.

function encodeHtml(text: string) {
  // Return the given text where the html special characters are encoded
  // with their equivalent safe entities, < to &lt; etc.
  return document.createElement('div').textContent = text
}

function getElement<T extends HTMLElement>(id: string): T {
  const element = get(id)
  return element as T;
}

function setText(element_id: string, requiredId: RequiredIdType, text: string) {
  // Set the text of the page element and update its required status.
  const element = get(element_id) as HTMLElement
  element.textContent = text
  setRequired(requiredId, text ? false : true)
}

async function populateCollection(event: Event) {
  // Populate the page with the selected collection.

  if (cinfo != null) {
    log("cinfo already populated.")
    return
  }

  // Parse the selection string to get the collection number.
  const target = event.target as HTMLSelectElement;
  const selected = target.value
  log("Populate the page. Selected value:", selected);
  const num = parseSelection(selected)
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

  collectionImages = []
  for (let ix = 0; ix < 16; ix++) {
    collectionImages.push(-1)
  }
  // Make the collectionImages list from the order list.
  if ("order" in cinfo) {
    log(`cinfo.order: ${cinfo.order!}`)
    for (let ix = 0; ix < cinfo.images.length; ix++) {
      const order = cinfo.order![ix]
      if (ix < 16)
        collectionImages[ix] = order
    }
  }
  log(`collectionImages: ${collectionImages}`)

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
      setImage(`ai${ix}`, null, ix)
    }
    else {
      // Hide the blank available boxes.
      get(`ab${ix}`).style.display = "none"
    }
  }

  // Fill in the collection images and hide them in the available
  // images section.
  for (let ix = 0; ix < 16; ix++) {
    const imageIx = collectionImages[ix]
    setImage(`ci${ix}`, null, imageIx)

    let required: boolean
    if (imageIx == -1 && ix < 8)
      required = true
    else
      required = false
    setRequired(`cb${ix}`, required)

    // Hide the available image if we put a real image in the
    // collection (not -1).
    if (imageIx != -1) {
      // Hide the associated available box.
      get(`ab${imageIx}`).style.display = "none"
    }
  }

  setText("post-date", "post-date-required", cinfo.posted)
  setText("description", "description-required", cinfo.description)
  setText("index-description", "index-description-required", cinfo.indexDescription)
  setText("collection-title", "collection-title-required", cinfo.title)

  // Set the index thumbnail image to the one specified in the cinfo
  // if it is part of the collection, else 0.
  currentThumbnailIx = 0
  for (let ix = 0; ix < 16; ix++) {
    const imageIx = collectionImages[ix]
    if (imageIx == -1)
      continue
    const image = cinfo.images[imageIx]
    if (image.thumbnail == cinfo.indexThumbnail) {
      currentThumbnailIx = imageIx
      break
    }
  }
  log(`currentThumbnail: ${currentThumbnailIx}`)
  setImage("index-thumbnail", "index-thumbnail-required", currentThumbnailIx)

  // Set the image details section with the first image in the
  // collection.
  setImageDetails(currentImageIx)
}

function setImageDetails(currentImageIx: number) {
  // Set the image details section with the image, image title and
  // image description.
  if (cinfo == null)
    return

  const imageIx = collectionImages[currentImageIx]
  let imageTitle: string
  let imageDescription: string
  if (currentImageIx != -1) {
    const image = cinfo!.images[imageIx]
    imageTitle = image.title
    imageDescription = image.description
  }
  else {
    imageTitle = ""
    imageDescription = ""
  }
  setImage("image-details", "image-details-required", currentImageIx)
  setText("image-title", null, imageTitle)
  setText("image-description", "image-description-required", imageDescription)
}

function setImage(id: string, requiredId: RequiredIdType,
    imageIndex: number) {
  // Set the image page element to the collection image with the given
  // imageIndex. If the imageIndex is -1, set blank. Set the required
  // status of the element.
  let required: boolean
  const element = get(id) as HTMLImageElement
  if (!cinfo || imageIndex == -1) {
    element.src = "icons/blank.svg"
    element.alt = ""
    required = true
  }
  else {
    const image = cinfo.images[imageIndex]
    element.src = image.thumbnail
    element.alt = image.title
    required = false
  }
  setRequired(requiredId, required)
}

async function collectionImageClick(collectionIndex: number) {
  // Move the collection image to the available images section.
  log(`Collection image ${collectionIndex} clicked.`)

  if (cinfo == null)
    return
  if (collectionImages[collectionIndex] == -1) {
    log("No image here.")
    return
  }

  // Put the blank image back.
  setImage(`ci${collectionIndex}`, `cb${collectionIndex}`, collectionIndex)

  const availableIx = collectionImages[collectionIndex]
  const availableBox = get(`ab${availableIx}`) as HTMLElement
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
  collectionImages[collectionIndex] = -1
  log(`Remove from the image order list. order: ${collectionImages}`)
}

async function availableImageClick(availIndex: number) {
  // Set the next free spot with the clicked available image then hide
  // the available image.
  log(`Available image ${availIndex} clicked.`)

  if (cinfo == null)
    return

  // Find the first collection image that's blank, first -1 in the
  // order list.
  const firstBlankIx = collectionImages.indexOf(-1)
  if (firstBlankIx == -1 || firstBlankIx >= 16) {
    log("The collection is full.")
    return
  }
  log(`The first available collection index: ${firstBlankIx}`)

  // Hide the available box.
  getElement<HTMLElement>(`ab${availIndex}`).style.display = "none"

  // Set the collection box with the available image.
  setImage(`ci${firstBlankIx}`, `cb${firstBlankIx}`, availIndex)

  // Add to used images list in the collection info
  collectionImages[firstBlankIx] = availIndex
  log(`Added to the image order list. order: ${collectionImages}`)

  setRequired(`cb${firstBlankIx}`, false)
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

function goPreviousNext(id: string, requiredId: RequiredIdType,
    imageIndex: number, goNext: boolean) {
  if (cinfo == null)
    return 0

  const [previous, next] = getPreviousNext(collectionImages, imageIndex)
  if (next == -1)
    return 0

  const index = goNext ? next : previous
  setImage(id, requiredId, index)

  return index
}

function previousImage() {
  currentImageIx = goPreviousNext("image-details", "image-details-required",
    currentImageIx, false)
  setImageDetails(currentImageIx)
}

function nextImage() {
  currentImageIx = goPreviousNext("image-details", "image-details-required",
    currentImageIx, true)
  setImageDetails(currentImageIx)
}

function indexPreviousImage() {
  currentThumbnailIx = goPreviousNext("index-thumbnail", "index-thumbnail-required",
    currentThumbnailIx, false)
}

function indexNextImage() {
  currentThumbnailIx = goPreviousNext("index-thumbnail", "index-thumbnail-required",
    currentThumbnailIx, true)
}

type RequiredIdType = string | null;
function setRequired(requiredId: RequiredIdType, status: boolean) {
  // Set the page element required or not. A status true means it is
  // missing and will be marked as required.
  if (requiredId == null)
    return
  const element = get(requiredId) as HTMLElement;
  if (status) {
    // Mark it required.
    element.classList.add('required');
    log(`Mark ${requiredId} required.`)
  }
  else {
    // We have it, mark it not required.
    element.classList.remove('required')
    log(`Mark ${requiredId} is good.`)
  }
  log(`status: ${status}, classList: ${element.classList}`)
}

