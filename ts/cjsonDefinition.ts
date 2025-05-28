namespace CJson {
  // The collection json's typescript definition (cjson).

  export interface Image {
    // todo: Replace Image url and thumbnail with iNum?
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

    // Thumbnail url for the index page. The index thumbnails are
    // copied to the tin folder so they are publicly visible. While
    // developing the collection the maker page will set it empty or
    // set it to a thumbnail in the collection.
    indexThumbnail: string;

    // The date the collection was posted on the internet.
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

    // The image array contains an element for each image in the collection.
    images: Image[];

    // A dictionary of zoom points.
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

    // The modified field tells the build process that the collection
    // has been modified or is new.  When true, the build process:
    // * copies the tin thumbnail file to the shared location
    // * removes the old tin thumbnail if it exists
    // * removes any unused collection image files
    // * removes this field when done
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
    thumbnail: string,
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

function downloadCjson(cinfo: CJson.Collection) {
  // Create and download a cjson file.

  // Convert collection info to a json string.
  const cjson = JSON.stringify(cinfo, null, 2)

  // Create a download link and click it.
  const blob = new Blob([cjson], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `c${cinfo.cNum}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
