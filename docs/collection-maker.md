# Collection Maker

Learn how to create a new collection for the Collections project.

* Create a folder with images following the initial manual steps.
* Generate the collection's `cjson` file using the `maker -new` command.
* Use the maker page to determine the images in the collection and their order.
* Add image descriptions using the maker page.
* Define zoom points for the images.
* Publish the collection.

[⬇](#Contents) (table of contents at the bottom)

# Initial Steps

Follow these steps to prepare images for a new collection using Adobe
applications.

* Open Adobe Bridge.
* Rate 8–20 original images to select the best ones for the collection.
* Edit the selected images in Camera Raw.
* Create a folder in the `tmp` directory for the collection. Name the folder `x`, where `x` is the next collection number (e.g., `tmp/4`).
* In Camera Raw, save full-size JPGs to the folder and append `-p` to the filenames (e.g., `tmp/c3/CF8A0420-p.jpg`).
* Make copies of the images and rename them with `-t.jpg` suffixes:

~~~
cd tmp/working/c3
for file in *-p.jpg; do
  cp "$file" "${file/-p.jpg/-t.jpg}"
done
~~~

* Open the `-t` images in Photoshop and crop them to square dimensions
  (480 x 480 pixels, JPG format).

[⬇](#Contents)

# Make New

Use the `maker -new` command to create the collection's local image
folder and `cjson` file.

The `cjson` file describes the collection, including empty titles,
descriptions, and an arbitrary image order. You will update this
information later using the maker page.

Run the command and specify the folder:

~~~
scripts/maker -c 3

Created a new local collection: images/c3
~~~

If a problem is found, the process stops so you can correct it. The
command validates:

* The collection is the next available collection (checks the S3 `/db` prefix files).
* All images are JPG files.
* There are at least 8 images and no more than 20.
* Preview files are at least 933 x 933 pixels.
* Thumbnail files are 480 x 480 pixels.
* Each image has both a preview and a thumbnail.
* No extra files exist in the folder.

After successful validation, the command:

* Reserves the collection name (e.g., `c3`) by adding the `db/c3` prefix file to S3.
* Moves the new folder to the `images` directory.
* Creates and writes the `cjson` file to the folder.
* Sets the `cjson` order list to `-1`, indicating no images are in the collection yet.

[⬇](#Contents)

# Edit Collection

Use the maker page to select images for the collection, determine
their order, and add descriptive text.

You access the Maker Page as an admin from the index's about box by
clicking the maker link.  Select the collection to edit from the
dropdown menu. Perform all testing on `localhost` before publishing
the collection.

## Saving Changes

Edits to the maker page update the `cjson` file. Save your changes
using the **Save** button to avoid losing them. Refreshing the page or
selecting a different collection without saving will discard your
changes.

When you save, the `cjson` file is downloaded to your `Downloads`
folder. Move it to the `images` directory. For example:

~~~
mv ~/Downloads/c1.json dist/images/c1/
~~~

## Maker Page UI

The maker page includes the following elements:

* **Left Panel**: A 2-column by 8-row table showing the collection images and their order.
* **Right Panel**: A table of 20 available images.
* **Interactions**:
  * Click an image in the right panel to add it to the next available collection box.
  * Click an image in the left panel to move it back to the available images.
  * Cmd-click a collection box to open or close an empty box.
* **Top Section**: Fields for entering the collection’s title and post date.
* **Bottom Section**: Fields for entering descriptive text for the collection and its images.

[⬇](#Contents)

# Collections.json

The `gulp` command generates the `collections.json` file from the
`cjson` files. This file is used to build the web pages.

[⬇](#Contents)

# Zoom Points

After specifying the required elements and clicking the **Remove Extra
Images** button, the collection is marked as ready. The ready state is
picked up by Collections.json and the collection pages are built.

On the image page, size and pan each image to define its zoom
points. Save the zoom points by downloading the updated `cjson` file
and copying it to the collection folder.

Build in the final zoom points and test the image pages again.

[⬇](#Contents)

# Deploy

Publish the collection to make it available to the world.

[⬇](#Contents)

# Contents

* [Initial Steps](#initial-steps) -- the initial manual steps to create a new collection.
* [Make New](#make-new) -- how to create the starting `cjson` file for a collection.
* [Edit Collection](#edit-collection) -- how to order and describe the new collection.
* [Collections.json](#collections-json) -- how to create the `collections.json` file for building the pages.
* [Zoom Points](#zoom-points) -- how to set the collection zoom points.
* [Deploy](#deploy) -- how to publish the collection to the world.