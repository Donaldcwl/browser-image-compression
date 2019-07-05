import { canvasToFile, drawFileInCanvas, followExifOrientation, getExifOrientation, handleMaxWidthOrHeight, getNewCanvasAndCtx } from './utils'

/**
 * Compress an image file.
 *
 * @param {File} file
 * @param {Object} options - { maxSizeMB=Number.POSITIVE_INFINITY, maxWidthOrHeight, useWebWorker=true, maxIteration = 10, exifOrientation }
 * @param {number} [options.maxSizeMB=Number.POSITIVE_INFINITY]
 * @param {number} [options.maxWidthOrHeight=undefined] * @param {number} [options.maxWidthOrHeight=undefined]
 * @param {number} [options.maxIteration=10]
 * @param {number} [options.exifOrientation=] - default to be the exif orientation from the image file
 * @returns {Promise<File | Blob>}
 */
export default async function compress (file, options) {
  let remainingTrials = options.maxIteration || 10

  const maxSizeByte = options.maxSizeMB * 1024 * 1024

  // drawFileInCanvas
  let [img, canvas] = await drawFileInCanvas(file)

  // handleMaxWidthOrHeight
  canvas = handleMaxWidthOrHeight(canvas, options)

  // exifOrientation
  options.exifOrientation = options.exifOrientation || await getExifOrientation(file)
  canvas = followExifOrientation(canvas, options.exifOrientation)

  let quality = 1

  let tempFile = await canvasToFile(canvas, file.type, file.name, file.lastModified, quality)
  // check if we need to compress or resize
  if (tempFile.size <= maxSizeByte) {
    // no need to compress
    return tempFile
  }

  let compressedFile = tempFile
  while (remainingTrials-- && compressedFile.size > maxSizeByte) {
    const newWidth = canvas.width * 0.9
    const newHeight = canvas.height * 0.9
    const [newCanvas, ctx] = getNewCanvasAndCtx(newWidth, newHeight)

    ctx.drawImage(canvas, 0, 0, newWidth, newHeight)

    if (file.type === 'image/jpeg') {
      quality *= 0.9
    }
    compressedFile = await canvasToFile(newCanvas, file.type, file.name, file.lastModified, quality)

    canvas = newCanvas
  }

  return compressedFile
}