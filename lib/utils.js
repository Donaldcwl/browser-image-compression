// add support for cordova-plugin-file
const moduleMapper = typeof window !== 'undefined' && window.cordova && window.cordova.require('cordova/modulemapper');
export const CustomFile = (moduleMapper && moduleMapper.getOriginalSymbol(window, 'File')) || File;
export const CustomFileReader = (moduleMapper && moduleMapper.getOriginalSymbol(window, 'FileReader')) || FileReader;
/**
 * getDataUrlFromFile
 *
 * @param {File} file
 * @returns {Promise<string>}
 */
export function getDataUrlFromFile (file) {
  return new Promise((resolve, reject) => {
    const reader = new CustomFileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = (e) => reject(e)
    reader.readAsDataURL(file)
  })
}

/**
 * getFilefromDataUrl
 *
 * @param {string} dataurl
 * @param {string} filename
 * @param {number} [lastModified=Date.now()]
 * @returns {Promise<File|Blob>}
 */
export function getFilefromDataUrl (dataurl, filename, lastModified = Date.now()) {
  return new Promise((resolve) => {
    const arr = dataurl.split(',')
    const mime = arr[0].match(/:(.*?);/)[1]
    const bstr = atob(arr[1])
    let n = bstr.length
    const u8arr = new Uint8Array(n)
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n)
    }
    const file = new Blob([u8arr], { type: mime })
    file.name = filename
    file.lastModified = lastModified
    resolve(file)

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
  })
}

/**
 * loadImage
 *
 * @param {string} src
 * @returns {Promise<HTMLImageElement>}
 */
export function loadImage (src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = (e) => reject(e)
    img.src = src
  })
}

/**
 * drawImageInCanvas
 *
 * @param {HTMLImageElement} img
 * @returns {HTMLCanvasElement}
 */
export function drawImageInCanvas (img) {
  const [canvas, ctx] = getNewCanvasAndCtx(img.width, img.height)
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  return canvas
}

/**
 * drawFileInCanvas
 *
 * @param {File} file
 * @returns {Promise<[ImageBitmap | HTMLImageElement, HTMLCanvasElement]>}
 */
export async function drawFileInCanvas (file) {
  let img
  try {
    img = await createImageBitmap(file)
  } catch (e) {
    const dataUrl = await getDataUrlFromFile(file)
    img = await loadImage(dataUrl)
  }
  const canvas = drawImageInCanvas(img)
  return [img, canvas]
}

/**
 * canvasToFile
 *
 * @param canvas
 * @param {string} fileType
 * @param {string} fileName
 * @param {number} fileLastModified
 * @param {number} [quality]
 * @returns {Promise<File|Blob>}
 */
export async function canvasToFile (canvas, fileType, fileName, fileLastModified, quality = 1) {
  let file
  if (typeof OffscreenCanvas === 'function' && canvas instanceof OffscreenCanvas) {
    file = await canvas.convertToBlob({ type: fileType, quality })
    file.name = fileName
    file.lastModified = fileLastModified
  } else {
    const dataUrl = canvas.toDataURL(fileType, quality)
    file = await getFilefromDataUrl(dataUrl, fileName, fileLastModified)
  }
  return file
}

/**
 * getExifOrientation
 * get image exif orientation info
 * source: https://stackoverflow.com/a/32490603/10395024
 *
 * @param {File} file
 * @returns {Promise<number>} - orientation id, see https://i.stack.imgur.com/VGsAj.gif
 */
export function getExifOrientation (file) {
  return new Promise((resolve, reject) => {
    const reader = new CustomFileReader()
    reader.onload = (e) => {
      const view = new DataView(e.target.result)
      if (view.getUint16(0, false) != 0xFFD8) {
        return resolve(-2)
      }
      const length = view.byteLength
      let offset = 2
      while (offset < length) {
        if (view.getUint16(offset + 2, false) <= 8) return resolve(-1)
        const marker = view.getUint16(offset, false)
        offset += 2
        if (marker == 0xFFE1) {
          if (view.getUint32(offset += 2, false) != 0x45786966) {
            return resolve(-1)
          }

          var little = view.getUint16(offset += 6, false) == 0x4949
          offset += view.getUint32(offset + 4, little)
          var tags = view.getUint16(offset, little)
          offset += 2
          for (var i = 0; i < tags; i++) {
            if (view.getUint16(offset + (i * 12), little) == 0x0112) {
              return resolve(view.getUint16(offset + (i * 12) + 8, little))
            }
          }
        } else if ((marker & 0xFF00) != 0xFF00) {
          break
        } else {
          offset += view.getUint16(offset, false)
        }
      }
      return resolve(-1)
    }
    reader.onerror = (e) => reject(e)
    reader.readAsArrayBuffer(file)
  })
}

/**
 *
 * @param {HTMLCanvasElement} canvas
 * @param options
 * @returns {HTMLCanvasElement>}
 */
export function handleMaxWidthOrHeight (canvas, options) {
  const width = canvas.width
  const height = canvas.height
  const maxWidthOrHeight = options.maxWidthOrHeight

  const needToHandle = Number.isInteger(maxWidthOrHeight) && (width > maxWidthOrHeight || height > maxWidthOrHeight)

  let newCanvas = canvas
  let ctx

  if (needToHandle) {
    [newCanvas, ctx] = getNewCanvasAndCtx(width, height)
    if (width > height) {
      newCanvas.width = maxWidthOrHeight
      newCanvas.height = (height / width) * maxWidthOrHeight
    } else {
      newCanvas.width = (width / height) * maxWidthOrHeight
      newCanvas.height = maxWidthOrHeight
    }
    ctx.drawImage(canvas, 0, 0, newCanvas.width, newCanvas.height)
  }

  return newCanvas
}

/**
 * followExifOrientation
 * source: https://stackoverflow.com/a/40867559/10395024
 *
 * @param {HTMLCanvasElement} canvas
 * @param {number} exifOrientation
 * @returns {HTMLCanvasElement} canvas
 */
export function followExifOrientation (canvas, exifOrientation) {
  const width = canvas.width
  const height = canvas.height

  const [newCanvas, ctx] = getNewCanvasAndCtx(width, height)

  // set proper canvas dimensions before transform & export
  if (4 < exifOrientation && exifOrientation < 9) {
    newCanvas.width = height
    newCanvas.height = width
  } else {
    newCanvas.width = width
    newCanvas.height = height
  }

  // transform context before drawing image
  switch (exifOrientation) {
    case 2: ctx.transform(-1, 0, 0, 1, width, 0); break;
    case 3: ctx.transform(-1, 0, 0, -1, width, height); break;
    case 4: ctx.transform(1, 0, 0, -1, 0, height); break;
    case 5: ctx.transform(0, 1, 1, 0, 0, 0); break;
    case 6: ctx.transform(0, 1, -1, 0, height, 0); break;
    case 7: ctx.transform(0, -1, -1, 0, height, width); break;
    case 8: ctx.transform(0, -1, 1, 0, 0, width); break;
    default: break;
  }

  ctx.drawImage(canvas, 0, 0, width, height)

  return newCanvas
}

/**
 * get new Canvas and it's context
 * @param width
 * @param height
 * @returns {[HTMLCanvasElement, CanvasRenderingContext2D]}
 */
export function getNewCanvasAndCtx (width, height) {
  let canvas
  let ctx
  try {
    canvas = new OffscreenCanvas(width, height)
    ctx = canvas.getContext('2d')
  } catch (e) {
    canvas = document.createElement('canvas')
    ctx = canvas.getContext('2d')
  }
  canvas.width = width
  canvas.height = height
  return [canvas, ctx]
}