# Collection Maker

How to create a new collection for the Collections project.

* create a folder with images
* run the maker command
* edit the collection with the maker web page
* define zoom points for the images
* deploy

[⬇](#Contents) (table of contents at the bottom)

# Create Folder

Create a tmp folder with images and their thumbnails. Make sure the
folder contains:

* at least 8 preview images and no more than 20
* each image has a thumbnail
* all images are jpg
* preview files end with -p.jpg
* thumbnail files end with -t.jpg
* preview files are at least 933 pixels wide and tall
* thumbnail files are square 480 x 480 pixels
* no extra files exist in the folder

Create the folder in the tmp folder named with the collection
number. For example, for the 5th collection:

~~~
mkdir tmp/5
~~~

__Mac Photos__

Here are the steps you can use to collect the files with the Mac Photos app.

* launch Photos
* select 8 to 20 images. Use the cmd-click to add to the selection.
* select export menu: File > Export > Export Unmodified Originals for 20 Photos
* uncheck "Export IPTC as XMP"
* select filename: Sequential
* leave the prefix blank
* leave the Subfolder Format as None
* click Export
* select the empty tmp/5 folder

If your photos were Live Photos, you end up with .HEIC and .mov files
for each image.

[![Tmp Folder](tmp-listing.png)](#)

* Remove the .mov files
* Open the HEIC files in Photoshop
* edit then save each file as jpg (use File > Save)
* uncheck "Embed Color Profile: Display P3"

♫ Note: When using Photoshop, make sure to save the jpgs without color
information or the maker command will report the file as MPO format.

♫ Note: how do you pick a live photo frame to edit?  What is a HEIC
file, one image or multiple. What is the .mov file?

♫ Note: If you drag and drop photos from Photos to the tmp folder, you
get jpg files. How does Photos app make the jpg from the originals?
How does this workflow compare to the one documented here?

* once all the jpg are created, remove the HEIC files

Rename the jpg files (preview images) to end with "-p.jpg". For example:


~~~
cd tmp/4
for file in *.jpg; do
  mv "$file" "${file/.jpg/-p.jpg}"
done
~~~

Then copy all the images which will become the thumbnails:

♫ Note: look for jpeg files and rename them to jpg.

~~~
cd tmp/4
for file in *-p.jpg; do
  cp "$file" "${file/-p.jpg/-t.jpg}"
done
~~~

Open the thumbnails (`-t`) images in Photoshop and crop them square
480 x 480 dimensions.

* use the crop tool
* use the Image Size dialog
* save
* close

[⬇](#Contents)

# Run Maker

Run the maker command to create the `cjson` file and to move the
collection's tmp folder to the dist folder.

The `cjson` file contains empty titles, descriptions, and an arbitrary
image order. You will update this information later using the maker
web page.

The maker command validates the files and if a problem is found, the
process stops so you can correct it. The command:

* validates the files
* creates the `cjson` file in the folder
* moves the new folder to the `images` directory
* sets the `cjson` order list to `-1`, indicating no images are in the collection yet

For example:

~~~
scripts/maker -n 4

Created a collection folder and moved it to: dist/images/c4
~~~

[⬇](#Contents)

# Edit Collection

Use the maker page to select images for the collection, determine
their order, and add descriptive text.

You build the maker page with gulp, for example:

~~~
g all
~~~

You access the Maker Page as an admin from the index's about box by
clicking the maker link.  Select the collection to edit from the
dropdown menu. Perform all testing on `localhost` before publishing
the collection.

__Saving Changes__

Edits to the maker page update the `cjson` file. Save your changes
using the **Save** button to avoid losing them. Refreshing the page or
selecting a different collection without saving will discard your
changes.

When you save, the `cjson` file it is downloaded to your `Downloads`
folder. Move it to the `images` directory. For example:

~~~
mv ~/Downloads/c1.json dist/images/c1/
~~~

__Maker Page UI__

Below is a partial screenshot of the maker web page:

[![Maker Page](maker.png)](#)

The maker page includes the following elements:

* __Left Panel__: A 2-column by 8-row table showing the collection images and their order.
* __Right Panel__: A table of 20 available images.
* __Top Section__: Fields for entering the collection’s title and post date.
* __Bottom Section__: Fields for entering descriptive text for the collection and its images.

__Interactions__

* Click an image in the right panel to add it to the next available collection box.
* Click an image in the left panel to move it back to the available images.
* Cmd-click a collection box to open or close an empty box.

[⬇](#Contents)

# Zoom Points

Build and deploy the code then set the zoom points.

After specifying the required elements and clicking the **Remove Extra
Images** button, the collection is marked as ready. Gulp builds ready
collections.

~~~
g all
scripts/deploy -s
~~~

On your iphone, on the image page, size and pan each image to define
its zoom points. Click the download icon then air-drop it to
yourself. This saves it in the downloads folder on your desktop
machine.  Then you move it to the collection's folder.

♫ Note: air-drop doesn't work when your iphone is plugged into your
mac.

Run the `gulp` command to build in the final zoom points, then deploy
and test the image pages again.

[⬇](#Contents)

# Deploy

The deploy command copies the files to S3 and updates Cloudfront. The
collections in "building" state are only visible to admins.  This
allows admins to set zoom points and test the collection.

Once the collection looks good, you remove the "building" field from
the cjson, build all, then deploy again.  This publishes it to the
world.

~~~
scripts/deploy -s
~~~

[⬇](#Contents)

# Contents

* [Create Folder](#create-folder) -- create a folder with the collection images.
* [Run Maker](#run-maker) -- Run the maker command.
* [Edit Collection](#edit-collection) -- how to order and describe the new collection.
* [Zoom Points](#zoom-points) -- how to set the collection zoom points.
* [Deploy](#deploy) -- how to publish the collection to the world.
