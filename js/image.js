// image.js

window.addEventListener("load", sizeImage)
window.addEventListener("resize", sizeImage)

function sizeImage() {
  // Size the image to fit the screen.

  var width = window.innerWidth || document.documentElement.clientWidth ||
    document.body.clientWidth;

  setImageSizeByWidth(document.getElementById("image"), width)
}

function setImageSizeByWidth(img, newWidth) {
  // Set an image size to the specified width keeping the aspect ratio
  // the same.
  const oldWidth =  Number.parseFloat(getComputedStyle(img).width || img.getAttribute("width"));
  const oldHeight = Number.parseFloat(getComputedStyle(img).height || img.getAttribute("height"));
  const newHeight = (newWidth * oldHeight)/oldWidth;
  img.style.width = `${newWidth}px`;
  img.style.height = `${newHeight}px`;
}
