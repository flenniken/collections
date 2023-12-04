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

Switch to the collections directory and initialize it with npm.

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

List the gulp tasks:

```
gulp --tasks

[15:20:16] Tasks for ~/code/collections/gulpfile.js
[15:20:16] ├── date
[15:20:16] ├── list
[15:20:16] ├── js
[15:20:16] ├── watchJs
[15:20:16] └── default
```
