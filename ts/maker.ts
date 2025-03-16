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
  }
  catch {
    return null
  }
}

async function fetchCJson(num: number): Promise<CJson.Collection> {
  // Load the collection's cjson file.

  const url = `/images/c${num}/cjson-${num}.json`
  const response = await fetch(url)
  if (!response.ok) {
    log(`Unable to fetch the url: ${url}`)
    throw new Error(`HTTP status: ${response.status}`)
  }
  return await response.json()
}

async function selectCollection(event: Event) {
  // Start editing the selected collection.

  // Parse the selection string to get the collection number.
  const target = event.target as HTMLSelectElement;
  const selected = target.value
  log("Selected value:", selected);
  const num = getCollectionNumber(selected)
  if (num == null) {
    log(`Invalid selection.`)
    return
  }

  let cJson: CJson.Collection
  try {
    cJson = await fetchCJson(num)
  }
  catch {
    log("fetch failed")
    return
  }

  log("success")
}

function handleResize() {
  log("resize event")
}

