import UPNG from './UPNG';
import CanvasToBMP from './canvastobmp';
import MAX_CANVAS_SIZE from './config/max-canvas-size';
import BROWSER_NAME from './config/browser-name';

const isBrowser = typeof window !== 'undefined'; // change browser environment to support SSR
const inWebWorker = typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope;

// add support for cordova-plugin-file
const moduleMapper = isBrowser && window.cordova && window.cordova.require && window.cordova.require('cordova/modulemapper');
export const CustomFile = (isBrowser || inWebWorker) && ((moduleMapper && moduleMapper.getOriginalSymbol(window, 'File')) || (typeof File !== 'undefined' && File));
export const CustomFileReader = (isBrowser || inWebWorker) && ((moduleMapper && moduleMapper.getOriginalSymbol(window, 'FileReader')) || (typeof FileReader !== 'undefined' && FileReader));

/**
 * getFilefromDataUrl
 *
 * @param {string} dataUrl
 * @param {string} filename
 * @param {number} [lastModified=Date.now()]
 * @returns {Promise<File | Blob>}
 */
export function getFilefromDataUrl(dataUrl, filename, lastModified = Date.now()) {
  return new Promise((resolve) => {
    const arr = dataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = globalThis.atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    const file = new Blob([u8arr], { type: mime });
    file.name = filename;
    file.lastModified = lastModified;
    resolve(file);

    // Safari has issue with File constructor not being able to POST in FormData
    // https://github.com/Donaldcwl/browser-image-compression/issues/8
    // https://bugs.webkit.org/show_bug.cgi?id=165081
    // let file
    // try {
    //   file = new File([u8arr], filename, { type: mime }) // Edge do not support File constructor
    // } catch (e) {
    //   file = new Blob([u8arr], { type: mime })
    //   file.name = filename
    //   file.lastModified = lastModified
    // }
    // resolve(file)
  });
}

/**
 * getDataUrlFromFile
 *
 * @param {File | Blob} file
 * @returns {Promise<string>}
 */
export function getDataUrlFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new CustomFileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = (e) => reject(e);
    reader.readAsDataURL(file);
  });
}

/**
 * loadImage
 *
 * @param {string} src
 * @returns {Promise<HTMLImageElement>}
 */
export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

/**
 * getBrowserName
 *
 * Extracts the browser name from the useragent.
 *
 * ref: https://stackoverflow.com/a/26358856
 *
 * @returns {string}
 */
export function getBrowserName() {
  if (getBrowserName.cachedResult !== undefined) {
    return getBrowserName.cachedResult;
  }
  let browserName = BROWSER_NAME.ETC;
  const { userAgent } = navigator;
  if (/Chrom(e|ium)/i.test(userAgent)) {
    browserName = BROWSER_NAME.CHROME;
  } else if (/iP(ad|od|hone)/i.test(userAgent) && /WebKit/i.test(userAgent)) {
    browserName = BROWSER_NAME.IOS;
  } else if (/Safari/i.test(userAgent)) {
    browserName = BROWSER_NAME.DESKTOP_SAFARI;
  } else if (/Firefox/i.test(userAgent)) {
    browserName = BROWSER_NAME.FIREFOX;
  } else if (/MSIE/i.test(userAgent) || (!!document.documentMode) === true) { // IF IE > 10
    browserName = BROWSER_NAME.IE;
  }
  getBrowserName.cachedResult = browserName;
  return getBrowserName.cachedResult;
}

/**
 * approximateBelowCanvasMaximumSizeOfBrowser
 *
 * it uses binary search to converge below the browser's maximum Canvas size.
 *
 * @param {number} initWidth
 * @param {number} initHeight
 * @returns {object}
 */
