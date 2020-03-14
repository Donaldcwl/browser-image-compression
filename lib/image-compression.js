import { canvasToFile, drawFileInCanvas, followExifOrientation, getExifOrientation, handleMaxWidthOrHeight, getNewCanvasAndCtx, cleanupMemory } from './utils'

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
  let [img, origCanvas] = await drawFileInCanvas(file)

  // handleMaxWidthOrHeight
  let maxWidthOrHeightFixedCanvas = handleMaxWidthOrHeight(origCanvas, options)

  // exifOrientation
  options.exifOrientation = options.exifOrientation || await getExifOrientation(file)
  let orientationFixedCanvas = followExifOrientation(maxWidthOrHeightFixedCanvas, options.exifOrientation)

  let quality = 1
  
  let tempFile = await canvasToFile(orientationFixedCanvas, file.type, file.name, file.lastModified, quality)
  // check if we need to compress or resize
  if (tempFile.size <= maxSizeByte) {
    // no need to compress
    return tempFile
  }

  let compressedFile = tempFile
  let newCanvas, ctx
  let canvas = orientationFixedCanvas
  while (remainingTrials-- && compressedFile.size > maxSizeByte) {
    const newWidth = canvas.width * 0.9;
    const newHeight = canvas.height * 0.9;
    [newCanvas, ctx] = getNewCanvasAndCtx(newWidth, newHeight)

    ctx.drawImage(canvas, 0, 0, newWidth, newHeight)

    if (file.type === 'image/jpeg') {
      quality *= 0.9
    }
    compressedFile = await canvasToFile(newCanvas, file.type, file.name, file.lastModified, quality)
    cleanupMemory(canvas)
    canvas = newCanvas
  }

  // garbage clean canvas for safari
  // ref: https://bugs.webkit.org/show_bug.cgi?id=195325
  cleanupMemory(canvas)
  cleanupMemory(newCanvas)
  cleanupMemory(maxWidthOrHeightFixedCanvas)
  cleanupMemory(orientationFixedCanvas)
  cleanupMemory(origCanvas)

  return compressedFile
}