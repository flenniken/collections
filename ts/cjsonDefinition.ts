namespace CJson {
  // The collection json's typescript definition (cjson).

  export interface Image {
    // iPreview is the basename of the preview image in the collection
    // folder. The name starts with a "c" then the collection number,
    // then the image number ending with "-p.jpg", e.g. c2-1-p.jpg.
    iPreview: string;

    // iThumbnail is the basename of the thumbnail image in the
    // collection folder. The name starts with a "c" then the
    // collection number, then the image number ending with "-t.jpg",
    // e.g. c2-1-t.jpg. Thumbnails are 480 x 480 pixels.
    iThumbnail: string;

    // The required image description. Empty is allowed while the
    // collection is building. Required when published.
    description: string;

    // Width and height of the preview image in pixels. A preview's
    // minimum dimension is at least 933 pixels.
    width: number;
    height: number;

    // Size of the preview file in bytes.
    size: number;

    // Size of the thumbnail file in bytes.
    sizet: number;

    // Google Maps decimal-degree coordinates from the preview GPS,
    // e.g. "20.7473920,-156.4571441". Empty string means the preview
    // has no GPS. Added by scripts/add-locations.
    location?: string;

    // When the preview was taken, from EXIF DateTimeOriginal,
    // e.g. "2023-06-04T19:04:44". Empty string means none.
    // Added by scripts/add-locations.
    taken?: string;

    // Optional Live Photo or clip video basename, e.g. c2-1-v.mp4.
    iLiveVideo?: string;

    // Size of the live video file in bytes.
    liveSize?: number;

    // Duration of the live video in seconds. Clips longer than a Live
    // Photo play from a play button instead of press-and-hold.
    liveDuration?: number;
  }

  export interface ZoomPoint {
    scale: number;
    tx: number;
    ty: number;
  }

  export interface ZoomPoints {
    // A ZoomPoints object contains elements for different width and
    // height combinations. The key is a string of the form
    // "widthxheight" where width and height are the image dimensions
    // in pixels. The value is an array of ZoomPoint objects the same
    // length and order as the image array. For example:
    // "zoomPoints": {
    //   "430x933": [ZoomPoint, ZoomPoint, ZoomPoint...],
    //   "932x430": [ZoomPoint, ZoomPoint, ZoomPoint...],
    //   ...
    // }
    [wxh: string]: ZoomPoint[];
  }

  export interface Collection {
    // The collection title. Empty is allowed while building.
    title: string;

    // Short description of the collection for the index page.
    // Empty is allowed while building.
    indexDescription: string;

    // Full desciption of the collection for the thumbnails page.
    // Empty is allowed while building.
    description: string;

    // Optional Google Maps decimal-degree coordinates for the
    // thumbnails page, e.g. "45.6868445,-121.3035183". Empty or
    // omitted means no collection map.
    location?: string;

    // The date the collection was posted on the internet.
    // Empty is allowed while building.
    posted: string;

    // The collection number. Collections are in sequential order.
    cNum: number;

    // Leftover field, stripped on read. The images array is the
    // collection order.
    order?: number[];

    // The image array contains an element for each image in the
    // collection.
    images: Image[];

    // A dictionary of zoom points. Required when the collection is
    // not building.
    zoomPoints: ZoomPoints;

    // The building field determines who can see the collection. When
    // it exists, the collection is only visible by an admin. When the
    // collection has been tested, the field is manually removed
    // opening the collection for everyone to see. The maker command
    // creates the flag when the collection is created.
    building?: boolean;

    // The modified field tells the build process that the collection
    // has been modified or is new.  When
    // true, the build process (the gulp modified task):
    // * copies the tin thumbnail file to the shared location
    // * removes the old tin thumbnail if it exists
    // * removes any unused collection image files
    // * removes the modified field when done
    modified?: boolean;
  }

  // The csjson.json file's (csjson) definition.

  export interface IndexCollection {
    // These fields come from the cjson file directly or are
    // derived from it.
    cNum: number,
    building: boolean;
    modified: boolean,
    title: string,
    indexDescription: string,
    // The collection's thumbnail used in the index. Copied from the
    // first collection photo.
    iThumbnail: string,
    posted: string,
    // The number of previews in the collection.
    iCount: number,
    // The total byte size of all the images.
    totalSize: number,
    // The iNums of the images in the collection.
    iNumList: number[],
    // iNums of images that have a Live Photo video (-v.mp4).
    liveINums?: number[],
  };

  export interface Csjson {
    indexCollections: IndexCollection[];
  }
}
