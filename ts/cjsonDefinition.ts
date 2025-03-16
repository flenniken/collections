
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
    usedImages: number[];
    // The image array contains a element for each image in the collection.
    images: Image[];
    zoomPoints: ZoomPoints;
  }
}
