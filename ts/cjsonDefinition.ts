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
    description: string;
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
