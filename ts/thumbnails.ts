// Code for the thumbnails page.

/// <reference path="./win.ts" />
/// <reference path="./all.ts" />
/// <reference path="./userInfo.ts" />

// The available screen area.
let availWidth = 0
let availHeight = 0

// The top-bar element set at dom load time.
let topBar: HTMLElement | null = null

window.addEventListener("DOMContentLoaded", handleDOMContentLoaded)
window.addEventListener("load", handleLoad)
window.addEventListener("resize", handleResize);

function setAvailableArea() {
  // Size the image area to the size of the usable screen. Return
  // false when the size did not change.

  // Get the available screen width and height and store them in
  // globals, availWidth and availHeight.
  const [availW, availH] = getAvailableWidthHeight()
  if (availW == availWidth && availH == availHeight) {
    log(`Available size is the same: ${availWidth} x ${availHeight}`)
    return false
  }
  availWidth = availW
  availHeight = availH
  return true
}

function handleDOMContentLoaded() {
  log("DOMContentLoaded event")

  topBar = get("top-bar")

  const changed = setAvailableArea()
  if (changed) {
    sizeImages()
  }
}

async function handleLoad() {
  log("load event")
  topHeaderHeight = cssNum("--top-header-height")
  log(`topHeaderHeight: ${topHeaderHeight}`)
  let location = document.body.dataset.location || ""
  if (isLocalhost()) {
    const cinfo = await refreshThumbnailHeading()
    if (cinfo && typeof cinfo.location === "string")
      location = cinfo.location
  }
  setupCollectionMap(location)
  setupThumbnailTextEditing()
  setupThumbnailReorder()
  setupThumbnailCrop()
}

async function refreshThumbnailHeading(): Promise<Record<string, unknown> | null> {
  // Show title and posted date from the collection json so they match
  // in-place edits on the index without a rebuild.
  const cNum = parseInt(document.body.dataset.cnum || "", 10)
  if (!(cNum > 0))
    return null
  const cinfo = await fetchCollectionJson(cNum)
  if (!cinfo)
    return null
  const titleEl = document.getElementById("title")
  if (titleEl && typeof cinfo.title === "string") {
    titleEl.textContent = cinfo.title
    document.title = cinfo.title
  }
  const postedEl = document.getElementById("posted")
  if (postedEl && typeof cinfo.posted === "string")
    postedEl.textContent = cinfo.posted
  const descEl = document.getElementById("description")
  if (descEl && typeof cinfo.description === "string")
    descEl.textContent = cinfo.description
  log(`Thumbnail heading from json: "${cinfo.title}" ${cinfo.posted}`)
  return cinfo
}

function setupCollectionMap(location: string) {
  // Show a collection map under the description when location is set.
  document.querySelector("#thumbnails .location")?.remove()
  const parsed = parseLocation(location)
  if (!parsed)
    return
  const desc = document.getElementById("description")
  if (!desc)
    return
  desc.after(createLocationMap(parsed.lat, parsed.lng))
  observeLocationMaps()
}

function setupThumbnailTextEditing() {
  // Title and posted date are edited on the index. Admins can edit
  // the collection description here.
  if (!isAdmin())
    return

  const hint = document.getElementById("heading-edit-hint")
  if (hint)
    hint.classList.add("visible")

  const cNum = parseInt(document.body.dataset.cnum || "", 10)
  if (!(cNum > 0))
    return

  const el = document.getElementById("description")
  if (!el)
    return
  let current = ""
  enablePlaintextEditing(el, () => current, async (text) => {
    if (!isLocalhost()) {
      current = text
      log("Save on localhost to keep the change.")
      return
    }
    try {
      await saveDescription(cNum, "description", text)
      current = text
      log("Collection description saved.")
    } catch (error) {
      logError("Description save failed", error)
    }
  }, { placeholder: "Description" })
  current = editedTextFromElement(el)
  log("Admin thumbnail editing is on.")
}

