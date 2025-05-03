// Main code file for the maker page. It is compiled by the gulp file
// maker task. Some other ts files are concatenated so functions
// are available that way, for example the log function.

// Include the ts files that get concatenated with this file.
/// <reference path="./cjsonDefinition.ts" />
/// <reference path="./win.ts" />
/// <reference path="./all.ts" />

type OptionalCinfo = CJson.Collection | null
type RequiredIdType = string | null;
type ImageTextType = "title" | "description";
type TextType = "title" | "description" | "indexDescription" | "posted";
type ListenerFunction = (this: HTMLElement, ev: MouseEvent) => void

// Current collection information.  It is set when you select a
// collection to edit.
let cinfo: OptionalCinfo = null;

// The current index thumbnail. It is an index into the image list.
let currentThumbnailIx: number = 0;

// The current image thumbnail. It is an index into the image list.
let currentImageIx: number = 0;

addChangeListener("collection-dropdown", selectCollection)
addClickListener("save-button", saveCollection)
addClickListener("remove-unused-button", () => {
  if (cinfo)
    removeUnusedImages(cinfo)
})
addBlurListener("collection-title", "title", "collection-title-required")
addBlurListener("description", "description", "description-required")
addBlurListener("index-description", "indexDescription", "index-description-required")
addBlurListener("post-date", "posted", "post-date-required")
addBlurImageTextListener("image-title", "title", "")
addBlurImageTextListener("image-description", "description", "image-description-required")
addClickListener("previous-image", previousImage)
addClickListener("next-image", nextImage)
addClickListener("index-previous-image", indexPreviousImage)
addClickListener("index-next-image", indexNextImage)

// Add click event handlers for the collection images.
for (let ix = 0; ix < 16; ix++) {
  const collectionImgElement = get(`ci${ix}`) as HTMLImageElement
  collectionImgElement.addEventListener('click', (event) => {
    // The cmd/alt key is handled by cmdAltClick.
    if (event.metaKey || event.altKey) {
      return
    }
    collectionImageClick(cinfo?.order!, ix)
  })
}
// Add click event handlers for the available images.
for (let ix = 0; ix < 20; ix++) {
  const img = get(`ai${ix}`) as HTMLImageElement;
  img.addEventListener('click', (event) => {
    availableImageClick(cinfo?.order!, ix)
  })
}

// Add cmd/alt click event handlers for the collection boxes.
for (let ix = 0; ix < 16; ix++) {
  const collectionImgElement = get(`cb${ix}`) as HTMLImageElement;
  collectionImgElement.addEventListener('click', (event) => {
    if (cinfo && (event.metaKey || event.altKey)) {
      cmdAltClick(cinfo.order!, ix);
    }
  });
}

function addChangeListener(id: string, listener: ListenerFunction) {
  const selectElement = get("collection-dropdown") as HTMLSelectElement
  selectElement.addEventListener("change", selectCollection)
}

function addClickListener(id: string, listener: ListenerFunction) {
  const element = get(id) as HTMLElement
  element.addEventListener('click', listener)
}

function addBlurImageTextListener(id: string, field: ImageTextType, requiredId: RequiredIdType) {
  const element = get(id) as HTMLTextAreaElement;
  element.addEventListener('blur', () => {
    storeImageText(field, requiredId, currentImageIx, element.value)
  });
}

function addBlurListener(id: string, field: TextType,
    requiredId: RequiredIdType) {
  const element = get(id) as HTMLTextAreaElement;
  element.addEventListener('blur', () => {
    storeText(field, requiredId, element.value)
  });
}

// Disable the inputs.
disableInputs(true)

function storeText(field: TextType, requiredId: RequiredIdType, text: string): void {
  // Store the text in the cinfo field and update the required status
  // of the associated page element.
  if (!cinfo)
    return
  cinfo[field] = text;
  setRequired(requiredId, text ? false : true)
  log(`Stored text in field "cinfo.${field}": ${text}`)
}

