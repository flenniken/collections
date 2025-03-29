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

    // Thumbnail url for the index page. The index thumbnails are
    // copied to the tin folder so the are publicly visible. While
    // developing the collection the maker page will set it empty or
    // set it to an image in the image folder.
    indexThumbnail: string;

    // The date the collection was posted on the internet.
    posted: string;

    collection: number;
    imagePageUrl: string;
    thumbnailsPageUrl: string;

    // The optional order variable is a list of image indexes, matching the size
    // of the image list, that defines the display order of the collection
    // images. If the order variable is not specified, images are shown in their
    // original order from the image list. Additionally, the order variable
    // determines which images to display -- an index of -1 indicates that the
    // image should be hidden.
    order?: number[];

    // The image array contains an element for each image in the collection.
    images: Image[];
    zoomPoints: ZoomPoints;
  }
}
