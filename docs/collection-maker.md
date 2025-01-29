# Collection Maker

How to create a new collection. 

Follow these steps to create a new collection. 

# Manual Steps

You used Adobe applications to find and edit images for a collection.

* open Adobe Bridge
* tag from 8 - 20 original images with the next collection number, e.g. c24 
* edit them if needed
* create a temp folder named after the collection, e.g. dist/local/24 
* create full size jpgs of the originals in the local folder, leave the name the same except use the "-p.jpg" extension. 
* make square 480 x 480 jpg thumbnails and put them in the folder with the extension "-t.jpg". 

Hand edit the json file or do the steps in the sections that follow. 

# Maker Script

You run the maker script to do two things, to create the starting
collection json file (cjson) and to to deploy the images files to S3
(not the html pages) after selecting the order and adding descriptons.

You create a new cjson file by running the script and specifying the
collection number:

~~~
scripts/maker -m 24 
~~~

It does the validate the files. If a problem is found, it stops so you
can correct it. It validates:

* that p files are greater than or equal to 933 x 933
* that the t files are 480 x 480 pixels
* that the files come in pairs
* the collection number by looking at S3. It needs to be next and not exist.  If the collection already exists, go back and increment the tag in Adobe Bridge and start over. 

Once the files pass validation, it does the following:

* it creates the cjson file in the local folder
* it creates a temp section in the cjson for the 20 images
* it initially does not have any associated text and the order is arbitrary
* it gets the image width, height, and byte size for the 20 images (40 when counting the thumbnails)

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

Your edits change the cjson file. Every 10 seconds your changes are
saved, if needed, by the `post-collection` api.

The maker page ui:

* on the left is a table of 2 columns and 8 rows. 
* on the right are the 20 thumbnail images
* you click on an image to put it in the next available box. 
* you click on a box image to remove it
* it lists the images not used so you can untag them. The not used images are the ones still in the temp json section
* next to each box is an edit icon for editing the image title and description. 
* at the bottom is a button to enter the collections title and description
* at the top is a button to enter the collections title, description and post date for the index page. post date, e. g. 2025-01-26 and Jan 26, 2025

* todo: add the index info to the collection json. the index page builder needs to be changed to make it from a set of collections. 
* todo: store the base name in the json data so you can match up with the original using the tag and the name. Use an unique id?

# Deploy New Folder

You deploy the files to S3 with the maker script using the -d option.
You do this after when you are finished editing the collection.

~~~
scripts/maker -d 24
~~~

The -d option does the following:

* it renames the image files locally to use the standard naming
* it updates the local json file in the json folder with the new names 
* it copies the local image folder to S3 in the production location
* it makes a copy of the index thumbnail to the tin folder on s3
* it deletes the local collection folder

# Build Collection Pages

After the cjson file and the image files have been deployed to S3
(maker -d), you can run the gulp build command to create the
collections thumbnails and image pages and to update the index page.

* The pages are built based on the cjson file. 
* Users do not see the new collection until you deploy. 
* You test locally. 

# Set Zoom Points

You set the zoom points as well as test on you local machine before you deploy it to the world.

You use the developer tools to set the width and height of the screen
before setting the zoom points. For each full size image you zoom in
and pan to set its zoom points in both orientations.

You save your zoom point changes with the admin icon. It saves the
zoom points in the json file with the `post-collection` api.

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