const THUMB_HOLD_MS = 400
const THUMB_MOVE_PX = 12
const THUMB_EDGE_PX = 56
const THUMB_SCROLL_PX = 20
const THUMB_FLIP_MS = 280

function thumbnailLinks(): HTMLAnchorElement[] {
  return Array.from(get("container").querySelectorAll(":scope > a"))
}

function photoLogName(link: HTMLAnchorElement): string {
  // c1-3-t.jpg -> c3, a stable name that does not change when reordered.
  const src = link.querySelector("img")?.getAttribute("src") || ""
  const file = src.split("/").pop() || ""
  const match = file.match(/^c\d+-(\d+)-t\./i)
  if (match)
    return `c${match[1]}`
  return file.replace(/\.[^.]+$/, "") || "?"
}

function setupThumbnailReorder() {
  // Long-press a thumbnail to drag it to a new place. Localhost admin.
  if (!isAdmin() || !isLocalhost())
    return
  const container = get("container")
  const cNum = parseInt(document.body.dataset.cnum || "", 10)
  if (!(cNum > 0))
    return

  document.body.classList.add("reorder-enabled")
  thumbnailLinks().forEach((link, ix) => {
    link.dataset.imageIx = String(ix)
  })
  document.addEventListener("contextmenu", (event) => {
    event.preventDefault()
  }, true)
  container.addEventListener("dragstart", (event) => {
    event.preventDefault()
  })

  let holdTimer: ReturnType<typeof setTimeout> | null = null
  let drag: {
    link: HTMLAnchorElement
    ghost: HTMLAnchorElement
    offsetX: number
    offsetY: number
    lastX: number
    lastY: number
    originNext: ChildNode | null
  } | null = null
  let suppressClick = false
  let scrollTimer: ReturnType<typeof setInterval> | null = null
  let flipTimer: ReturnType<typeof setTimeout> | null = null

  function clearHold() {
    if (holdTimer !== null) {
      clearTimeout(holdTimer)
      holdTimer = null
    }
  }

  function stopScroll() {
    if (scrollTimer !== null) {
      clearInterval(scrollTimer)
      scrollTimer = null
    }
  }

  function clearFlipStyles(el: HTMLElement) {
    el.style.transition = ""
    el.style.transform = ""
  }

  function flipToNewLayout(elements: HTMLElement[],
      firstRects: Map<HTMLElement, DOMRect>, mutate: () => void) {
    // Slide elements from their old positions to the layout after mutate.
    if (flipTimer !== null) {
      clearTimeout(flipTimer)
      flipTimer = null
    }
    elements.forEach((el) => {
      el.style.transition = "none"
      el.style.transform = ""
    })
    mutate()
    const movers: HTMLElement[] = []
    elements.forEach((el) => {
      const first = firstRects.get(el)
      if (!first)
        return
      const last = el.getBoundingClientRect()
      const dx = first.left - last.left
      const dy = first.top - last.top
      if (dx === 0 && dy === 0)
        return
      el.style.transform = `translate(${dx}px, ${dy}px)`
      movers.push(el)
    })
    void container.offsetWidth
    movers.forEach((el) => {
      el.style.transition = `transform ${THUMB_FLIP_MS}ms ease`
      el.style.transform = "translate(0, 0)"
    })
    flipTimer = setTimeout(() => {
      flipTimer = null
      movers.forEach(clearFlipStyles)
    }, THUMB_FLIP_MS + 40)
  }

  function currentOrder(): number[] {
    return thumbnailLinks().map((link, ix) => {
      const n = parseInt(link.dataset.imageIx || "", 10)
      return n >= 0 ? n : ix
    })
  }

  function reindex() {
    thumbnailLinks().forEach((link, ix) => {
      link.dataset.imageIx = String(ix)
    })
  }

  function setDropTarget(target: Element | null) {
    thumbnailLinks().forEach((link) => {
      link.classList.toggle("thumb-drop-target", link === target)
    })
  }

  function dropTargetAt(x: number, y: number): HTMLAnchorElement | "end" | null {
    const rest = thumbnailLinks().filter((link) => link !== drag?.link)
    for (const link of rest) {
      const rect = link.getBoundingClientRect()
      if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom)
        return link
    }
    const last = rest[rest.length - 1]
    if (!last)
      return null
    const rect = last.getBoundingClientRect()
    if (y > rect.bottom || (y >= rect.top && x > rect.right))
      return "end"
    return null
  }

  function highlightAt(x: number, y: number) {
    const target = dropTargetAt(x, y)
    if (target === "end") {
      const rest = thumbnailLinks().filter((link) => link !== drag?.link)
      setDropTarget(rest[rest.length - 1] || null)
    }
    else {
      setDropTarget(target)
    }
  }

  function updateGhost(x: number, y: number) {
    if (!drag)
      return
    drag.ghost.style.left = `${x - drag.offsetX}px`
    drag.ghost.style.top = `${y - drag.offsetY}px`
    drag.lastX = x
    drag.lastY = y
    highlightAt(x, y)
  }

  function edgeScroll() {
    if (!drag)
      return
    let dy = 0
    if (drag.lastY < THUMB_EDGE_PX)
      dy = -THUMB_SCROLL_PX
    else if (drag.lastY > window.innerHeight - THUMB_EDGE_PX)
      dy = THUMB_SCROLL_PX
    if (dy === 0)
      return
    window.scrollBy(0, dy)
    highlightAt(drag.lastX, drag.lastY)
  }

  function startDrag(link: HTMLAnchorElement, event: PointerEvent) {
    const rect = link.getBoundingClientRect()
    const ghost = link.cloneNode(true) as HTMLAnchorElement
    ghost.classList.add("thumb-drag-ghost")
    ghost.removeAttribute("href")
    ghost.style.width = `${rect.width}px`
    ghost.style.height = `${rect.height}px`
    ghost.style.left = `${rect.left}px`
    ghost.style.top = `${rect.top}px`
    const ghostImg = ghost.querySelector("img")
    if (ghostImg instanceof HTMLElement) {
      ghostImg.style.width = `${rect.width}px`
      ghostImg.style.height = `${rect.height}px`
    }
    document.body.appendChild(ghost)
    const movers = thumbnailLinks().filter((el) => el !== link)
    const firstRects = new Map<HTMLElement, DOMRect>()
    movers.forEach((el) => {
      firstRects.set(el, el.getBoundingClientRect())
    })
    flipToNewLayout(movers, firstRects, () => {
      link.classList.add("thumb-dragging-origin")
    })
    drag = {
      link,
      ghost,
      offsetX: rect.width / 2,
      offsetY: rect.height / 2,
      lastX: event.clientX,
      lastY: event.clientY,
      originNext: link.nextSibling,
    }
    suppressClick = true
    document.body.classList.add("thumb-reordering")
    stopScroll()
    scrollTimer = setInterval(edgeScroll, 50)
    requestAnimationFrame(() => {
      if (!drag || drag.ghost !== ghost)
        return
      ghost.style.transition = "left 140ms ease-out, top 140ms ease-out"
      updateGhost(drag.lastX, drag.lastY)
      window.setTimeout(() => {
        if (drag && drag.ghost === ghost)
          ghost.style.transition = "none"
      }, 160)
    })
    log("Thumbnail drag started.")
  }

  function endDrag() {
    stopScroll()
    if (!drag)
      return
    const { link, ghost, originNext, lastX, lastY } = drag
    const target = dropTargetAt(lastX, lastY)
    const movers = thumbnailLinks()
    const firstRects = new Map<HTMLElement, DOMRect>()
    movers.forEach((el) => {
      if (el === link)
        firstRects.set(el, ghost.getBoundingClientRect())
      else
        firstRects.set(el, el.getBoundingClientRect())
    })
    setDropTarget(null)
    document.body.classList.remove("thumb-reordering")
    drag = null
    flipToNewLayout(movers, firstRects, () => {
      ghost.remove()
      if (target === "end")
        container.appendChild(link)
      else if (target && target !== link)
        container.insertBefore(link, target)
      link.classList.remove("thumb-dragging-origin")
    })
    const order = currentOrder()
    const identity = order.every((imageIx, ix) => imageIx === ix)
    if (identity) {
      log("Thumbnail order unchanged.")
      return
    }
    log(`Thumbnail order: ${thumbnailLinks().map(photoLogName).join(", ")}`)
    void saveOrder(cNum, order).then(() => {
      reindex()
      log("Photo order saved. Run g all to rebuild the image pages.")
    }).catch((error) => {
      logError("Order save failed", error)
      if (originNext)
        container.insertBefore(link, originNext)
      else
        container.appendChild(link)
    })
  }

  function xyFromEvent(event: Event): [number, number] | null {
    if (event instanceof PointerEvent || event instanceof MouseEvent)
      return [event.clientX, event.clientY]
    if (event instanceof TouchEvent) {
      const touch = event.touches[0] || event.changedTouches[0]
      if (touch)
        return [touch.clientX, touch.clientY]
    }
    return null
  }

  container.addEventListener("pointerdown", (event) => {
    if (event.button !== 0)
      return
    if (event.metaKey || event.ctrlKey)
      return
    const link = event.target instanceof Element
      ? event.target.closest("#container > a")
      : null
    if (!(link instanceof HTMLAnchorElement))
      return
    const startX = event.clientX
    const startY = event.clientY
    clearHold()
    holdTimer = setTimeout(() => {
      holdTimer = null
      startDrag(link, event)
    }, THUMB_HOLD_MS)

    const onMove = (move: Event) => {
      const xy = xyFromEvent(move)
      if (!xy)
        return
      if (holdTimer !== null) {
        if (Math.abs(xy[0] - startX) > THUMB_MOVE_PX ||
            Math.abs(xy[1] - startY) > THUMB_MOVE_PX)
          clearHold()
        return
      }
      if (drag) {
        if (move.cancelable)
          move.preventDefault()
        updateGhost(xy[0], xy[1])
      }
    }
    const onUp = (up: Event) => {
      // Chrome long-press sends pointercancel with contextmenu.
      // Keep dragging until the pointer is actually released.
      if (up.type === "pointercancel")
        return
      clearHold()
      window.removeEventListener("pointermove", onMove, true)
      window.removeEventListener("touchmove", onMove, true)
      window.removeEventListener("pointerup", onUp, true)
      window.removeEventListener("mouseup", onUp, true)
      window.removeEventListener("touchend", onUp, true)
      window.removeEventListener("pointercancel", onUp, true)
      endDrag()
    }
    window.addEventListener("pointermove", onMove, { capture: true, passive: false })
    window.addEventListener("touchmove", onMove, { capture: true, passive: false })
    window.addEventListener("pointerup", onUp, true)
    window.addEventListener("mouseup", onUp, true)
    window.addEventListener("touchend", onUp, true)
    window.addEventListener("pointercancel", onUp, true)
  })

  container.addEventListener("click", (event) => {
    if (!suppressClick)
      return
    event.preventDefault()
    event.stopPropagation()
    suppressClick = false
  }, true)

  log("Admin thumbnail reorder is on.")
}

