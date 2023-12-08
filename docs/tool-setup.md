How to setup the build tools used by Collections.

# Brew

Homebrew (brew): The Missing Package Manager for macOS (or Linux).

On a mac install brew by following the website instructions:

```
https://brew.sh/
```

Get brew's version number to show it is working:

```
brew --version

Homebrew 4.1.22
```

# Node.js

Node.js® is an open-source, cross-platform JavaScript runtime environment.  

```
https://nodejs.org/en
```

Install node js with brew.  Node comes with the package manager npm.

```
brew install node
node --version

v17.2.0

npm --version

8.15.0
```

# Gulp

Gulp automates build tasks.

```
https://gulpjs.com/docs/en/getting-started/quick-start
```

Install gulp globally with npm.

```
cd # your home dir
npm install --global gulp-cli

gulp --version
CLI version: 2.3.0
Local version: Unknown
```

Switch to the collections directory and initialize the project with npm.

```
cd ~/code/collections
npm init
npm --version

8.15.0
```

Install the gulp package in your project and list the version numbers.
There is a global and local version:

```
npm install --save-dev gulp
gulp --version

CLI version: 2.3.0
Local version: 4.0.2
```

Install all the modules used in the gulpfile.js file.

```
npm install -g npm-install-all
npm-install-all gulpfile.js

INSTALLING THE FOLLOWING MODULES:
├──  gulp
├──  gulp-uglify
├──  fancy-log
├──  child_process
└──  gulp-rsync

MODULES INSTALLED AND SAVED INTO package.json...
```

# Build Tasks

List the gulp tasks with messages by running gulp with no arguments.

```
gulp

gulp tasks:

* js -- minimize the js files.
* css -- minimize the css files.
* index -- create the main index page.
* thumbnails -- create the thumbnails page.
* image -- create the image page.
* pages -- create the index, thumbnails and image pages.
* icons -- copy the icons to dist.
* images -- copy the jpg images to dist.
* rsync -- rsync the dist folder to flenniken.net/collections/.
* watch -- watch file changes and call the appropriate task.
* all -- run the js, images, pages, and icon task in parallel then rsync the results
```
