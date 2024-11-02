// Shared code concatenated with all the other ts files. The window
// and document objects are not used here. See win.ts for shared code
// using the window and document objects.

// The name of the application cache where we store the collections
// images.
const appCacheName = "collections-v1"

// Each log message has a tag that categories it. Currently tags are
// named after the file the where the log message is used. You can
// enable or disable log messages by adding or removing the tag from
// the showTags object.
const showTags = {
  "login": 0,
  "index": 0,
  "thumbnails": 0,
  "image": 0,
  // "sw": 0,
  "win": 0,
}

function logt(tags: string, message: string) {
  // Log the message to the console if it is enabled.
  // tags is a space separated list of tags.

  const parts = tags.split(" ")
  for (const tag of parts) {
    if (showTags.hasOwnProperty(tag)) {
      const msg = `${tag}: ${message}`
      console.log(msg)
      return
    }
  }
}

function logError(message: string) {
  // Log an error message to the console.
  console.error(message)
}

function two(num: number) {
  // Return the number rounded to two decimal places.
  return Math.round(num * 100 ) / 100;
}

function three(num: number) {
  // Return the number rounded to three decimal places.
  return Math.round(num * 1000 ) / 1000;
}

class Timer {
  // Time how long code takes to run, accurate to about thousands of a
  // second.  Note: use date() instead of performance() for
  // microseconds accuracy.
  start: number;
  constructor() {
    this.start = performance.now()
  }
  seconds() {
    return (performance.now() - this.start) / 1000.0
  }
  logt(tags: string, message: string) {
    logt(tags, `${three(this.seconds())}s ----- ${message}`)
  }
}