function previewNameFromThumbSrc(src: string): string | null {
  const file = (src.split("/").pop() || "").split("?")[0]
  const match = file.match(/^(c\d+-\d+)-t\.jpg$/i)
  if (!match)
    return null
  return `${match[1]}-p.jpg`
}

const MIN_CROP_SIDE = 480

type CropHandle = "nw" | "ne" | "sw" | "se"

interface CropRect {
  x: number
  y: number
  size: number
}

function isCropHandle(value: string | null): value is CropHandle {
  return value == "nw" || value == "ne" || value == "sw" || value == "se"
}

function initialCropRect(dw: number, dh: number): CropRect {
  const size = Math.min(dw, dh)
  return { x: (dw - size) / 2, y: (dh - size) / 2, size }
}

function moveCropRect(rect: CropRect, dx: number, dy: number,
    dw: number, dh: number): CropRect {
  return {
    x: Math.max(0, Math.min(dw - rect.size, rect.x + dx)),
    y: Math.max(0, Math.min(dh - rect.size, rect.y + dy)),
    size: rect.size,
  }
}

function resizeCropFromHandle(rect: CropRect, handle: CropHandle,
    px: number, py: number, dw: number, dh: number, minSize: number): CropRect {
  const right = rect.x + rect.size
  const bottom = rect.y + rect.size
  let size: number
  let maxForHandle: number
  if (handle == "se") {
    size = Math.min(px - rect.x, py - rect.y)
    maxForHandle = Math.min(dw - rect.x, dh - rect.y)
  }
  else if (handle == "nw") {
    size = Math.min(right - px, bottom - py)
    maxForHandle = Math.min(right, bottom)
  }
  else if (handle == "ne") {
    size = Math.min(px - rect.x, bottom - py)
    maxForHandle = Math.min(dw - rect.x, bottom)
  }
  else {
    size = Math.min(right - px, py - rect.y)
    maxForHandle = Math.min(right, dh - rect.y)
  }
  size = Math.max(minSize, Math.min(maxForHandle, size))
  if (handle == "nw")
    return { x: right - size, y: bottom - size, size }
  if (handle == "ne")
    return { x: rect.x, y: bottom - size, size }
  if (handle == "sw")
    return { x: right - size, y: rect.y, size }
  return { x: rect.x, y: rect.y, size }
}