export function approximateBelowMaximumCanvasSizeOfBrowser(initWidth, initHeight) {
  const browserName = getBrowserName();
  const maximumCanvasSize = MAX_CANVAS_SIZE[browserName];

  let width = initWidth;
  let height = initHeight;
  let size = width * height;
  const ratio = width > height ? height / width : width / height;

  while (size > maximumCanvasSize * maximumCanvasSize) {
    const halfSizeWidth = (maximumCanvasSize + width) / 2;
    const halfSizeHeight = (maximumCanvasSize + height) / 2;
    if (halfSizeWidth < halfSizeHeight) {
      height = halfSizeHeight;
      width = halfSizeHeight * ratio;
    } else {
      height = halfSizeWidth * ratio;
      width = halfSizeWidth;
    }

    size = width * height;
  }

  return {
    width, height,
  };
}

/**
 * get new Canvas and it's context
 * @param width
 * @param height
 * @returns {[HTMLCanvasElement | OffscreenCanvas, CanvasRenderingContext2D]}
 */
export function getNewCanvasAndCtx(width, height) {
  let canvas;
  let ctx;
  try {
    canvas = new OffscreenCanvas(width, height);
    ctx = canvas.getContext('2d');
    if (ctx === null) {
      throw new Error('getContext of OffscreenCanvas returns null');
    }
  } catch (e) {
    canvas = document.createElement('canvas');
    ctx = canvas.getContext('2d');
  }
  canvas.width = width;
  canvas.height = height;
  // ctx.fillStyle = '#fff'
  // ctx.fillRect(0, 0, width, height)
  return [canvas, ctx];
}

/**
 * drawImageInCanvas
 *
 * @param {HTMLImageElement} img
 * @param {string} [fileType=undefined]
 * @returns {HTMLCanvasElement | OffscreenCanvas}
 */
