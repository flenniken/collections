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
    // The wxh array contains a element for each image in the collection.
    [wxh: string]: ZoomPoint[];
  }

  export interface Collection {
    title: string;

    // Index description is a short summary of the description for the
    // index page.
    indexDescription: string;

    // Full desciption of the collection for the thumbnails page.
    description: string;

    // Collecton states:
    // * build -- the collection has not met all the requirements
    // * ready -- the collection has met all the requirements. The
    //            ready collections appear in the index.
    cState: string;

    // Thumbnail url for the index page. The index thumbnails are
    // copied to the tin folder so the are publicly visible. While
    // developing the collection the maker page will set it empty or
    // set it to an image in the image folder.
    indexThumbnail: string;

    // The date the collection was posted on the internet.
    posted: string;

    collection: number;

    // The optional order variable is a list of 16 image indexes.  It
    // defines which images are in the collection and their order. An
    // index of -1 indicates the collection box is empty. It’s used
    // while building the collection. Once built, the image list is
    // rewritten to match the order list and the order list is
    // deleted.
    order?: number[];

    // The image array contains an element for each image in the collection.
    images: Image[];
    zoomPoints: ZoomPoints;
  }
}