function sourceFromCropRect(rect: CropRect, k: number, nw: number,
    nh: number): {left: number, top: number, side: number} {
  const maxSide = Math.min(nw, nh)
  let side = Math.round(rect.size / k)
  side = Math.max(MIN_CROP_SIDE, Math.min(maxSide, side))
  let left = Math.round(rect.x / k)
  let top = Math.round(rect.y / k)
  left = Math.max(0, Math.min(nw - side, left))
  top = Math.max(0, Math.min(nh - side, top))
  return { left, top, side }
}

function setupThumbnailCrop() {
  // Command-click a thumbnail to recrop it. Localhost admin.
  if (!isAdmin() || !isLocalhost())
    return
  if (typeof HTMLDialogElement === "undefined")
    return
  const container = get("container")
  const cNum = parseInt(document.body.dataset.cnum || "", 10)
  if (!(cNum > 0))
    return

  const dialog = document.createElement("dialog")
  dialog.id = "thumb-crop-dialog"
  dialog.className = "thumb-crop-dialog"
  dialog.setAttribute("aria-label", "Crop thumbnail")
  dialog.innerHTML =
    '<div class="thumb-crop-stage">' +
    '<img alt="" draggable="false">' +
    '<div class="thumb-crop-square" hidden>' +
    '<span class="thumb-crop-handle" data-handle="nw"></span>' +
    '<span class="thumb-crop-handle" data-handle="ne"></span>' +
    '<span class="thumb-crop-handle" data-handle="sw"></span>' +
    '<span class="thumb-crop-handle" data-handle="se"></span>' +
    "</div></div>" +
    '<div class="thumb-crop-actions">' +
    '<button type="button" class="thumb-crop-cancel">Cancel</button>' +
    '<button type="button" class="thumb-crop-ok">OK</button>' +
    "</div>"
  document.body.appendChild(dialog)

  const stage = dialog.querySelector(".thumb-crop-stage") as HTMLElement
  const square = dialog.querySelector(".thumb-crop-square") as HTMLElement
  const img = dialog.querySelector("img") as HTMLImageElement
  const cancelBtn = dialog.querySelector(".thumb-crop-cancel") as HTMLButtonElement
  const okBtn = dialog.querySelector(".thumb-crop-ok") as HTMLButtonElement

  let nw = 0
  let nh = 0
  let dw = 0
  let dh = 0
  let k = 1
  let rect: CropRect = { x: 0, y: 0, size: 0 }
  let cropTarget: HTMLImageElement | null = null
  let preview = ""
  let drag: {
    kind: "pan" | "resize"
    handle?: CropHandle
    startX: number
    startY: number
    orig: CropRect
  } | null = null
  let saving = false

  function applyRect() {
    square.style.left = `${rect.x}px`
    square.style.top = `${rect.y}px`
    square.style.width = `${rect.size}px`
    square.style.height = `${rect.size}px`
  }

  function closeDialog() {
    drag = null
    saving = false
    cropTarget = null
    preview = ""
    square.hidden = true
    okBtn.disabled = false
    cancelBtn.disabled = false
    stage.classList.remove("dragging", "resizing")
    if (dialog.open)
      dialog.close()
  }

  function stageMax(): {maxW: number, maxH: number} {
    return {
      maxW: Math.max(240, Math.min(720, window.innerWidth - 48)),
      maxH: Math.max(240, Math.min(720, window.innerHeight - 180)),
    }
  }

  function openFor(link: HTMLAnchorElement) {
    const thumb = link.querySelector("img")
    if (!(thumb instanceof HTMLImageElement))
      return
    const name = previewNameFromThumbSrc(thumb.getAttribute("src") || "")
    if (!name)
      return
    preview = name
    cropTarget = thumb
    img.removeAttribute("src")
    img.src = ""
    img.style.width = ""
    img.style.height = ""
    square.hidden = true
    nw = 0
    nh = 0
    okBtn.disabled = true
    dialog.showModal()
    img.src = `/images/c${cNum}/${preview}`
  }

  img.addEventListener("load", () => {
    nw = img.naturalWidth
    nh = img.naturalHeight
    if (nw < 1 || nh < 1) {
      logError("Preview has no size.")
      closeDialog()
      return
    }
    const max = stageMax()
    k = Math.min(max.maxW / nw, max.maxH / nh)
    dw = nw * k
    dh = nh * k
    stage.style.width = `${dw}px`
    stage.style.height = `${dh}px`
    img.style.width = `${dw}px`
    img.style.height = `${dh}px`
    rect = initialCropRect(dw, dh)
    applyRect()
    square.hidden = false
    okBtn.disabled = false
  })
  img.addEventListener("error", () => {
    logError(`Unable to load preview: ${preview}`)
    closeDialog()
  })

  stage.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || saving || nw < 1 || square.hidden)
      return
    const handleEl = event.target instanceof Element
      ? event.target.closest(".thumb-crop-handle")
      : null
    const handle = handleEl ? handleEl.getAttribute("data-handle") : null
    const onSquare = event.target instanceof Element &&
      (event.target === square || square.contains(event.target))
    if (!isCropHandle(handle) && !onSquare)
      return
    event.preventDefault()
    if (isCropHandle(handle)) {
      drag = {
        kind: "resize",
        handle,
        startX: event.clientX,
        startY: event.clientY,
        orig: { x: rect.x, y: rect.y, size: rect.size },
      }
      stage.classList.add("resizing")
    }
    else {
      drag = {
        kind: "pan",
        startX: event.clientX,
        startY: event.clientY,
        orig: { x: rect.x, y: rect.y, size: rect.size },
      }
      stage.classList.add("dragging")
    }
    stage.setPointerCapture(event.pointerId)
  })
  stage.addEventListener("pointermove", (event) => {
    if (!drag)
      return
    if (drag.kind == "pan") {
      rect = moveCropRect(
        drag.orig,
        event.clientX - drag.startX,
        event.clientY - drag.startY,
        dw, dh)
    }
    else if (drag.handle) {
      const box = stage.getBoundingClientRect()
      rect = resizeCropFromHandle(
        drag.orig,
        drag.handle,
        event.clientX - box.left,
        event.clientY - box.top,
        dw, dh, MIN_CROP_SIDE * k)
    }
    applyRect()
  })
  function endDrag(event: PointerEvent) {
    if (!drag)
      return
    if (stage.hasPointerCapture(event.pointerId))
      stage.releasePointerCapture(event.pointerId)
    drag = null
    stage.classList.remove("dragging", "resizing")
  }
  stage.addEventListener("pointerup", endDrag)
  stage.addEventListener("pointercancel", endDrag)

  cancelBtn.addEventListener("click", () => {
    closeDialog()
  })
  okBtn.addEventListener("click", () => {
    if (saving || !cropTarget || !preview || nw < 1)
      return
    const origin = sourceFromCropRect(rect, k, nw, nh)
    const target = cropTarget
    const thumbName = preview.replace(/-p\.jpg$/i, "-t.jpg")
    saving = true
    okBtn.disabled = true
    cancelBtn.disabled = true
    void saveThumbnail(cNum, preview, origin.left, origin.top, origin.side).then(
      async () => {
        const url = `/images/c${cNum}/${thumbName}`
        await forgetCachedImage(url)
        target.src = `${url}?t=${Date.now()}`
        log(`Thumbnail saved: ${thumbName}`)
        closeDialog()
      }).catch((error) => {
        saving = false
        okBtn.disabled = false
        cancelBtn.disabled = false
        logError("Thumbnail save failed", error)
      })
  })
  dialog.addEventListener("cancel", (event) => {
    if (saving) {
      event.preventDefault()
      return
    }
    closeDialog()
  })

  container.addEventListener("click", (event) => {
    if (!(event.metaKey || event.ctrlKey) || event.button !== 0)
      return
    const link = event.target instanceof Element
      ? event.target.closest("#container > a")
      : null
    if (!(link instanceof HTMLAnchorElement))
      return
    event.preventDefault()
    event.stopPropagation()
    if (document.body.classList.contains("thumb-reordering"))
      return
    openFor(link)
  }, true)

  log("Admin thumbnail crop is on.")
}