export function drawImageInCanvas(img, fileType = undefined) {
  const { width, height } = approximateBelowMaximumCanvasSizeOfBrowser(img.width, img.height);
  const [canvas, ctx] = getNewCanvasAndCtx(width, height);
  if (fileType && /jpe?g/.test(fileType)) {
    ctx.fillStyle = 'white'; // to fill the transparent background with white color for png file in jpeg extension
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas;
}

/**
 * Detect IOS device
 * see: https://stackoverflow.com/a/9039885
 * @returns {boolean} isIOS device
 */
export function isIOS() {
  if (isIOS.cachedResult !== undefined) {
    return isIOS.cachedResult;
  }
  isIOS.cachedResult = [
    'iPad Simulator',
    'iPhone Simulator',
    'iPod Simulator',
    'iPad',
    'iPhone',
    'iPod',
  ].includes(navigator.platform)
  // iPad on iOS 13 detection
  || (navigator.userAgent.includes('Mac') && typeof document !== 'undefined' && 'ontouchend' in document);
  return isIOS.cachedResult;
}

/**
 * drawFileInCanvas
 *
 * @param {File | Blob} file
 * @returns {Promise<[ImageBitmap | HTMLImageElement, HTMLCanvasElement | OffscreenCanvas]>}
 */
export async function drawFileInCanvas(file, options = {}) {
  let img;
  try {
    if (isIOS() || [BROWSER_NAME.DESKTOP_SAFARI, BROWSER_NAME.MOBILE_SAFARI].includes(getBrowserName())) {
      throw new Error('Skip createImageBitmap on IOS and Safari'); // see https://github.com/Donaldcwl/browser-image-compression/issues/118
    }
    img = await createImageBitmap(file);
  } catch (e) {
    if (process.env.BUILD === 'development') {
      console.error(e);
    }
    try {
      const dataUrl = await getDataUrlFromFile(file);
      img = await loadImage(dataUrl);
    } catch (e2) {
      if (process.env.BUILD === 'development') {
        console.error(e2);
      }
      throw e2;
    }
  }
  const canvas = drawImageInCanvas(img, options.fileType || file.type);
  return [img, canvas];
}

/**
 * canvasToFile
 *
 * @param {HTMLCanvasElement | OffscreenCanvas} canvas
 * @param {string} fileType
 * @param {string} fileName
 * @param {number} fileLastModified
 * @param {number} [quality]
 * @returns {Promise<File | Blob>}
 */
export async function canvasToFile(canvas, fileType, fileName, fileLastModified, quality = 1) {
  let file;
  if (fileType === 'image/png') {
    const ctx = canvas.getContext('2d');
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    if (process.env.BUILD === 'development') {
      console.log('png no. of colors', 4096 * quality);
    }
    const png = UPNG.encode([data.buffer], canvas.width, canvas.height, 4096 * quality);
    file = new Blob([png], { type: fileType });
    file.name = fileName;
    file.lastModified = fileLastModified;
  } else if (fileType === 'image/bmp') {
    file = await new Promise((resolve) => CanvasToBMP.toBlob(canvas, resolve));
    file.name = fileName;
    file.lastModified = fileLastModified;
  } else if (typeof OffscreenCanvas === 'function' && canvas instanceof OffscreenCanvas) { // checked on Win Chrome 83, MacOS Chrome 83
    file = await canvas.convertToBlob({ type: fileType, quality });
    file.name = fileName;
    file.lastModified = fileLastModified;
  // some browser do not support quality parameter, see: https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toBlob
  // } else if (typeof canvas.toBlob === 'function') {
  //   file = await new Promise(resolve => canvas.toBlob(resolve, fileType, quality))
  } else { // checked on Win Edge 44, Win IE 11, Win Firefox 76, MacOS Firefox 77, MacOS Safari 13.1
    const dataUrl = canvas.toDataURL(fileType, quality);
    file = await getFilefromDataUrl(dataUrl, fileName, fileLastModified);
  }
  return file;
}

/**
 * clear Canvas memory
 * @param canvas
 * @returns null
 */
export function cleanupCanvasMemory(canvas) {
  // garbage clean canvas for safari
  // ref: https://bugs.webkit.org/show_bug.cgi?id=195325
  // eslint-disable-next-line no-param-reassign
  canvas.width = 0;
  // eslint-disable-next-line no-param-reassign
  canvas.height = 0;
}

// Check if browser supports automatic image orientation
// see https://github.com/blueimp/JavaScript-Load-Image/blob/1e4df707821a0afcc11ea0720ee403b8759f3881/js/load-image-orientation.js#L37-L53
export async function isAutoOrientationInBrowser() {
  if (isAutoOrientationInBrowser.cachedResult !== undefined) return isAutoOrientationInBrowser.cachedResult;

  // black 2x1 JPEG, with the following meta information set:
  // EXIF Orientation: 6 (Rotated 90° CCW)
  const testImageURL = 'data:image/jpeg;base64,/9j/4QAiRXhpZgAATU0AKgAAAAgAAQESAAMAAAABAAYAAAA'
    + 'AAAD/2wCEAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBA'
    + 'QEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQE'
    + 'BAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAf/AABEIAAEAAgMBEQACEQEDEQH/x'
    + 'ABKAAEAAAAAAAAAAAAAAAAAAAALEAEAAAAAAAAAAAAAAAAAAAAAAQEAAAAAAAAAAAAAAAA'
    + 'AAAAAEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8H//2Q==';
  const testImageFile = await getFilefromDataUrl(testImageURL, 'test.jpg', Date.now());

  const testImageCanvas = (await drawFileInCanvas(testImageFile))[1];
  const testImageFile2 = await canvasToFile(testImageCanvas, testImageFile.type, testImageFile.name, testImageFile.lastModified);
  cleanupCanvasMemory(testImageCanvas);
  const img = (await drawFileInCanvas(testImageFile2))[0];
  // console.log('img', img.width, img.height)

  isAutoOrientationInBrowser.cachedResult = img.width === 1 && img.height === 2;
  return isAutoOrientationInBrowser.cachedResult;
}

/**
 * getExifOrientation
 * get image exif orientation info
 * source: https://stackoverflow.com/a/32490603/10395024
 *
 * @param {File | Blob} file
 * @returns {Promise<number>} - orientation id, see https://i.stack.imgur.com/VGsAj.gif
 */
export function getExifOrientation(file) {
  return new Promise((resolve, reject) => {
    const reader = new CustomFileReader();
    reader.onload = (e) => {
      const view = new DataView(e.target.result);
      if (view.getUint16(0, false) != 0xFFD8) {
        return resolve(-2); // not jpeg
      }
      const length = view.byteLength;
      let offset = 2;
      while (offset < length) {
        if (view.getUint16(offset + 2, false) <= 8) return resolve(-1);
        const marker = view.getUint16(offset, false);
        offset += 2;
        if (marker == 0xFFE1) {
          if (view.getUint32(offset += 2, false) != 0x45786966) {
            return resolve(-1);
          }

          const little = view.getUint16(offset += 6, false) == 0x4949;
          offset += view.getUint32(offset + 4, little);
          const tags = view.getUint16(offset, little);
          offset += 2;
          for (let i = 0; i < tags; i++) {
            if (view.getUint16(offset + (i * 12), little) == 0x0112) {
              return resolve(view.getUint16(offset + (i * 12) + 8, little));
            }
          }
        } else if ((marker & 0xFF00) != 0xFF00) {
          break;
        } else {
          offset += view.getUint16(offset, false);
        }
      }
      return resolve(-1); // not defined
    };
    reader.onerror = (e) => reject(e);
    reader.readAsArrayBuffer(file);
  });
}

/**
 *
 * @param {HTMLCanvasElement | OffscreenCanvas} canvas
 * @param options
 * @returns {HTMLCanvasElement | OffscreenCanvas}
 */
export function handleMaxWidthOrHeight(canvas, options) {
  const { width } = canvas;
  const { height } = canvas;
  const { maxWidthOrHeight } = options;

  const needToHandle = isFinite(maxWidthOrHeight) && (width > maxWidthOrHeight || height > maxWidthOrHeight);

  let newCanvas = canvas;
  let ctx;

  if (needToHandle) {
    [newCanvas, ctx] = getNewCanvasAndCtx(width, height);
    if (width > height) {
      newCanvas.width = maxWidthOrHeight;
      newCanvas.height = (height / width) * maxWidthOrHeight;
    } else {
      newCanvas.width = (width / height) * maxWidthOrHeight;
      newCanvas.height = maxWidthOrHeight;
    }
    ctx.drawImage(canvas, 0, 0, newCanvas.width, newCanvas.height);

    cleanupCanvasMemory(canvas);
  }

  return newCanvas;
}

/**
 * followExifOrientation
 * source: https://stackoverflow.com/a/40867559/10395024
 *
 * @param {HTMLCanvasElement | OffscreenCanvas} canvas
 * @param {number} exifOrientation
 * @returns {HTMLCanvasElement | OffscreenCanvas} canvas
 */
export function followExifOrientation(canvas, exifOrientation) {
  const { width } = canvas;
  const { height } = canvas;

  const [newCanvas, ctx] = getNewCanvasAndCtx(width, height);

  // set proper canvas dimensions before transform & export
  if (exifOrientation > 4 && exifOrientation < 9) {
    newCanvas.width = height;
    newCanvas.height = width;
  } else {
    newCanvas.width = width;
    newCanvas.height = height;
  }

  // transform context before drawing image
  switch (exifOrientation) {
    case 2:
      ctx.transform(-1, 0, 0, 1, width, 0);
      break;
    case 3:
      ctx.transform(-1, 0, 0, -1, width, height);
      break;
    case 4:
      ctx.transform(1, 0, 0, -1, 0, height);
      break;
    case 5:
      ctx.transform(0, 1, 1, 0, 0, 0);
      break;
    case 6:
      ctx.transform(0, 1, -1, 0, height, 0);
      break;
    case 7:
      ctx.transform(0, -1, -1, 0, height, width);
      break;
    case 8:
      ctx.transform(0, -1, 1, 0, 0, width);
      break;
    default:
      break;
  }

  ctx.drawImage(canvas, 0, 0, width, height);

  cleanupCanvasMemory(canvas);

  return newCanvas;
}
