# Build

[![icon](rounded-icon.png)](#)

Collections is written in typescript and there is a build step.

You use the provided docker build environment to develop
Collections. It has all the programs installed needed to build the
app.

The code folder is shared with docker and your local environment so
you can edit files locally with your favorite editor and build them in
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

The container publishes localhost port 8000 for the website and
localhost port 3001 for the admin API that saves collection JSON,
merges individual descriptions, and writes recropped thumbnails.
Cron, nginx, and the admin API start with the container.

~~~
cd ~/code/collections
./runenv r
./runenv r

(debian)~/collections $
~~~

The environment has a few aliases defined for common commands:

~~~
(debian)~/collections $ alias

alias jqless='jq -C | less -RF'
alias l='mylisttail'
alias ll='ls -l'
alias ls='ls --color=auto'
alias lsd='mylistdir'
alias sudo='sudo '
alias utc='date -u +"%Y-%m-%d %H:%M:%S"'
~~~

`♫ Note`: g is a bash function to run gulp.

You stop the environment by typing ctrl-d.

[⬇](#Contents)

# Setup Container

The first time you run the container after building it you need to
setup a few things.  You will see Warnings printed out telling what
you need to do.

~~~
Warning 1: aws command line credentials are missing.
Run: 'aws configure' to set them. See docs/aws-config.md for more info by
running: glow docs/aws-config.md

Warning 3: The notification VAPID keys are missing. Save them to ~/.aws/vapid.
See docs/aws-config.md for more info by running: glow docs/aws-config.md

Warning 4: The branding.ini file is missing admin_phone. Edit ~/.aws/branding.ini.
See docs/aws-config.md for more info by running: glow docs/aws-config.md
~~~

[⬇](#Contents)

# Build All

You build the app in the docker container with the gulp app by typing
“g all”.

The build system, g all, builds everything storing the result files in
the tmp folder.  It then checks whether anything has changed by
comparing files with the production files in the dist folder.  If a
file differs, it is copied to the dist folder. The build process is
fast enough for this to work well and no complex dependencies need to
be maintained.  You can delete the tmp folder and the system will
recreate the files on the next build.

Here is an example:

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

[⬇](#Contents)

# Build Tasks

While developing it is sometime useful to run a single task. There are
individual gulp tasks to compile typescript files, to build templates,
to validate html and to minimize css.

Type g to see all the tasks:

~~~
(debian)~/collections $ g

* ts: Compile and optionally minimize ts files to dist/js.

        i -- Compile image.ts
        t -- Compile thumbnails.ts
        x -- Compile index.ts
       sw -- Compile sw.ts

* pages: Create all the pages from templates.

    index -- Create the main index page.
    ready -- Create the images and thumbnails pages for all collections.
      css -- Minimize the collection.css file.
    tsync -- Update the template's replace blocks in sync with the header.tea content.

* vpages: Validate all the html files.

   vindex -- Validate index html
   vready -- Validate images and thumbnails pages for all collections.
             g vready 58 validates one collection.

* all: Compile most everything in parallel: ts, pages (not tsync, vpages).
~~~

[⬇](#Contents)

# Build Folder

The dist folder contains the distribution files that get deployed and
nothing else.  The static resources are checked in to this folder. The
compiled resources are put here.

The collection image files are not checked in. They are managed
outside this project. The collection cjson files are checked in.

<style>body { max-width: 40em}</style>

# Contents

* [Build Setup](#build-setup) -- how to download the code and create the docker build container.
* [Build All](#build-all) -- how to build all.
* [Setup Container](#setup-container) -- how to configure the container the first time.
* [Build Tasks](#build-tasks) -- how to build individual files and other tasks.
* [Build Folder](#build-folder) -- talks about the build folder.
