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

    // The image title which can be and empty string.
    title: string;

    // The required image description. Once the collection is ready,
    // the description cannot be blank.
    description: string;

    // Width and height of the preview image in pixels. A preview's
    // minimum dimension is at least 933 pixels.
    width: number;
    height: number;

    // Size of the preview file in bytes.
    size: number;

    // Size of the thumbnail file in bytes.
    sizet: number;

    // Unused. todo: remove this until it is used.
    uniqueId: string;
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
    // The collection title. Required for ready collections.
    title: string;

    // Short description of the collection for the index page.
    // Required for ready collections.
    indexDescription: string;

    // Full desciption of the collection for the thumbnails page.
    // Required for ready collections.
    description: string;

    // The base name of the collection's thumbnail image for the index
    // page e.g. c4-12-t.jpg. The tin folder images are publicly
    // visible, unlike the other image files.
    // Required for ready collections.
    indexThumbnail: string;

    // The date the collection was posted on the internet.
    // Required for ready collections.
    posted: string;

    // The collection number. Collections are in sequential order.
    cNum: number;

    // The optional order variable is a list of 16 image indexes.  It
    // defines which images are in the collection and their order. An
    // index of -1 indicates the collection box is empty. It’s used
    // while building the collection. Once built, the image list is
    // rewritten to match the order list and the order list is
    // removed.
    order?: number[];

    // The image array contains an element for each image in the
    // collection. Required for ready collections.
    images: Image[];

    // A dictionary of zoom points. Required for ready and
    // not building collections.
    zoomPoints: ZoomPoints;

    // The building field determines who can see the collection. When
    // it exists, the collection is only visible by an admin. When the
    // collection has been tested, the field is manually removed
    // opening the collection for everyone to see. The maker command
    // creates the flag when the collection is created.
    building?: boolean;

    // The ready field when true means the collection has met all the
    // maker page requirements. The build process builds the ready
    // collections and adds them to the index. Whether they are
    // visible by everyone or just by admins is dependent on the
    // building flag.  The ready flag is set by the maker page.
    ready: boolean;

    // The modified field is set by the maker page. It tells the build
    // process that the collection has been modified or is new.  When
    // true, the build modified task:
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
    ready: boolean,
    modified: boolean,
    title: string,
    indexDescription: string,
    // The collection's thumbnail used in the index.
    iThumbnail: string,
    posted: string,
    // The number of previews in the collection.
    iCount: number,
    // The total byte size of all the images.
    totalSize: number,
    // The iNums of the images in the collection.
    iNumList: number[],
  };

  export interface Csjson {
    indexCollections: IndexCollection[];
  }
}
