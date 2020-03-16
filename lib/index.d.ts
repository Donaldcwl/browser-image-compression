// Type definitions for browser-image-compression
// Project: https://github.com/Donaldcwl/browser-image-compression
// Definitions by: Donald <donaldcwl@gmail.com>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped

declare module 'browser-image-compression' {
  interface Options {
    maxSizeMB?: number;
    maxWidthOrHeight?: number;
    useWebWorker?: boolean;
    maxIteration?: number,
    exifOrientation?: number,
    onProgress?: Function,
    fileType?: string
  }

  function imageCompression (image: Blob, options: Options): Blob;

  export = imageCompression;
}
