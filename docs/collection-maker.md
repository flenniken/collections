# Collection Maker

How to create a new collection.

* create a folder with images following the initial manual steps
* create the collection's cjson file by running the maker -new command
* determine the images in the collection and their order with the maker page
* enter the image descriptions with the maker page
* define the zoom points
* publish

[⬇](#Contents) (table of contents at the bottom)

# Initial Steps

You use Adobe applications to find and edit images for a collection.

* open Adobe Bridge

* rate 8 - 20 original images so the best appear together

* edit them in camera raw

* create a folder in the tmp for the collection. Name the
  folder x where x is the next collection number, e.g. tmp/4.

* in camera raw, save full size jpgs to the folder and add -p to the
  names, e.g. tmp/c3/CF8A0420-p.jpg

* make copies of the images and rename the copies to have -t.jpg
  names:

~~~
cd tmp/working/c3
for file in *-p.jpg; do
  cp "$file" "${file/-p.jpg/-t.jpg}"
done
~~~

* open the -t images in photoshop and crop them square 480 x 480
  pixels jpgs

[⬇](#Contents)

# Make New

You run the maker -new command to create the collection's local image
folder from the folder of images you created.

The command creates the collection's cjson file in the folder which
describes the collection.  It contains empty titles and descriptions
and an arbitrary image order.  You will fill in this information later
with the maker page.

Run the command and specify the folder:

~~~
scripts/maker -c 3

Created a new local collection: images/c3
~~~

If a problem is found, it stops so you can correct the problem. It
validates:

* that the collection is the next available collection. It checks the
  S3 /db prefix files.
* that the images are jpg files
* that there are at least 8 images and not more that 20
* that the preview files are greater than or equal to 933 x 933 pixels
* that the thumbnail files are 480 x 480 pixels
* that each image has a preview and thumbnail
* that no extra files exist in the folder

After after successful validation it:

* reserves the collection name, for example c3, by adding the db/c3
  prefix file to S3

* the new folder is moved to the images folder

* the cjson file is created and written to the folder

* the cjson order list is set to a list of -1 meaning that nothing is
  in the collection yet.

[⬇](#Contents)

# Edit Collection

You use the maker page to determine which images to included in the
collection (from the initial 20), to determine their order, and to
enter descriptive text.

As an admin you click the maker icon to visit the maker page. You
select the collection to edit from the dropdown menu. You do this
while running from localhost on your desktop. You do all your testing
on localhost. Not until it passed all tests do you publish it to the
world.

***Saving***

Your edits change the cjson file. You must be careful to save your
changes with the Save button.

You will lose your changes if you refresh the page or select a
different collection to edit!

When you save, the cjson file is downloaded to the download folder.
You need to move it to the images folder. For example to move the c1
json file:

~~~
mv ~/Downloads/c1.json dist/images/c1/
~~~

***Maker Page UI***

The maker page elements:

* on the left is a table of boxes, 2 columns by 8 rows. This table
  tells which images are in the colloection and their order.

* on the right is a table containing the 20 available images

* you click on an image on the right to put it in the next collection
  box.

* you click on a box image to move it to back with the available images

* you cmd-click a collection box to open up an empty box or to close one

* at the top you enter the collection’s title and post date and below
  you enter the descriptive text for the collection and images

[⬇](#Contents)

# Collection.json

The gulp command creates the collections.json file from the cjson
files used when building the web pages.

[⬇](#Contents)

# Zoom Points

After you specify the required elements and click the "remove extra
images" button this marks the collection ready.  The next step is to
build the collection pages and set the zoom points.

On the image page you size and pan each image to set its zoom
points. You save the zoom points by downloading the cjson and copying
it to the collection folder.

[⬇](#Contents)

# Deploy

Deploy the collection to the world.

# Contents

* [Initial Steps](#initial-steps) -- the initial manual steps to create a new collection.
* [Make New](#make-new) -- how to create the starting cjson file for a collection.
* [Edit Collection](#edit-collection) -- how to order and describe the new collection.
* [Collection.json](#collection-json) -- how to create the collections.json file for building the index.
* [Zoom Points](#zoom-points) -- how to set the collection zoom points.
* [Deploy](#deploy) -- how to publish the collection to the world.
