/**
 * getDataUrlFromFile
 *
 * @param {File} file
 * @returns {Promise<string>}
 */
export function getDataUrlFromFile (file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
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
    let file
    try {
      file = new File([u8arr], filename, { type: mime }) // Edge do not support File constructor
    } catch (e) {
      file = new Blob([u8arr], { type: mime })
      file.name = filename
      file.lastModified = lastModified
    }
    resolve(file)
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
  let canvas
  if (typeof OffscreenCanvas === 'function') {
    canvas = new OffscreenCanvas(img.width, img.height)
  } else {
    canvas = document.createElement('canvas')
  }
  const ctx = canvas.getContext('2d')
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
  let compressedFile
  if (typeof OffscreenCanvas === 'function' && canvas instanceof OffscreenCanvas) {
    compressedFile = await canvas.convertToBlob({ type: fileType, quality })
    compressedFile.name = fileName
    compressedFile.lastModified = fileLastModified
  } else {
    const dataUrl = canvas.toDataURL(fileType, quality)
    compressedFile = await getFilefromDataUrl(dataUrl, fileName, fileLastModified)
  }
  return compressedFile
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
    const reader = new FileReader()
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
 * @param img
 * @param canvas
 * @param options
 * @returns {Promise<[HTMLCanvasElement, boolean]>}
 */
export function handleMaxWidthOrHeight (img, canvas, options) {
  const ctx = canvas.getContext('2d')

  const maxWidthOrHeight = options.maxWidthOrHeight
  const needToHandle = Number.isInteger(maxWidthOrHeight) && (img.width > maxWidthOrHeight || img.height > maxWidthOrHeight)
  if (needToHandle) {
    if (img.width > img.height) {
      canvas.width = maxWidthOrHeight
      canvas.height = (img.height / img.width) * maxWidthOrHeight
    } else {
      canvas.width = (img.width / img.height) * maxWidthOrHeight
      canvas.height = maxWidthOrHeight
    }
  } else {
    canvas.width = img.width
    canvas.height = img.height
  }

  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  return [canvas, needToHandle]
}

/**
 * followExifOrientation
 * source: https://stackoverflow.com/a/40867559/10395024
 *
 * @param {HTMLImageElement} img
 * @param {HTMLCanvasElement} canvas
 * @param {number} exifOrientation
 * @returns {HTMLCanvasElement} canvas
 */
export function followExifOrientation (img, canvas, exifOrientation) {
  const ctx = canvas.getContext('2d')

  const width = canvas.width
  const height = canvas.height

  // set proper canvas dimensions before transform & export
  if (4 < exifOrientation && exifOrientation < 9) {
    canvas.width = height
    canvas.height = width
  } else {
    canvas.width = width
    canvas.height = height
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

  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

  return canvas
}