function storeImageText(field: ImageTextType, requiredId: RequiredIdType,
    imageIndex: number, text: string): void {
  // Store the text in the cinfo image object field and update the
  // required status of the associated page element.
  if (!cinfo)
    return

  const image = cinfo.images[imageIndex];
  image[field] = text;

  setRequired(requiredId, text ? false : true);
  log(`Stored text in field "image.${field}": ${text}`);
}

function cmdAltClick(order: number[], collectionIndex: number) {
  // Handle cmd-click on a collection box. Shift the collection images
  // up or down.
  log(`Cmd/Alt clicked on collection box ${collectionIndex}.`);
  if (!cinfo)
    return

  shiftImages(order, collectionIndex)
  log(`Shifted the images. order: ${order}`)

  // Update the collection images to match the new order.
  for (let ix = 0; ix < 8; ix++) {
    setImage(cinfo.images, `ci${ix}`, `cb${ix}`, order[ix])
  }
  for (let ix = 8; ix < 16; ix++) {
    setImage(cinfo.images, `ci${ix}`, null, order[ix])
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

function parseNonNegativeInt(numberStr: string): number {
  // Parse the given string as a non-negative integer.  Return the
  // integer when the string represents a valid non-negative integer
  // else throw an error.
  if (/^\d+$/.test(numberStr)) {
    const num = parseInt(numberStr, 10);
    if (num >= 0) {
      return num;
    }
  }
  throw new Error("not a valid non-negative integer");
}

async function fetchCJson(num: number): Promise<OptionalCinfo> {
  // Load the collection's cjson file given the collection number.

  // Add the time to the url so it is not found in the cache.
  const timestamp = new Date().getTime()
  const url = `/images/c${num}/c${num}.json?t=${timestamp}`
  const response = await fetch(url)
  if (!response.ok) {
    log(`Unable to fetch the url: ${url}`)
    return null
  }
  return await response.json()
}

function setText(elementId: string, requiredId: RequiredIdType, text: string) {
  // Set the text of the page element and update its required status.
  const element = get(elementId) as HTMLElement;

  if (element instanceof HTMLInputElement ||
      element instanceof HTMLTextAreaElement) {
    element.value = text
  } else {
    element.textContent = text
  }

  setRequired(requiredId, text ? false : true);
  // log(`Set text for element "${elementId}": ${text}`);
}

async function selectCollection(event: Event) {
  // Handle collection select event.  Populate the page with the
  // selected collection.

  // Determine the selected collection number.
  const target = event.target as HTMLSelectElement;
  const name = target.options[target.selectedIndex].text
  const selected = target.value
  log(`Collection ${name} (${selected}) selected`)
  const num = parseNonNegativeInt(selected)

  // Read the cjson file.
  let newCinfo = await fetchCJson(num)
  if (!newCinfo)
    return

  // Populate the page with the collection info.
  const result = populateCollection(newCinfo)

  // Set the globals.
  cinfo = result.cinfo
  cinfo.order = result.order
  currentImageIx = result.imageIx
  currentThumbnailIx = result.thumbnailIx
  log("cinfo: ", cinfo)
}

function isRequired(collectionImages: number[], boxIx: number) {
  // Return whether the collection image box index is required or not.

  const boxEmpty = (collectionImages[boxIx] == -1) ? true : false

  // A full box is not required.
  if (!boxEmpty)
    return false

  // The first 8 boxes are required.
  if (boxIx < 8)
    return true

  // Find the last box with an image.
  let lastBoxIx = -1
  for (let ix = 8; ix < 16; ix++) {
    if (collectionImages[ix] != -1) {
      lastBoxIx = ix
    }
  }

  // If there are no boxes filled in after the first 8,
  // then the empty box is not required.
  if (lastBoxIx == -1)
    return false

  // If the empty box has a full box after it, the empty one is
  // required.
  if (boxIx < lastBoxIx)
    return true

  // The collection count must be 8, 10, 12, 14, or 16.
  // log(`boxIx: ${boxIx}, lastBoxIx: ${lastBoxIx}. even: ${lastBoxIx % 2}`)
  if (boxIx == lastBoxIx + 1 && lastBoxIx % 2 === 0) {
    return true
  }
  return false
}

function createCollectionOrder(order: number[], max: number, availableCount: number) {
  // Create and return the variable used for cinfo.order. Max is the
  // maximum number of images in a collection and availableCount is
  // the number of available images.

  let collectionImages: number[] = []
  for (let ix = 0; ix < max; ix++) {
    collectionImages.push(-1)
  }
  if (order) {
    // Make the order from the existing order and correct invalid
    // indexes.
    for (let ix = 0; ix < availableCount; ix++) {
      const imageIndex = order[ix]
      if (ix < max && imageIndex < availableCount && imageIndex >= -1)
        collectionImages[ix] = imageIndex
    }
  }
  else {
    // When the order variable is missing make one using the images
    // natural order.
    for (let ix = 0; ix < availableCount && ix < max; ix++) {
      collectionImages[ix] = ix
    }
  }
  return collectionImages
}

type PopulateResult = {
  cinfo: CJson.Collection,
  order: number[],
  imageIx: number,
  thumbnailIx: number
}

function populateCollection(newCinfo: CJson.Collection): PopulateResult {
  // Populate the page with the given collection info. Return the
  // cinfo, current image index and current thumbnail index.

  setText("collection-title", "collection-title-required", newCinfo.title)
  setText("post-date", "post-date-required", newCinfo.posted)
  setText("description", "description-required", newCinfo.description)
  setText("index-description", "index-description-required", newCinfo.indexDescription)

  let newOrder: number[]
  if (!newCinfo.order) {
    newOrder = createCollectionOrder(newCinfo.order!, 16, newCinfo.images.length)
    log(`cinfo.order: ${newOrder}`)
  }
  else {
    newOrder = newCinfo.order
  }

  // Loop through the images and put them in the collection images on
  // the left or in the available images on the right. Hide the
  // available image boxes not used.

  // cb0 is the element id for box 0 and ci0 is the element index of
  // its collection image and the same goes for available images, ab0
  // and ai0.

  // All images go in and remain in the available section. We hide and
  // show them when clicked.
  for (let ix = 0; ix < 20; ix++) {
    if (ix < newCinfo.images.length) {
      setImage(newCinfo.images, `ai${ix}`, null, ix)
      get(`ab${ix}`).style.display = "block"
    }
    else {
      // Hide the blank available boxes.
      get(`ab${ix}`).style.display = "none"
    }
  }

  // Fill in the collection images on the left and hide them in the
  // available images section.
  for (let ix = 0; ix < 16; ix++) {
    const imageIx = newOrder[ix]

    const required = isRequired(newOrder, ix)
    setRequired(`cb${ix}`, required)

    setImage(newCinfo.images, `ci${ix}`, null, imageIx)

    // Hide the available image if we put a real image in the
    // collection (not -1).
    if (imageIx != -1) {
      // Hide the associated available box.
      get(`ab${imageIx}`).style.display = "none"
    }
  }

  // Set the index thumbnail image to the one specified in the cinfo
  // if it is part of the collection, else set it to the first image.
  let thumbnailIndex = findThumbnailIx(newOrder, newCinfo.images,
    newCinfo.indexThumbnail)
  if (thumbnailIndex == -1) {
    thumbnailIndex = 0
    newCinfo.indexThumbnail = newCinfo.images[thumbnailIndex].thumbnail
  }
  currentThumbnailIx = thumbnailIndex
  setImage(newCinfo.images, "index-thumbnail", "index-thumbnail-required", thumbnailIndex)
  log(`thumbnailIndex: ${thumbnailIndex}`)
  const thumbnailImg = get("index-thumbnail") as HTMLImageElement
  log(thumbnailImg)

  // Set the image details section with the first image in the
  // collection or if blank, set it to the first available image.
  let imageIndex = newOrder[0]
  if (imageIndex == -1)
    imageIndex = 0
  setImgDetails(newCinfo.images, imageIndex)

  // Hide the test container.
  const testContainer = get("test-container") as HTMLElement
  testContainer.style.display = "none"

  // Enable the inputs.
  disableInputs(false)

  updateStatusMessage(newCinfo)

  const populateResult = {
    cinfo: newCinfo,
    order: newOrder,
    imageIx: imageIndex,
    thumbnailIx: thumbnailIndex
  }
  return populateResult
}

function updateStatusMessage(cjsoninfo: CJson.Collection) {
  // Show the status of the collection and update its cState.
  // Maintain the status icon, message and used image button.

  // Count the number of used images.
  let usedImageCount = 0
  if (!cjsoninfo.order)
    usedImageCount = cjsoninfo.images.length
  else {
    for (let i = 0; i < 16; i++) {
      if (cjsoninfo.order[i] != -1) {
        usedImageCount++;
      }
    }
  }

  const requiredIcon = get("status-icon") as HTMLImageElement
  const requiredFields = document.querySelectorAll('.required')
  const statusMessage = get("status-message") as HTMLElement
  const removeUnusedButton = get("remove-unused-button") as HTMLButtonElement

  if (requiredFields.length > 0) {
    // There are required fields, show the required message.
    statusMessage.textContent = "Please fill in the required fields."
    requiredIcon.src = "icons/red-circle.svg"
    removeUnusedButton.style.display = "none"
    cjsoninfo.cState = "build"
  }
  else {
    // No required fields, show the good message or the unused message.

    if (cjsoninfo.order || usedImageCount != cjsoninfo.images.length) {
      const unusedCount = cjsoninfo.images.length - usedImageCount
      statusMessage.textContent = `All required fields are filled in. You can remove the ${unusedCount} unused images.`
      requiredIcon.src = "icons/red-circle.svg"
      removeUnusedButton.style.display = "block"
      cjsoninfo.cState = "build"
    }
    else {
      statusMessage.textContent = "All required fields are filled in. The collection is ready."
      requiredIcon.src = "icons/green-circle.svg"
      removeUnusedButton.style.display = "none"
      cjsoninfo.cState = "ready"
      cjsoninfo.modified = true
    }
  }
}

function findThumbnailIx(order: number[], images: CJson.Image[],
  indexThumbnail: string) {
  // Return the image index of the thumbnail image if it is part of
  // the collection, else -1.
  let thumbnailIx = -1
  for (let ix = 0; ix < order.length; ix++) {
    const imageIx = order[ix]
    if (imageIx == -1)
      continue
    const image = images[imageIx]
    if (image.thumbnail == indexThumbnail) {
      thumbnailIx = imageIx
      break
    }
  }
  return thumbnailIx
}

function setImgDetails(images: CJson.Image[], currentImageIx: number) {
  // Set the image details section with the image, image title and
  // image description for the given image index along with their
  // required state.
  let imageTitle: string
  let imageDescription: string
  if (currentImageIx == -1) {
    imageTitle = ""
    imageDescription = ""
  }
  else {
    const image = images[currentImageIx]
    imageTitle = image.title
    imageDescription = image.description
  }
  setImage(images, "image-details", "image-details-required", currentImageIx)
  setText("image-title", null, imageTitle)
  setText("image-description", "image-description-required", imageDescription)
}

function setImage(images: CJson.Collection["images"], id: string, requiredId: RequiredIdType,
    imageIndex: number) {
  // Set the image page element to the collection image with the given
  // imageIndex. If the imageIndex is -1, set it blank. Set the
  // required status of the element.
  let required: boolean
  const element = get(id) as HTMLImageElement
  if (imageIndex == -1) {
    element.src = "icons/blank.svg"
    element.alt = ""
    required = true
  }
  else {
    const image = images[imageIndex]
    element.src = image.thumbnail
    element.alt = image.title
    required = false
  }
  setRequired(requiredId, required)
}

async function collectionImageClick(order: number[], collectionIndex: number) {
  // Handle click on a collection image.  "Move" the image to the
  // available images section.
  if (!cinfo)
    return
  log(`Collection image ${collectionIndex} clicked.`)

  // Blank out the collection box.
  setImage(cinfo.images, `ci${collectionIndex}`, `cb${collectionIndex}`, -1)
  const availableIx = order[collectionIndex]
  order[collectionIndex] = -1

  // Make the available image fade in with an opacity animation.
  const availableBox = get(`ab${availableIx}`) as HTMLElement
  const availableImg = get(`ai${availableIx}`) as HTMLImageElement

  // Set initial state for animation
  availableImg.style.transition = 'opacity  0.75s ease-in-out'
  availableBox.style.display = "block"
  availableImg.style.opacity = '0'

  // Ensure the initial state is rendered.
  requestAnimationFrame(() => {
    availableImg.style.opacity = '1'
  })

  log(`Removed ${collectionIndex} from the image order list: ${order}`)
}

async function availableImageClick(order: number[], availIndex: number) {
  // Handle available image click.  Fill in the next free spot
  // with the clicked image then hide the available image.
  log(`Available image ${availIndex} clicked.`)
  if (!cinfo)
    return

  // Find the first collection image that's blank, first -1 in the
  // order list.
  const firstBlankIx = order.indexOf(-1)
  if (firstBlankIx == -1 || firstBlankIx >= 16) {
    log("The collection is full.")
    return
  }
  log(`The first available collection index: ${firstBlankIx}`)

  // Hide the available box.
  const abox = get(`ab${availIndex}`) as HTMLElement
  abox.style.display = "none"

  // Set the collection box with the available image.
  setImage(cinfo.images, `ci${firstBlankIx}`, `cb${firstBlankIx}`, availIndex)

  // Add the image to the order list.
  order[firstBlankIx] = availIndex
  log(`Added to the image order list. order: ${order}`)
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

function removeUnusedImages(cjsoninfo: CJson.Collection) {
  // Remove the unused images and reorder the image list to match the order
  // list. Reorder the zoom points too.
  log("removeUnusedImages")

  if (!cjsoninfo || !cjsoninfo.order) {
    log("No unused images.")
    return
  }

  cjsoninfo.images = reorderImages(cjsoninfo.order, cjsoninfo.images)
  if (!cjsoninfo.zoomPoints) {
    cjsoninfo.zoomPoints = reorderZoomPoints(cjsoninfo.order, cjsoninfo.zoomPoints)
  }

  delete(cjsoninfo.order)
  log(cjsoninfo.images)
  populateCollection(cjsoninfo)
}

function reorderImages(order: number[], images: CJson.Image[]) {
  // Reorder the images to match the order list. Remove unused images
  // and return the new images list.
  const newImages: CJson.Image[] = []
  for (let ix = 0; ix < order.length; ix++) {
    const imageIx = order[ix]
    if (imageIx != -1) {
      newImages.push(images[imageIx])
    }
  }
  return newImages
}

function reorderZoomPoints(order: number[], zoomPoints: CJson.ZoomPoints) {
  // Reorder the zoom points to match the order list and return the new list.

  // Loop through each set of zoom points and create a new zoom based on the
  // order list.
  const newZoomPoints: CJson.ZoomPoints = {}
  for (const wxh in zoomPoints) {
    // Get the zoom points for the current wxh.
    const wxhZoomPoints = zoomPoints[wxh]
    const newWxhZoomPoints: CJson.ZoomPoint[] = []
    for (let ix = 0; ix < order.length; ix++) {
      const imageIx = order[ix]
      if (imageIx != -1) {
        // Get the zoom points for the image.
        const wxhZoomPoint = wxhZoomPoints[imageIx]
        newWxhZoomPoints.push(wxhZoomPoint)
      }
    }
    newZoomPoints[wxh] = newWxhZoomPoints
  }
  return newZoomPoints
}

function getPreviousNext(orderList: number[], imageIndex: number) {
  // Return the previous and next index for the given image index
  // wrapping around if necessary, i.e: [ix-1, ix+1]. If the image
  // doesn't exist return [-1, -1]. Return the image index when one
  // image exists: [ix, ix].

  // Make a list of the non-negative image indexes from the order
  // list.
  let imageIndexes: number[] = []
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
  if (iix == -1) {
    // The image index is not in the collection.
    return [-1, -1]
  }

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

function goPreviousNext(order: number[], imageIndex: number, goNext: boolean) {
  // Set the page element image to the previous or next image in the
  // collection and set its required state. Return the new image index.
  const [previous, next] = getPreviousNext(order, imageIndex)
  if (next == -1)
    return 0

  const index = goNext ? next : previous
  return index
}

function previousImage() {
  // Set the image details image to the previous collection image.
  if (!cinfo || !cinfo.order)
    return
  currentImageIx = goPreviousNext(cinfo.order, currentImageIx, false)
  setImage(cinfo.images, "image-details", "image-details-required", currentImageIx)
  setImgDetails(cinfo.images, currentImageIx)
}

function nextImage() {
  // Set the image details image to the next collection image.
  if (!cinfo || !cinfo.order)
    return
  currentImageIx = goPreviousNext(cinfo.order, currentImageIx, true)
  setImage(cinfo.images, "image-details", "image-details-required",
    currentImageIx)
  setImgDetails(cinfo.images, currentImageIx)
}

function storeThumbnailImage(thumbnailIndex: number) {
  // Store the index thumbnail image in the collection info.
  if (!cinfo)
    return
  cinfo.indexThumbnail = cinfo.images[thumbnailIndex].thumbnail
  const thumbnailImg = get("index-thumbnail") as HTMLImageElement
  log("Stored thumbnail image:")
  log(thumbnailImg)
}

function indexPreviousImage() {
  // Set the index thumbnail to the previous collection image.
  if (!cinfo || !cinfo.order)
    return
  currentThumbnailIx = goPreviousNext(cinfo.order, currentThumbnailIx,
    false)
  setImage(cinfo.images, "index-thumbnail", "index-thumbnail-required",
    currentThumbnailIx)
  storeThumbnailImage(currentThumbnailIx)
}

function indexNextImage() {
  // Set the index thumbnail to the next collection image.
  if (!cinfo || !cinfo.order)
    return
  currentThumbnailIx = goPreviousNext(cinfo.order, currentThumbnailIx, true)
  setImage(cinfo.images, "index-thumbnail", "index-thumbnail-required",
    currentThumbnailIx)
  storeThumbnailImage(currentThumbnailIx)
}

function setRequired(requiredId: RequiredIdType, status: boolean) {
  // Set the page element (requiredId) with the "required" class when
  // required or good when not. A true status means the element is
  // empty and will be marked as required. A null requiredId is
  // skipped.
  if (!requiredId)
    return
  const element = get(requiredId) as HTMLElement;
  if (status) {
    // Mark it required.
    element.classList.replace('good', 'required');
  }
  else {
    // We have it, remove the required class.
    element.classList.replace('required', 'good')
  }
  if (cinfo)
    updateStatusMessage(cinfo)
}

function disableInputs(disable: boolean) {
  // Disable or enable the input and text area elements on the page.
  const inputs = document.querySelectorAll('input, textarea')
  inputs.forEach((input) => {
    (input as HTMLInputElement).disabled = disable
  })
}
