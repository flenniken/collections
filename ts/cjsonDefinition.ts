namespace CJson {
  // The collection json's typescript definition.

  export interface Image {
    url: string;
    thumbnail: string;
    title: string;
    description: string;
    width: number;
    height: number;
    size: number;
    sizet: number;
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
    // length and order as the image array.
    [wxh: string]: ZoomPoint[];
  }

  export interface Collection {
    title: string;

    // Short description of the collection for the index page.
    indexDescription: string;

    // Full desciption of the collection for the thumbnails page.
    description: string;

    // Collecton states:
    // * build -- the collection has not met all the requirements.
    // * ready -- the collection has met all the requirements. The
    //            ready collections appear in the index.
    cState: string;

    // Thumbnail url for the index page. The index thumbnails are
    // copied to the tin folder so they are publicly visible. While
    // developing the collection the maker page will set it empty or
    // set it to a thumbnail in the collection.
    indexThumbnail: string;

    // The date the collection was posted on the internet.
    posted: string;

    // The collection number. Collections are in sequential order.
    collection: number;

    // The optional order variable is a list of 16 image indexes.  It
    // defines which images are in the collection and their order. An
    // index of -1 indicates the collection box is empty. It’s used
    // while building the collection. Once built, the image list is
    // rewritten to match the order list and the order list is
    // removed.
    order?: number[];

    // The image array contains an element for each image in the collection.
    images: Image[];

    // A dictionary of zoom points.
    zoomPoints: ZoomPoints;

    // An optional boolean that tells the build process that the
    // collection has been modified or is new.  When true, the build
    // process:
    // * copies the tin thumbnail file to the shared location
    // * removes the old tin thumbnail if it exists
    // * removes any unused collection image files
    // * removes this field when done
    modified?: boolean;
  }
}
