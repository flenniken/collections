// Shared code concatenated with the other ts files.

function get(id: string) {
  // Get the dom element with the given id. Generate an exception
  // when not found.
  const element = document.getElementById(id)
  if (!element)
    throw new Error(`Element with "${id}" not found.`)
  return element
}

function log(message: string) {
  // Log the message to the console.
  console.log(message)
}

function logError(message: string) {
  // Log an error message to the console.
  console.error(message)
}

function two(num: number) {
  // Return the number rounded to two decimal places.
  return num.toFixed(2)
}

function three(num: number) {
  // Return the number rounded to three decimal places.
  return num.toFixed(3)
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
  log(message: string) {
    log(`${three(this.seconds())}s ----- ${message}`)
  }
}

function cssNum(variable: string): number {
  // Return the given css number variable defined in the ":root"
  // pseudo class. It returns 100 for both of the following examples:
  // :root {
  //   --my-var: 100;
  //   --my-var2: 100px;
  // }
  return parseFloat(getComputedStyle(document.documentElement).getPropertyValue(variable));
}
