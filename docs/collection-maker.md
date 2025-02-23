# Collection Maker

How to create a new collection.

# Manual Steps

You used Adobe applications to find and edit images for a collection.

* open Adobe Bridge
* rate 8 - 20 original images
* edit them in camera raw
* using the keyword panel, tag them with the collection, e.g. c3
* create a folder in the dist/local folder named after the collection, e.g. dist/local/c3
* in camera raw, save full size jpgs the collection folder add -p to the names, e.g. dist/local/c3/CF8A0420-p.jpg
* make copies of the images and rename the copies to have -t.jpg names:

~~~
cd dist/local/c3
for file in *-p.jpg; do
  cp "$file" "${file/-p.jpg/-t.jpg}"
done
~~~

* open the -t images in photoshop and make them into square 480 x 480 jpg thumbnails


Hand edit the json file or do the steps in the sections that follow.

Note: the following sections are plans for the future.

[⬇](#Contents) (table of contents at the bottom)

# Maker Script

You run the maker script to create the starting collection json file
from the folder of images. The titles and descriptions are empty and
the order of the images is arbitrary. You will fill in this
information later.

You create a new cjson file by running the script and specifying the
collection number:

~~~
scripts/maker -m 3

Wrote collection json file: dist/local/c3/c3.json
~~~

It validate the files. If a problem is found, it stops so you
can correct it. It validates:

* that the images are jpg files
* that the preview files are greater than or equal to 933 x 933 pixels
* that the thumbnail files are 480 x 480 pixels
* that each image has a preview and thumbnail
* that no extra files exist in the folder

[⬇](#Contents)

# Maker Page

You use the maker page to determine which images to included in the
collection (from the initial 20), to determine their order, and to
enter the descriptive text. Run it in your browser:

~~~
https://localhost:8000/maker.html
~~~

You open the new collection from a dropdown menu and you make your
changes.  The dropdown choices come from `get-new-collections` api
which returns the local image folders that have cjson files.  The
cjson list comes from the `get-collection api`.

Your edits change the cjson file. Your changes are saved
automatically.

The maker page ui:

* on the left is a table of boxes, 2 columns by 8 rows.
* on the right are the 20 thumbnail images
* you click on an image to put it in the next available box.
* you click on a box image to move it to back with the temp images
* you need to untag the images you don’t use (the remaining temp images) in Adobe Bridge.
* next to each box is an edit icon for editing the image title and description.
* at the bottom is a button to enter the collections title and description for the thumbnails page
* at the top is a button to enter the collections title, description and post date for the index page. post date, e. g. 2025-01-26 and Jan 26, 2025

* todo: add the index info to the collection json. the index page builder needs to be changed to make it from a set of collections.
* todo: store the base name in the json data so you can match up with the original using the tag and the name. Use an unique id?

[⬇](#Contents)

# Deploy New Folder

You deploy the files to S3 with the maker script using the -d option.
You do this after you finish editing the collection.

~~~
scripts/maker -d 24
~~~

The -d option does the following:

* it renames the image files locally to use the standard naming
* it updates the local json file in the json folder with the new names
* it copies the local image folder to S3 in the production location
* it makes a copy of the index thumbnail to the tin folder on s3
* it deletes the local collection folder

[⬇](#Contents)

# Build Collection Pages

After the cjson file and the image files have been deployed to S3
(maker -d), you can run the gulp build command to create the
collections thumbnails and image pages and to update the index page.

* The pages are built based on the cjson files.
* Users do not see the new collection until you deploy.
* You test locally.

[⬇](#Contents)

# Set Zoom Points

You set the zoom points as well as test on your local machine before
you deploy it to the world.

You run the collections web app on your local machine and log in as an
admin so the needed icons appears.  You use the developer tools to set
the width and height of the screen before setting the zoom points. For
each full size image you zoom in and pan to set its zoom points in
both orientations.

You save your zoom point changes with the admin save icon. It saves the
zoom points in the json file with the `post-collection` api.

[⬇](#Contents)

# Deploy

After you finish setting the zoom points and testing, you deploy the
new pages everyone can see the new collection.  Run the deploy script:

~~~
scripts/deploy -sw
~~~

# Implementation Details

**Width & Height**

You can determine the width and height of a JPEG image in Python using
the Pillow library (PIL). Here’s how to do it:

Code Example:

~~~
from PIL import Image

# Open the image file
image = Image.open("your_image.jpg")

# Get width and height
width, height = image.size

print(f"Width: {width}, Height: {height}")
~~~

~~~
pip install pillow
~~~

**Edit Pages**

Eventually it would be nice to allow users to edit the descriptions on
the public pages.

You could open it up first for admins.

**API**

Create an api to fetch and save the collection json file while running
locally.

* **save-json** -- post request that saves cjson to disk. The collection number is in the cjson so you know where to store it.
* **get-json** -- get request to fetch the cjson, you pass the collection number
* **get-local-collections** -- get request that returns the collections. A list of numbers for the local collections and a number for the remote collections (1-number).

**Local Folder**

Make a local folder for the files that don’t get copied to s3 but need
to be under the dist folder

~~~
dist/local
dist/local/images
dist/local/maker.html
dist/local/get-json
dist/local/post-json
~~~

* put the temp collection files there
* put the server files there for get and post json
* put the maker page there
* write in typescript the maker js code
* write the maker and server code in python

**todo**

* Store json in the collections folder. Check them in in the project dist folder.
* store the html thumbnails and image pages there too.
* we could version the js files if necessary. Then the html pages to not need to need rebuilt.
* in the json file make a thumbnail and index section, for their information.
* exclude the maker.html page from the deploy sync
* exclude the images in the images folder too?

# Contents

* [Manual Steps](#manual-steps) -- the manual steps to create a folder of images for a new collection.
* [Maker Script](#maker-script) -- how to create the starting cjson file and how to deploy to s3.
* [Maker Page](#maker-page) -- how to order and describe the new collection.
* [Deploy New Folder](#deploy-new-folder) -- how to copy the new collection folder to s3.
* [Build Collection Pages](#build-collection-pages) -- how to make the collection html pages.
* [Set Zoom Points](#set-zoom-points) -- how to set the zoom points.
* [Deploy](#deploy) -- how to deploy the finished collection.
* [Implementation Details](#implementation-details) -- details about writing the code.
