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

function handleLoad() {
  log("load event")
  topHeaderHeight = cssNum("--top-header-height")
  log(`topHeaderHeight: ${topHeaderHeight}`)
  setupThumbnailDescriptionEditing()
  setupThumbnailReorder()
}

function setupThumbnailDescriptionEditing() {
  // Let an admin tap the collection description and edit it in place.
  if (!isAdmin())
    return

  const el = document.getElementById("description")
  if (!el)
    return
  const cNum = parseInt(document.body.dataset.cnum || "", 10)
  if (!(cNum > 0))
    return

  let current = editedTextFromElement(el)
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
  })
  log("Admin thumbnail description editing is on.")
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
