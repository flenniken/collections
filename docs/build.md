# Build

[![icon](rounded-icon.png)](#)

Collections is written in typescript and there is a build step.

You use the provided docker build environment to develop
Collections. It has all the programs installed needed to build the
app.

The code folder is shared with docker and your local environment so
you can edit files locally with you favorite editor and build them in
the container.

[⬇](#Contents) (table of contents at the bottom)

# Build Setup

You setup for building Collections with these steps:

* download the code
* install docker
* create docker container

You download the code with the following commands. They create a
collections folder in your code home folder then pull the code from
github.

~~~
cd ~
mkdir -p code/collections
cd code/collections
git clone git@github.com:flenniken/collections.git .
~~~

You install docker, if not already installed,  from the docker website:

* https://docs.docker.com/get-docker/

You create the build environment by running the runenv command as
shown below. You run runenv’s r command twice, the first time the r
command creates the docker image, the second and following times the r
command runs the docker container. The command prompt shows you're in
the build environment in the collections folder.

~~~
cd ~/code/collections
./runenv r
./runenv r

(debian)~/collections $
~~~

The environment has a few aliases defined for common commands:

~~~
(debian)~/collections $ alias

alias g='gulp'
alias gw='g watch &'
alias jqless='jq -C | less -RF'
alias ll='ls -l'
alias ls='ls --color=auto'
alias sudo='sudo '
~~~

You stop the environment by typing ctrl-d.

[⬇ ────────](#Contents)

# Build All

You build the app in the docker container with the gulp app by typing
“g all”. The results go to the dist folder. Here is an example:

~~~
(debian)~/collections $ g all

[01:35:42] Using gulpfile ~/collections/gulpfile.js
[01:35:42] Starting 'all'...
[01:35:42] Starting 'pages-folder'...
[01:35:42] Finished 'pages-folder' after 16 ms
[01:35:42] Starting 'ts'...
[01:35:42] Starting 'pages'...
[01:35:42] Starting 'css'...
[01:35:42] Starting 'vpages'...
[01:35:42] Starting 'i'...
[01:35:42] Starting 't'...
[01:35:42] Starting 'sw'...
[01:35:42] Starting 'index'...
[01:35:42] Starting 'thumbnails'...
[01:35:42] Starting 'image'...
[01:35:42] Starting 'vindex'...
[01:35:42] Starting 'vthumbnails'...
[01:35:42] Starting 'vimage'...
...
[01:35:44] Finished 't' after 2.18 s
[01:35:44] Finished 'sw' after 2.18 s
[01:35:44] Finished 'x' after 2.18 s
[01:35:44] Finished 'i' after 2.18 s
[01:35:44] Finished 'ts' after 2.18 s
[01:35:44] Finished 'all' after 2.2 s
~~~

[⬇ ────────](#Contents)

# Build Tasks

You use gulp tasks in the container to compile the typescript to
javascript, to minimize it and to process the html templates.

Type g to see all the tasks:

~~~
(debian)~/collections $ g

Tasks:
* ts -- Compile and minimize ts files to dist/js.
    i -- Compile image.ts
    t -- Compile thumbnails.ts
    x -- Compile index.ts
    sw -- Compile sw.ts
* pages -- Create all the pages from templates.
    index -- Create the main index page.
    thumbnails1 -- Create the thumbnails page for collection 1.
    thumbnails2 -- Create the thumbnails page for collection 2.
    image1 -- Create the image page for collection 1.
    image2 -- Create the image page for collection 2.
* vpages -- Validate all the html files.
    vindex -- Validate index html
    vthumbnails1 -- Validate thumbnails html for collection 1.
    vthumbnails2 -- Validate thumbnails html for collection 2.
    vimage1 -- Validate image html for collection 1.
    vimage2 -- Validate image html for collection 2.
* css -- Minimize the collection.css file.
* syncronize -- Syncronize the template's replace blocks with header.tea content.
* watch -- (alias gw) Watch file changes and call the appropriate task. You can
    run it in the background with alias gw.
* readme -- Show the readme file with glow.
* all -- Compile everything in parallel, tasks ts, pages and css.
~~~

[⬇ ────────](#Contents)

# Build Folder

The dist folder contains the app files and nothing else.  The static
resources are checked in to this folder. The compiled resources are
put here.

~~~
(debian)~/collections $ tree dist

dist
|-- collections.css
|-- collections.webmanifest
|-- favicon.ico
|-- icons
|   |-- 6-dots-rotate.svg
|   |-- airplane.svg
|   |-- camera.svg
|   |-- download.svg
|   |-- icon-128.png
|   ...
|-- images
|   |-- c1-1-p.jpg
|   |-- c1-1-t.jpg
|   |-- c1-2-p.jpg
|   |-- c1-2-t.jpg
|   |-- c1-3-p.jpg
|   |-- c1-3-tin.jpg
|   ...
|   |-- c2-7-t.jpg
|   |-- c2-8-p.jpg
|   |-- c2-8-t.jpg
|   |-- c2-9-p.jpg
|   `-- c2-9-t.jpg
|-- index.html
|-- js
|   |-- image.js
|   |-- index.js
|   `-- thumbnails.js
|-- pages
|   |-- image-1.html
|   |-- image-2.html
|   |-- thumbnails-1.html
|   `-- thumbnails-2.html
`-- sw.js
~~~

# Contents

* [Build Setup](#build-setup) -- how to download the code and create the docker build container.
* [Build All](#build-all) -- how to build all.
* [Build Tasks](#build-tasks) -- how to build individual files: html, js, css, readme, etc.
* [Build Folder](#build-folder) -- talks about the build folder.

# Other

* [Developer](developer.md) &mdash; how to setup, build and develop Collections.
* [Readme](../readme.md) &mdash; tells what Collections is and how to use it on your iphone.
