import copyExifWithoutOrientation from './copyExifWithoutOrientation';
import compress from './image-compression';
import {
  canvasToFile,
  drawFileInCanvas,
  drawImageInCanvas,
  getDataUrlFromFile,
  getFilefromDataUrl,
  loadImage,
  getExifOrientation,
  handleMaxWidthOrHeight,
  followExifOrientation,
  CustomFile,
  cleanupCanvasMemory,
  isAutoOrientationInBrowser,
  approximateBelowMaximumCanvasSizeOfBrowser,
  getBrowserName,
} from './utils';
import compressOnWebWorker from './web-worker';

/**
 * Compress an image file.
 *
 * @param {File} file
 * @param {Object} options
 * @param {number} [options.maxSizeMB=Number.POSITIVE_INFINITY]
 * @param {number} [options.maxWidthOrHeight=undefined]
 * @param {boolean} [options.useWebWorker=true]
 * @param {number} [options.maxIteration=10]
 * @param {number} [options.exifOrientation] - default to be the exif orientation from the image file
 * @param {Function} [options.onProgress] - a function takes one progress argument (progress from 0 to 100)
 * @param {string} [options.fileType] - default to be the original mime type from the image file
 * @param {number} [options.initialQuality=1.0]
 * @param {boolean} [options.alwaysKeepResolution=false]
 * @param {AbortSignal} [options.signal]
 * @param {boolean} [options.preserveExif] - preserve Exif metadata
 * @param {string} [options.libURL] - URL to this library
 * @returns {Promise<File | Blob>}
 */
async function imageCompression(file, options) {
  const opts = { ...options };

  let compressedFile;
  let progress = 0;
  const { onProgress } = opts;

  opts.maxSizeMB = opts.maxSizeMB || Number.POSITIVE_INFINITY;
  const useWebWorker = typeof opts.useWebWorker === 'boolean' ? opts.useWebWorker : true;
  delete opts.useWebWorker;
  opts.onProgress = (aProgress) => {
    progress = aProgress;
    if (typeof onProgress === 'function') {
      onProgress(progress);
    }
  };

  if (!(file instanceof Blob || file instanceof CustomFile)) {
    throw new Error('The file given is not an instance of Blob or File');
  } else if (!/^image/.test(file.type)) {
    throw new Error('The file given is not an image');
  }

  // try run in web worker, fall back to run in main thread
  // eslint-disable-next-line no-undef, no-restricted-globals
  const inWebWorker = typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope;

  if (process.env.BUILD === 'development') {
    if ((useWebWorker && typeof Worker === 'function') || inWebWorker) {
      console.log('run compression in web worker');
    } else {
      console.log('run compression in main thread');
    }
  }

  if (useWebWorker && typeof Worker === 'function' && !inWebWorker) {
    try {
      // "compressOnWebWorker" is kind of like a recursion to call "imageCompression" again inside web worker
      opts.libURL = opts.libURL || `https://cdn.jsdelivr.net/npm/browser-image-compression@${__buildVersion__}/dist/browser-image-compression.js`;
      compressedFile = await compressOnWebWorker(file, opts);
    } catch (e) {
      if (process.env.BUILD === 'development') {
        console.warn('Run compression in web worker failed:', e, ', fall back to main thread');
      }
      compressedFile = await compress(file, opts);
    }
  } else {
    compressedFile = await compress(file, opts);
  }

  try {
    compressedFile.name = file.name;
    compressedFile.lastModified = file.lastModified;
  } catch (e) {
    if (process.env.BUILD === 'development') {
      console.error(e);
    }
  }

  try {
    if (opts.preserveExif && file.type === 'image/jpeg' && (!opts.fileType || (opts.fileType && opts.fileType === file.type))) {
      if (process.env.BUILD === 'development') {
        console.log('copyExifWithoutOrientation');
      }
      compressedFile = copyExifWithoutOrientation(file, compressedFile);
    }
  } catch (e) {
    if (process.env.BUILD === 'development') {
      console.error(e);
    }
  }

  return compressedFile;
}

imageCompression.getDataUrlFromFile = getDataUrlFromFile;
imageCompression.getFilefromDataUrl = getFilefromDataUrl;
imageCompression.loadImage = loadImage;
imageCompression.drawImageInCanvas = drawImageInCanvas;
imageCompression.drawFileInCanvas = drawFileInCanvas;
imageCompression.canvasToFile = canvasToFile;
imageCompression.getExifOrientation = getExifOrientation;

imageCompression.handleMaxWidthOrHeight = handleMaxWidthOrHeight;
imageCompression.followExifOrientation = followExifOrientation;
imageCompression.cleanupCanvasMemory = cleanupCanvasMemory;
imageCompression.isAutoOrientationInBrowser = isAutoOrientationInBrowser;
imageCompression.approximateBelowMaximumCanvasSizeOfBrowser = approximateBelowMaximumCanvasSizeOfBrowser;
imageCompression.copyExifWithoutOrientation = copyExifWithoutOrientation;
imageCompression.getBrowserName = getBrowserName;
imageCompression.version = __buildVersion__;

export default imageCompression;
