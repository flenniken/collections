var gulp = require("gulp");
var uglify = require("gulp-uglify");
var log = require("fancy-log");
const child_process = require("child_process");
const cleanCSS = require("gulp-clean-css");
var using = require('gulp-using');

let help = []

gulp.task("default", function(cb){
  console.log("")
  console.log("gulp tasks:")
  console.log("")
  help.forEach((message, ix) => {
    console.log(message)
  })
  console.log("")
  cb()
});

help.push("* js -- minimize the js files.")
gulp.task("js", function (cb) {
  return gulp.src(["js/*.js"])
    .pipe(using({prefix:'Compiling', filesize:true, color: "green"}))
    .pipe(uglify())
    .pipe(using({prefix:'Copy', path:'relative', filesize: true}))
    .pipe(gulp.dest("dist/js/"))
})

help.push("* css -- minimize the css files.")
gulp.task("css", function (cb) {
  return gulp.src(["collections.css"])
    .pipe(using({prefix:'Compiling', filesize:true, color: "green"}))
    .pipe(cleanCSS({compatibility: "ie8"}))
    .pipe(using({prefix:'Copy', path:'relative', filesize: true}))
    .pipe(gulp.dest("dist/"));
})

help.push("* index -- create the main index page.")
gulp.task("index", function (cb) {
  // Create the main index page.

/*
statictea -t index-tmpl.html \
  -s collections.json \
  -o header.tea \
  -r index.html
*/
  log("Compiling index template.")
  const parameters = [
    "-t", "index-tmpl.html",
    "-s", "collections.json",
    "-o", "header.tea",
    "-r", "dist/index.html",
  ]
  return child_process.spawn("statictea", parameters, {stdio: "inherit"});
})

help.push("* thumbnails -- create the thumbnails page.")
gulp.task("thumbnails", function (cb) {
  // Create the thumbnails page.

/*
statictea -t pages/thumbnails-tmpl.html \
  -s pages/collection-1.json \
  -o header.tea \
  -r pages/thumbnails-1.html
*/

  log("Compiling thumbnails template.")
  const parameters = [
    "-t", "pages/thumbnails-tmpl.html",
    "-s", "pages/collection-1.json",
    "-o", "header.tea",
    "-r", "dist/pages/thumbnails-1.html",
  ]
  return child_process.spawn("statictea", parameters, {stdio: "inherit"});
})

help.push("* image -- create the image page.")
gulp.task("image", function (cb) {
  // Create the image page.

/*
statictea -t pages/image-tmpl.html \
  -s pages/collection-1.json \
  -o header.tea \
  -r pages/image-1.html
*/

  log("Compiling image template.")
  const parameters = [
    "-t", "pages/image-tmpl.html",
    "-s", "pages/collection-1.json",
    "-o", "header.tea",
    "-r", "dist/pages/image-1.html",
  ]
  return child_process.spawn("statictea", parameters, {stdio: "inherit"});
})

help.push("* pages -- create the index, thumbnails and image pages.")
gulp.task("pages", gulp.parallel("index", "thumbnails", "image"));

help.push("* icons -- copy the icons to dist.")
gulp.task("icons", function() {
  // Copy the icons to dist.
  return gulp.src("icons/*.png")
    .pipe(using({prefix:'Copy', filesize: true}))
    .pipe(gulp.dest("dist/icons"));
});

help.push("* images -- copy the jpg images to dist.")
gulp.task("images", function() {
  // Copy the images to dist.
  return gulp.src("images/*.jpg")
    .pipe(using({prefix:'Copy', filesize: true}))
    .pipe(gulp.dest("dist/images"));
});

help.push("* rsync -- rsync the dist folder to flenniken.net/collections/.")
gulp.task("rsync", function(cb) {
  // Rsync the dest folder to flenniken.net.

/*
rsync -a --delete --progress \
  /Users/steve/code/collections/dist/ \
  1and1:flenniken/site/web/collections/
*/

  log("Rsync dist to flenniken.net/collections/")
  const parameters = [
    "--delete",
    "--progress",
    "-a",
    "/Users/steve/code/collections/dist/",
    "1and1:flenniken/site/web/collections/",
  ]
  return child_process.spawn("rsync", parameters, {stdio: "inherit"});
});

function onChange(pattern, task) {
  gulp.watch(pattern).on("change", function(file) {
    log(`Compiling changed: ${file}`)
    gulp.series([task]);
  })
}

help.push("* watch -- watch file changes and call the appropriate task.")
gulp.task("watch", function(cb) {
  // When a source file changes, compile it into the dest folder.

  onChange("js/*.js", "js")
  onChange("collections.css", "css");
  onChange(["index-tmpl.html", "collections.json", "header.tea"], "index");
  onChange(["pages/thumbnails-1-tmpl.html", "collections-1.json", "header.tea"], "thumbnails");
  onChange(["pages/image-1-tmpl.html", "collections-1.json", "header.tea"], "image");
  onChange("images/*.jpg", "images");
  onChange("icons/*.png", "icons");

  cb();
});

help.push("* all -- run the js, images, pages, and icon task in parallel then rsync the results")
gulp.task("all", gulp.series([gulp.parallel(["js", "images", "pages", "icons"]), "rsync"]));
