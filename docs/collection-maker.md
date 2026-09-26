# Collection Maker

You create a new collection by:

* create a folder and add images
* rename, convert, and make thumbnails
* create json file
* move the folder to dist
* set order on the thumbnails page
* set descriptions
* set zoom points
* publish and notify

We show how to do these steps in detail below.

[⬇](#Contents) (table of contents at the bottom)

# Create Folder

Create a tmp folder for the new collection named with the next
collection prefix. List `dist/images` to find the next name. For the
example below, create c29. Make sure to create the cnum bash variable,
it will be used in multiple commands.

~~~
# from container
printf '%s\n' dist/images/c*/ | sort -V | tail -3

dist/images/c26/
dist/images/c27/
dist/images/c28/

cnum=c29 # variable
mkdir tmp/$cnum
~~~

Put 8, 10, 12, 14, or 16 of your best photos in the folder. We show
detailed steps Apple Photos and for Adobe Bridge.

__Apple Photos__

For Apple Photos follow these steps:

* create an album with all the photos for the topic
* mark 8, 10, 12, 14, or 16 favorites
* filter by favorites, select all
* File > Export > Export Unmodified Originals
* uncheck "Export IPTC as XMP"
* filename: Sequential, no prefix, no subfolder
* export into the empty `tmp/cN` folder
* check the files in the cN folder with the finder

♫ Note: Export Unmodified Originals exports the photos without changes
you might have made, but it gives you the live photo movie files.  If
you export jpegs, you get your changes but no live movies.

♫ Note: Live Photos export as two files, paired `.HEIC` and `.mov` files.

__Adobe Bridge Photos__

For Adobe Bridge follow these step. You can use Dng, Tiff or jpeg
files using Adobe Bridge.

* Open Adobe Bridge
* Find a folder of images you want to select from to make a collection
* Mark the images you want with stars
* Select the martini shaped icon and select the menu to show your files, e.g. "Show 3 or more stars"
* Edit the originals now if you want
* select all then export the files as jpg files to the collection folder, e.g. tmp/c28.  File > Export to > Custom export.   Choose Save to > Specific folder and browse to tmp/c28.  Extension .jpg, Image Quality 8,  Scale image > 100%, Include metadata
* Use the Finder to check the folder of files

[⬇](#Contents)

# Rename and Convert

You rename and convert the files to the format expected by Collections.

__Standard Rename__

You rename the files to the collection's standard names using the rename
command as shown below.

You can the rename again after adding images and the standard names are
left alone. New files take the next number after the highest number in
the folder. Gaps are kept.

~~~
# from container
scripts/standard-rename tmp/$cnum

rename: 1.HEIC -> c29-1-p.HEIC
rename: 1.mov -> c29-1-v.mov
rename: 2.HEIC -> c29-2-p.HEIC
rename: 2.mov -> c29-2-v.mov
rename: 3.HEIC -> c29-3-p.HEIC
...
~~~

__Convert HEIC to Jpg__

Convert the HEIC files to jpg.

~~~
scripts/convert-heic-previews tmp/$cnum

convert: c29-1-p.HEIC -> c29-1-p.jpg
File contains 1 image
Written to tmp/c29/c29-1-p.jpg
remove: c29-1-p.HEIC
convert: c29-10-p.HEIC -> c29-10-p.jpg
File contains 1 image
Written to tmp/c29/c29-10-p.jpg
remove: c29-10-p.HEIC
...
~~~

__Convert MOV to Mp4__

Live videos are optional. Delete any `.mov` files you do not want to
keep. Look at them in the finder and drag the ones you don't want to
the trash.

If you only have a video, make a jpg preview file by extracting a
frame with the free Frame Grabber application on the iPhone and
renaming it to the standard naming.

Convert the remaining `.mov` files to `.mp4`.

♫ Note: We convert mov to mp4 because browsers play mp4 more reliably.

~~~
scripts/convert-live-videos tmp/$cnum

convert: c29-1-v.mov -> c29-1-v.mp4
remove: c29-1-v.mov
convert: c29-10-v.mov -> c29-10-v.mp4
remove: c29-10-v.mov
...
~~~

__Thumbnails__

Make 480 x 480 center-crop thumbnails from the preview files. Existing
`-t.jpg` files are left alone, so you can add a new preview file and
re-run the command.

~~~
# from container
scripts/make-thumbnails tmp/$cnum

make: c29-1-t.jpg
make: c29-2-t.jpg
make: c29-3-t.jpg
make: c29-4-t.jpg
...
~~~

Check the files in the finder. The folder should contain matching
`-p.jpg` and `-t.jpg` files, optional `-v.mp4` files, and nothing
extra. Previews must be at least 933 pixels on both sides.

Later in the editing phase you can create new thumbnails for the ones
that don't look good.

Duplicate the tmp folder in the Finder if you want a backup.

[⬇](#Contents)

# Make Json File

Run the maker command to validate the files and write `cN.json`.

~~~
# from container
scripts/maker tmp/$cnum

Wrote tmp/c24/c24.json
~~~

The json includes every photo in disk order. Titles and descriptions
are empty. Collections start with the `building` flag, so only admins
see them. `g all` builds the image and thumbnails pages right away so
you can edit in place.

__GPS and Time__

Add GPS locations and capture times:

~~~
scripts/add-locations tmp/$cnum/$cnum.json

Wrote 16 images (16 with GPS, 16 with time) to tmp/c29/c29.json
  c29-1-p.jpg  45.7080917,-123.9392083  2019-07-11T19:25:12
  c29-2-p.jpg  45.7081861,-123.9393167  2019-07-11T19:45:14
  c29-3-p.jpg  45.7080944,-123.9391333  2019-07-13T18:58:55
  c29-4-p.jpg  45.7080528,-123.9415139  2019-07-14T13:37:13
  c29-5-p.jpg  45.7080000,-123.9393306  2019-07-14T18:55:24
~~~

__Optional Thumbnails Page Map__

You can optionally add a location for the thumbnails page
which will show a map below its description.  Open the cN.json and add
the location as shown below.

You can get the GPS coordinates from google maps by dropping a pin
then opening the information below. It will show something like
(45.6868445, -121.3035183) which you can copy and paste as show below
with the location line:

~~~
  "cNum": 35,
  "posted": "",
  "location": "45.6868445,-121.3035183",
  "images": [
~~~

[⬇](#Contents)

# Move into Place

Move the folder into dist, then build:

~~~
mv tmp/$cnum dist/images/
g all
~~~

[⬇](#Contents)

# Edit Collection

Run Collections logged in as Admin on your desktop Chrome running on local host.

~~~
http://localhost:8000/
~~~

* Make sure you are logged in as an admin.
* Refresh the index page so the new collection appears, cmd-shift-r.
* Go to the thumbnails page by clicking the thumbnails icon.
* Order the thumbnails. Long press a thumbnail and drag it to the new location.
* Edit the thumbnails that don't look good, cmd-click a thumbnail.
* Rebuild all the pages, g all.
* Go to the thumbnails page and add the description.
* Go to the index page and add the title, post date and description.
* Go to the image pages and add the descriptions.
* Rebuild all the pages, g all.
* Go to the image pages and edit the verical zoom points.  Bring up the zoom and pan controls by clicking the icon at the bottom of the page.  Double click an image to fit it to the center. Zoom in until the screen is filled (if possible) and position left or right. See zoom point guide.
* Repeat for each image.
* Save all zoom points by clicking the download icon at the bottom of the page.
* Rebuild all the pages, g all.
* Deploy to AWS, scripts/depoly -s
* On the iPhone, review the collection.
* Set the horizontal zoom point for each image, then air drop the json file to the desktop and copy to into the dist folder.
* Rebuild and deploy as before.
* On the iPhone, review the collection.
* Repeat until good.

__Edit Details__

Edit titles, posted dates, and descriptions in place while logged in
as admin. Empty fields show a placeholder so you can tap them. On
localhost the change is automatically merged into
`dist/images/cN/cN.json` when you tap away.

Thumbnails page -- edit collection description and set the image order
with drag and drop. Title and posted date are shown here but edited on
the index. The page reads them from the collection json so they stay
current without `g all`.

To set the image order use localhost as admin, long-press a thumbnail on the thumbnails page
then drag it to a new place. The admin API rearranges the `images` (and
zoom points) in `cN.json`. Run `g all` so the image page matches.

Command-click it (Control-click on Windows) to open a crop
dialog. The square starts as large as it can.  Drag it to move, or
drag a corner to shrink or grow it. It cannot go below 480 pixels on
the preview. Then OK. The admin API overwrites the `-t.jpg` file
from the preview.

__Zoom Points__

Set zoom points on localhost Chrome, open the image page as admin. Tap
the four-arrow icon in the bottom menu to show zoom and pan buttons at
the upper right of the photo.  Zoom and pan each image, then tap the
download icon to write `dist/images/cN/cN.json`. Hold a button to
repeat. Arrow keys and +/- work while the pad is open. Hold Command
for one-pixel pans and smaller zoom steps.

Use the same phone viewport you test on an iPhone, for example
iPhone 14 Pro Max at 430 x 933 and 932 x 430.

Save your zoom points with the download icon. On localhost the
download icon writes `cjson` directly. 

__Zoom Points iPhone__

You can still set zoom points on an iPhone with pinch and pan, then
tap the download icon and air-drop the `cjson` to your desktop and
copy it to the dist folder.

~~~
# from mac collections folder
cp ~/Download/c26.json dist/images/c26/
~~~

♫ Note: air-drop doesn't work when your iphone is plugged into your
mac.

Run `g all`, deploy, and check the image pages again.

__Zoom Point Guide__

When setting zoom points for an image, the goal is to make each
picture look like it was created for the screen it’s displayed
on, whether in portrait or landscape orientation. A good zoom point
creates a natural, visually pleasing crop without drawing attention to
the fact that the image has been zoomed.

A well-chosen zoom point can reduce excessive zooming.  The user
doesn’t feel the need to see what’s missing.

* Aim for a good full screen fit in both portrait and landscape modes.
* You are free to zoom in a little aggressively since double tap
  toggles between the zoom point and fit-to-screen.
* Avoid forced crops – If it feels cramped or awkward, zoom out, it’s
  often better to zoom all the way out and show the full frame.
* Show background – Leave hints of background when it helps tell the
  bounds.

[⬇](#Contents)

# Deploy

The deploy command copies the files to S3 and updates Cloudfront. The
collections in "building" state are only visible to admins.  This
allows admins to set zoom points and test the collection before
publishing. You can tell a collection is admin only by the red "Admin"
in the upper left corner of the collection thumbnail.

Typically you build and deploy several times until you get it right.

~~~
g all
scripts/deploy -s
~~~

[⬇](#Contents)

# Publish

Once the collection looks good, you remove the "building" field from
the cjson with your text editor, build all, then deploy again.  This
publishes it to the world.

 ~~"building": true,~~

~~~
g all
scripts/deploy -s
~~~

♫ Note: If you edit your photos after deploying them, the iPhone will
continue to use the photos it has cached.  To see the new ones, delete
the collection and download them again.

[⬇](#Contents)

# Notifiy

You run the notification command to send a notification to all users
of the new collection. Replace "Manzantia 2026" with the collection
title.

~~~
scripts/notification --publish all "Manzantia 2026"
~~~

[⬇](#Contents)

# Extras

__Remove DS Store Files__

The Mac finder creates a .DS_Store file in a folder when it contains
an image. Remove these files from the distribution files and from S3.

Delete the DS Store files from the distribution files:

~~~
find dist -name .DS_Store -delete
~~~

List DS Store files in the s3 bucket sflennikco:

~~~
aws s3 ls sflennikco --recursive | grep .DS_Store

2025-08-06 03:21:04       6148 .DS_Store
2025-09-27 22:11:59       6148 images/.DS_Store
2025-06-22 21:44:23       6148 images/c4/.DS_Store
2025-08-08 04:07:08       8196 images/c5/.DS_Store
2025-09-01 17:50:38       6148 images/c7/.DS_Store
2025-09-19 21:55:03       6148 images/c8/.DS_Store
~~~

Delete all DS_Store files. Preview with dryrun:

~~~
aws s3 rm s3://sflennikco --recursive --exclude "*" --include "*.DS_Store" --dryrun
~~~

__File Roles__

| File     | Role     |
| -------- | -------- |
| -p.jpg | The still photo shown on the image page, used for dimensions in cjson, zoom/pan, and offline download |
| -v.mp4 | Optional motion clip. Live Photos play on press-and-hold. Longer videos show a play button, play to the end, then stop |
| -t.jpg | Square thumbnail for the index and thumbnail pages |

♫ Notes:

* Some types of editing in Photoshop will create layers. You can tell
when this happens when you save and it has a .psd extention. In this case
flatten the image (layer > flatten image), then save to jpg.

* If you save the jpgs with "Embed Color Profile..." checked, the
maker command will report the file as MPO format instead of JPEG. MPO
files are not supported.

<style>body { max-width: 40em}</style>

# Contents

* [Create Folder](#create-folder) -- how to collect, rename, convert, and thumbnail images.
* [Rename and Convert](#rename-and-convert) -- how to rename and convert the image files to collection files.
* [Make Json File](#make-json-file) -- how to make the collection's json file.
* [Edit Collection](#edit-collection) -- how to edit descriptions in place and set order.
* [Deploy](#deploy) -- how to deploy the files to AWS.
* [Publish](#publish) -- how to publish the collection to the world.
* [Notify](#notify) -- how to notify users of the new collection.
* [Extras](#extras) -- how to remove the .DS_Store files and the roles of the collection's files.
