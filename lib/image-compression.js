import {
  canvasToFile,
  cleanupCanvasMemory,
  drawFileInCanvas,
  followExifOrientation,
  getExifOrientation,
  getNewCanvasAndCtx,
  handleMaxWidthOrHeight,
  isAutoOrientationInBrowser
} from './utils'

/**
 * Compress an image file.
 *
 * @param {File} file
 * @param {Object} options - { maxSizeMB=Number.POSITIVE_INFINITY, maxWidthOrHeight, useWebWorker=false, maxIteration = 10, exifOrientation, fileType }
 * @param {number} [options.maxSizeMB=Number.POSITIVE_INFINITY]
 * @param {number} [options.maxWidthOrHeight=undefined]
 * @param {number} [options.maxIteration=10]
 * @param {number} [options.exifOrientation] - default to be the exif orientation from the image file
 * @param {Function} [options.onProgress] - a function takes one progress argument (progress from 0 to 100)
 * @param {string} [options.fileType] - default to be the original mime type from the image file
 * @returns {Promise<File | Blob>}
 */
export default async function compress (file, options) {
  let progress = 0

  function incProgress (inc = 5) {
    progress += inc
    options.onProgress(Math.min(progress, 100))
  }

  function setProgress (p) {
    progress = Math.min(Math.max(p, progress), 100)
    options.onProgress(progress)
  }

  let remainingTrials = options.maxIteration || 10

  const maxSizeByte = options.maxSizeMB * 1024 * 1024

  incProgress()

  // drawFileInCanvas
  let [img, origCanvas] = await drawFileInCanvas(file)

  incProgress()

  // handleMaxWidthOrHeight
  const maxWidthOrHeightFixedCanvas = handleMaxWidthOrHeight(origCanvas, options)

  incProgress()

  // exifOrientation
  options.exifOrientation = options.exifOrientation || await getExifOrientation(file)
  incProgress()
  const orientationFixedCanvas = (await isAutoOrientationInBrowser) ? maxWidthOrHeightFixedCanvas : followExifOrientation(maxWidthOrHeightFixedCanvas, options.exifOrientation)
  incProgress()

  let quality = 1

  let tempFile = await canvasToFile(orientationFixedCanvas, options.fileType || file.type, file.name, file.lastModified, quality)
  incProgress()

  const origExceedMaxSize = tempFile.size > maxSizeByte
  const sizeBecomeLarger = tempFile.size > file.size

  // check if we need to compress or resize
  if (!origExceedMaxSize && !sizeBecomeLarger) {
    // no need to compress
    setProgress(100)
    return tempFile
  }

  const sourceSize = file.size
  const renderedSize = tempFile.size
  let currentSize = renderedSize
  let compressedFile
  let newCanvas, ctx
  let canvas = orientationFixedCanvas
  while (remainingTrials-- && (currentSize > maxSizeByte || currentSize > sourceSize)) {
    const newWidth = origExceedMaxSize ? canvas.width * 0.95 : canvas.width
    const newHeight = origExceedMaxSize ? canvas.height * 0.95 : canvas.height;
    [newCanvas, ctx] = getNewCanvasAndCtx(newWidth, newHeight)

    ctx.drawImage(canvas, 0, 0, newWidth, newHeight)

    if (file.type === 'image/jpeg') {
      quality *= 0.95
    }
    compressedFile = await canvasToFile(newCanvas, options.fileType || file.type, file.name, file.lastModified, quality)

    cleanupCanvasMemory(canvas)

    canvas = newCanvas

    currentSize = compressedFile.size
    setProgress(Math.min(99, Math.floor((renderedSize - currentSize) / (renderedSize - maxSizeByte) * 100)))
  }

  // garbage clean canvas for safari
  // ref: https://bugs.webkit.org/show_bug.cgi?id=195325
  cleanupCanvasMemory(canvas)
  cleanupCanvasMemory(newCanvas)
  cleanupCanvasMemory(maxWidthOrHeightFixedCanvas)
  cleanupCanvasMemory(orientationFixedCanvas)
  cleanupCanvasMemory(origCanvas)

  setProgress(100)
  return compressedFile
}
