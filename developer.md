# Developer Topics

[![icon](docs/rounded-icon.png)](#)

This page tells you how to setup, build and develop Collections.

[⬇](#Contents) (table of contents at the bottom)

# Build Collections

Collections is written in typescript and there is a build step.

You use the provided docker build environment to develop
Collections. It has all the programs installed needed to build the
app.

The code folder is shared with docker and your local environment so
you can edit files locally and build them in the container.

[⬇ ────────](#Contents)

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
alias gr='g run-server &'
alias gw='g watch &'
alias ll='ls -l'
alias ls='ls --color=auto'
alias sudo='sudo '
~~~

You stop the environment by typing ctrl-d.

[⬇ ────────](#Contents)

# Build All

You build the app in the doctor container with the gulp app by typing
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

[23:47:42] Using gulpfile ~/collections/gulpfile.js
[23:47:42] Starting 'default'...

Tasks:
* ts -- Compile and minimize ts files to dist/js.
    i -- Compile image.ts
    t -- Compile thumbnails.ts
    x -- Compile index.ts
    sw -- Compile sw.ts
* pages -- Create all the pages from templates.
    index -- Create the main index page.
    thumbnails -- Create the thumbnails page.
    image -- Create the image page.
* vpages -- Validate all the html files.
    vindex -- Validate index html
    vthumbnails -- Validate thumbnails html
    vimage -- Validate image html
* css -- Minimize the collection.css file.
* syncronize -- Syncronize the template's replace blocks with header.tea.
* run-server -- (alias gr) Run a test server exposing the dist folder on port
    8000. You can run it in the background with alias gr.
    Access files in your browser with: http://localhost:8000/index.html
* watch -- (alias gw) Watch file changes and call the appropriate task. You can
    run it in the background with alias gw.
* readme -- Show the readme file with glow.
* all -- Compile everything in parallel, tasks ts, pages and css.

[23:47:42] Finished 'default' after 1.64 ms
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
|   |-- icon-128.png
|   |-- icon-168.png
|   |-- icon-192.png
|   |-- icon-256.png
|   ...
|-- images
|   |-- 1-p.jpg
|   |-- 1-t.jpg
|   |-- 2-p.jpg
|   |-- 2-t.jpg
|   ...
|-- index.html
|-- js
|   |-- image.js
|   |-- index.js
|   `-- thumbnails.js
|-- pages
|   |-- image-1.html
|   `-- thumbnails-1.html
`-- sw.js
~~~

[⬇ ────────](#Contents)

# Login Setup

Collections uses the AWS Cognito service to handle login.  This allows
collections to be a public static website without a backend server
(other than AWS).

Users login with an email and a password. You add and remove users
manually. Admin users see debugging controls in the UI.

AWS Cognito allows you to create multiple user pools for application
login. You will create one for Collections.

To setup login you perform the following steps:

* Create Admin Email
* Create IAM User
* Create User Pool
* Create Config File
* Create a User
* Test Login Flow

Each step is described below.

## Create Admin Email

You login to your AWS console and create an SES email of the admin of
Collections. Verify the email. When you create the pool this email
will be used.

todo: more detail needed.  How does this email get used when the pool is created?

## Create IAM User

You create an AWS IAM user in the AWS console so you can create the
Cognito user pool with the cognito script. It's also used to test
login with the login-flow script.

* login to the AWS console
* select the IAM service
* click the plus sign and add a new user

Give the user cognito power user permissions, and SES readonly
permissions (AmazonCognitoPowerUser, AmazonSESReadOnlyAccess).

Save the credentials somewhere safe. You need the credentials when
you create a new docker image.

Put the credentials on the docker container with the aws command line
configure command:

~~~
# from docker container
aws configure
~~~

## Create User Pool

An AWS Cognito user pool maintains the users of Collections.
You create the user pool with the cognito script as shown below. In the
example it creates the user pool called “collections-pool”.

~~~
# from docker container
scripts/cognito —c collections-pool
~~~

## Create Config File

The config file is used by the website build process so the resulting
Collection's code knows how to communicate with the user pool.

You create the config file with the cognito script as shown below. It
reads the "collections-pool" information from AWS and writes it to a
file.

~~~
# docker container
scripts/cognito —w collections-pool

Wrote the cognito config file. View it with:

  cat /home/coder/.aws/cognito-config | jqless
~~~

The file looks something like this:

~~~
{
  "client_id": "asdfasdfasdfasdfasdfasdfad",
  "redirect_uri": "https://collections.flenniken.net/index.html",
  "logout_uri": "https://collections.flenniken.net/index.html",
  "scope": "openid profile",
  "domain": "https://pool42613626.auth.us-west-2.amazoncognito.com"
}
~~~

# Create or Edit User

You create a new Collections user with the cognito command from the
docker container.  For example, to add a user to the
"collections-pool" do the following:

~~~
# from docker container
scripts/cognito -u collections-pool
~~~

The command will prompt for the needed information. Below is an
example:

~~~
# from docker container
scripts/cognito -u collections-pool

This command will add a new user after prompting for their information.

Enter email address, e.g. steve.flenniken@gmail.com
email?: tom.bombadil@gmail.com
Enter given name, e.g. Steve
given name?: Tom
Enter family name, e.g. Flenniken
family name?: Bombadil
Is the user an admin, True or False?: True
password?:
~~~

If you want to edit an existing user, list the users to find the
user’s id then use the -e option to edit them.

Find user, for example Tom Bombadil:

~~~
# from docker container
scripts/cognito -l collections-pool | less

...
email: tom.bombadil@gmail.com
first: Tom
last: Bombadil
id: 0861b3f0-e041-707e-bb34-4a03ac172325
status: CONFIRMED
created: 2024-10-04 20:45:39 UTC
admin: true
...
~~~

Edit user Tom bombadil:

~~~
# from docker container
scripts/cognito -e collections-pool  0861b3f0-e041-707e-bb34-4a03ac172325

Type in the new user settings or type enter to leave as is.
tom.bombadil@gmail.com, email?:
Tom, given name?: Thomas
Bombadil, family name?:
true, admin (True or False)?:
password?(use blank to leave as is):

email: tom.bombadil@gmail.com
first: Thomas
last: Bombadil
admin: true
Password: unchanged
~~~

You use the AWS console to disable or delete a user

## Login-flow Script

You use login-flow script to manually step through the login process
for debugging and testing.  You can view decoded tokens.

~~~
# docker container
scripts/login-flow

This script is for testing the login flow that Collections uses.

The basic flow:

  * Use -l to get the login url.
  * Paste the login url in your browser and login, you will be redirected.
  * Copy the code in the url in your browser's address bar.
  * Use -g option specifying the code. This creates the tokens.json file.
  * Use -s to look at the tokens file.
  * Use -d id_token, -d access_token, -d refresh_token, to peer into each token.
~~~

[⬇ ────────](#Contents)

# Test Tips

How to develop on Chrome, Safari or xcode simulator.

For Chrome you start a local server on the dist folder (gr) and work
in a phone view. You enable the mouse to simulate touch, see Test
Touch. You set up at least two phone views for a “iPhone 14 Pro Max”,
portrait 430 x 933 and landscape 932 x 430.

For Safari you plug your iphone into your mac and debug remotely, see
Test on iphone.

For xcode simulator, you get it by installing xcode.  Launch it and
run an iphone 14 max. Like chrome you run the code on a localhost
server (gr) and reference a localhost url. You can test the install
process and two finger touching. It’s also good for making screenshots
that include the bezel. You can see the console log in desktop safari
like you do when debugging a plugged in iphone.

[⬇ ────────](#Contents)

# Test Touch

You can test one finger touch with your mouse in Chrome on your
desktop by turning on a setting in the developers tools.

* bring up tools, right click and select inspect
* bring up the run command: menu (three dots) > Run command
* type “sensors” in the Run box and type enter -- the sensors tab appears
* scroll down to the touch section and select "Force Enabled"
* test by mousing over the web page.  The mouse cursor should be a small circle.

[⬇ ────────](#Contents)

# Test on iphone

You can use safari on your mac to debug collections on an iphone
connected with a wire.  Safari works as if the app was on your mac.

You must have a new iphone os and matching mac os version. The os and
safari have the same version number and are bundled together, so look
at the mac version number to compare.

To debug:

* connect iphone with wire
* launch collections on iphone by tapping the collections desktop icon
* launch Safari on your mac
* pull down the develop menu and select collections

[⬇ ────────](#Contents)

# Test Procedure

When making changes to the image page test them with these steps:

* zoom at a point
* zoom to limits, small and big, then pan around
* zoom when v scrolled
* double tap to restore
* h scroll
* h scroll half way and snap back
* flick h scroll
* h scroll and overscroll on both ends
* v scroll and overscroll on both ends
* zoom image small, go to thumbnails, tap the same image and verify image is at its zoom point
* long press to copy text then extend the selection
* rotate the last image then rotate it back and verify it remains on the same image
* scroll h & v in landscape mode
* no flash on load and no flash on rotate
* tap the thumbnails menu icon
* tap the index menu icon

# Contents

* [Build Collections](#build-collections)
* [Build Setup](#build-setup)
* [Build All](#build-all)
* [Build Tasks](#build-tasks)
* [Build Folder](#build-folder)
* [Login Setup](#login-setup)
* [Test Tips](#test-tips)
* [Test Touch](#test-touch)
* [Test on iphone](#test-on-iphone)
* [Test Procedure](#test-procedure)

# Other

* [Readme](readme.md) &mdash; tells what Collections is and how to use it on your iphone.