function handleResize() {
  log("resize event")

  // Skip the resize events until the area object is set.
  if (topBar === null) {
    log("Wait for DOM elements to exist and be sized.")
    return
  }

  const changed = setAvailableArea()
  if (changed) {
    sizeImages()
  }
}

function sizeImages() {
  log("sizeImages called")

  // Size the thumbnails so two of them fit the short side of the
  // screen with 4px space between. The gap is set in CSS so it
  // stays after a thumbnail is moved.
  const shortSide = availWidth < availHeight ? availWidth : availHeight

  const thumbnailW = (shortSide - 4) / 2
  log(`Thumbnail width: ${thumbnailW}`)

  const thumbnailWPx = `${thumbnailW}px`
  forClasses(get("container"), "thumbnail", (thumbnail) => {
    thumbnail.style.width = thumbnailWPx
    thumbnail.style.height = thumbnailWPx
    thumbnail.style.minWidth = thumbnailWPx
    thumbnail.style.minHeight = thumbnailWPx
  })

  // If more than 2 thumbnails fit the width of the screen, center
  // the thumbnails.
  const numRowThumbs = Math.floor((availWidth - 4) / (thumbnailW + 4))
  if (numRowThumbs > 2) {
    log(`numRowThumbs: ${numRowThumbs}`)
    const margin = (availWidth - (thumbnailW * numRowThumbs + ((numRowThumbs - 1) * 4))) / 2
    get("thumbnails").style.marginLeft = `${margin}px`
    log(`center thumbnails: margin: ${two(margin)}`)
  }
  else {
    get("thumbnails").style.marginLeft = "0"
  }

  if (availWidth < availHeight) {
    log("Portrait mode")
    topBar!.style.height = `${topHeaderHeight}px`
  }
  else {
    log("Landscape mode")
    topBar!.style.height = "0"
  }
}
