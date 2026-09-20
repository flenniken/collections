# Collection Maker

How to create a new collection for the Collections project.

* create a `tmp/cN` folder and add images
* rename, convert, and make thumbnails
* run the maker command to write `cN.json`
* move the folder to `dist/images` and build
* on localhost as admin edit descriptions in place on the index, thumbnails, and image pages
* set order on the thumbnails page as localhost admin
* set zoom points on localhost admin, then publish

[⬇](#Contents) (table of contents at the bottom)

# Create Folder

Create a tmp folder named with the next collection prefix. List
`dist/images` to find the next number. For the example below, create
c29. Create the cnum variable, it will be used in multiple commands.

~~~
# from container
printf '%s\n' dist/images/c*/ | sort -V | tail -3

dist/images/c26/
dist/images/c27/
dist/images/c28/

cnum=c29 # variable
mkdir tmp/$cnum
~~~

Put 8, 10, 12, 14, or 16 of your best photos in the folder. Export unmodified
originals from Apple Photos, or copy or export files from Adobe Bridge

__Apple Photos__

* create an album with all the photos for the topic
* mark 8, 10, 12, 14, or 16 favorites
* filter by favorites, select all
* File > Export > Export Unmodified Originals
* uncheck "Export IPTC as XMP"
* filename: Sequential, no prefix, no subfolder
* export into the empty `tmp/cN` folder
* check the files in the cN folder with the finder

Live Photos export as paired `.HEIC` and `.mov` files.

[![Tmp Folder](tmp-listing.png)](#)

__Adobe Bridge Photos__

You can create a folder of collection files from DNG files using Adobe Bridge.

* Open Adobe Bridge
* Find a folder of images you want to select from to make a collection
* Mark the images you want with stars
* Select the martini shaped icon and select the menu to show your files, e.g. "Show 3 or more stars"
* Edit the originals now if you want
* select all then export the files as jpg files to the collection folder, e.g. tmp/c28.  File > Export to > Custom export.   Choose Save to > Specific folder and browse to tmp/c28.  Extension .jpg, Image Quality 8,  Scale image > 100%, Include metadata
* Use the Finder to check at the folder of files

__Standard Rename__

Rename camera JPEGs or HEIC/mov pairs to the standard collection
names. JPEG extensions become `.jpg`. Files that already use the
standard name are left alone. New files take the next number after the
highest number in the folder. Gaps are kept.

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

__Convert HEIC and MOV__

Live videos are optional. Delete any `.mov` files you do not want to
keep. Look at them in the finder and drag the ones you don't want to
the trash.

Convert the remaining HEIC files to jpg.

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

If you only have a video, make a jpg preview by extracting a frame
with the free Frame Grabber application on the iPhone.

Convert the remaining `.mov` files to `.mp4`.  Browsers play mp4 more
reliably. The conversion keeps the Live Photo soundtrack.

~~~
scripts/convert-live-videos tmp/$cnum

convert: c29-1-v.mov -> c29-1-v.mp4
remove: c29-1-v.mov
convert: c29-10-v.mov -> c29-10-v.mp4
remove: c29-10-v.mov
...
~~~

The maker pairs each video with the preview that shares a stem:
`c24-10-v.mp4` goes with `c24-10-p.jpg`. Live Photos play on
press-and-hold. Longer clips show a play button instead of the LIVE
badge.

Optionally you can convert HEIC files to jpg in Photoshop:

* Open the HEIC files in Photoshop
* edit then flatten if necessary
* save each file as jpg (File > Save) -- uncheck "Embed Color
  Profile: Display P3"
* Jpg options: Quality 8, Baseline, no preview

| File     | Role     |
| -------- | -------- |
| -p.jpg | The still photo shown on the image page, used for dimensions in cjson, zoom/pan, and offline download |
| -v.mp4 | Optional motion clip. Live Photos play on press-and-hold. Longer videos show a play button, play to the end, then stop |
| -t.jpg | Square thumbnail for the index and thumbnail pages |

♫ Notes:

-- Some types of editing in Photoshop will create layers. You can tell
when this happens when saving by the .psd extention. In this case
flatten the image (layer > flatten image), then save.

-- If you save the jpgs with "Embed Color Profile..." checked, the
maker command will report the file as MPO format instead of JPEG. MPO
files are not supported.

__Thumbnails__

Make 480 x 480 center-crop thumbnails from the preview files. Existing
`-t.jpg` files are left alone, so you can remake a bad crop in
Photoshop and run the script again for new previews only.

~~~
# from container
scripts/make-thumbnails tmp/$cnum

make: c29-1-t.jpg
make: c29-2-t.jpg
make: c29-3-t.jpg
make: c29-4-t.jpg
...
~~~

Check the thumbnails in the finder.

If a thumbnail does not look good, crop it square 480 x 480 in
Photoshop and save over the `-t.jpg` file.

* use the crop tool
* use the Image Size dialog (option+command i)
* save
* close

The folder should contain matching `-p.jpg` and `-t.jpg` files, optional
`-v.mp4` files, and nothing extra. Previews must be at least 933
pixels on both sides.

Duplicate the tmp folder in the Finder if you want a backup.

[⬇](#Contents)

# Run Maker

Run the maker command to validate the files and write `cN.json`. It
leaves the folder in place.

~~~
# from container
scripts/maker tmp/$cnum

Wrote tmp/c24/c24.json
~~~

The json includes every photo in disk order. Titles and descriptions
are empty. Collections start with the `building` flag, so only admins
see them. `g all` builds the image and thumbnails pages right away so
you can edit in place.

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

Move the folder into dist, then build:

~~~
mv tmp/$cnum dist/images/
g all
~~~

[⬇](#Contents)

# Edit Collection

Use Chrome and the local site for editing:

~~~
http://localhost:8000/
~~~

Edit titles, posted dates, and descriptions in place while logged in
as admin. Empty fields show a placeholder so you can tap them. On
localhost the change is automatically merged into
`dist/images/cN/cN.json` when you tap away.

* index page -- edit title and posted date with date picker,
  and the short description for the newest collections.
  
* thumbnails page -- edit collection description and set the image
  order with drag and drop. Title and posted date are shown here but
  edited on the index. The page reads them from the collection json so
  they stay current without `g all`.

  To set the image order use localhost as admin, long-press a thumbnail on the thumbnails page
  then drag it to a new place. The admin API rearranges the `images` (and
  zoom points) in `cN.json`. Run `g all` so the image page matches.

* image page -- edit each photo's description

On an iPhone, tap the download icon on the image page after editing,
then air-drop the file if needed and copy to the the dist folder.

~~~
# from container
cp ~/Download/c26.json dist/images/c26/
~~~

[⬇](#Contents)

# Zoom Points

After the descriptions and order look good, set zoom points.

On localhost Chrome, open the image page as admin. Tap the four-arrow
icon in the bottom menu to show zoom and pan buttons at the upper
right of the photo.
Zoom and pan each image, then tap the download icon to write
`dist/images/cN/cN.json`. Hold a button to repeat. Arrow keys and
+/- work while the pad is open. Hold Command for one-pixel pans and
smaller zoom steps.

Use the same phone viewport you test on an iPhone, for example
iPhone 14 Pro Max at 430 x 933 and 932 x 430.

Save your zoom points with the download icon. On localhost the
download icon writes `cjson` directly. 

You can still set zoom points on an iPhone with pinch and pan, then
tap the download icon and air-drop the `cjson` to your desktop and
copy it to the dist folder.

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
publishing.

Once the collection looks good, you remove the "building" field from
the cjson, build all, then deploy again.  This publishes it to the
world.

 ~~"building": true,~~

~~~
g all
scripts/deploy -s
~~~

Test by logging out of admin and logging back in as a regular user.
On the iPhone, confirm the new collection appears in the index.

♫ Note: If you edit your photos after deploying them, the iPhone will
continue to use the photos it has cached.  To see the new ones, delete
the collection and download them again.

[⬇](#Contents)

# Notifiy

Get your cognito user id then send a notification to yourself to test.

~~~
scripts/cognito -l
scripts/notification --publish xxxx "Manzantia 2026"
~~~

Send a notification to all users.

~~~
scripts/notification --publish all "Manzantia 2026"
~~~

[⬇](#Contents)

# Remove DS Store Files

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

Delete one DS_Store file:

~~~
aws s3 rm s3://sflennikco/images/c4/.DS_Store
~~~

[⬇](#Contents)

# Replace Image

Steps to replacement an image with a new one:

* create new preview and thumbnail images
* copy the two images into the images folder replacing the originals
* test collections in Chrome on your desktop, refresh the page
* deploy the files to s3
* on the iphone delete the collection
* on the iphone download the collection

<style>body { max-width: 40em}</style>

[⬇](#Contents)

# Contents

* [Create Folder](#create-folder) -- how to collect, rename, convert, and thumbnail images.
* [Run Maker](#run-maker) -- how to write cN.json and move the folder to dist.
* [Edit Collection](#edit-collection) -- how to edit descriptions in place and set order.
* [Zoom Points](#zoom-points) -- how to set the collection zoom points.
* [Deploy](#deploy) -- how to publish the collection to the world.
* [Notify](#notify) -- how to notify users of the new collection.
* [Remove DS Store Files](#remove-ds-store-files) -- how to remove the .DS_Store files.
* [Replace Image](#replace-image) -- how to replace an image.
