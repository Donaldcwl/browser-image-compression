import { canvasToFile, drawFileInCanvas, followExifOrientation, getExifOrientation, handleMaxWidthOrHeight } from './utils'

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

  // no need to compress or resize
  if (file.size <= maxSizeByte && typeof options.maxWidthOrHeight === 'undefined') {
    return file
  }

  let img, canvas, isResized

  // drawFileInCanvas
  let temp = await drawFileInCanvas(file)
  img = temp[0]
  canvas = temp[1]

  // handleMaxWidthOrHeight
  let temp2 = handleMaxWidthOrHeight(img, canvas, options)
  canvas = temp2[0]
  isResized = temp2[1]
  // no need to compress or resize
  if (file.size <= maxSizeByte && !isResized) {
    return file
  }

  // exifOrientation
  options.exifOrientation = options.exifOrientation || await getExifOrientation(file)
  canvas = followExifOrientation(img, canvas, options.exifOrientation)

  let quality = 1
  let compressedFile = await canvasToFile(canvas, file.type, file.name, file.lastModified, quality)
  if (file.type === 'image/png') {
    while (remainingTrials-- && compressedFile.size > maxSizeByte) {
      canvas.width *= 0.9
      canvas.height *= 0.9

      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

      compressedFile = await canvasToFile(canvas, file.type, file.name, file.lastModified, quality)
    }
  } else { // if (file.type === 'image/jpeg') {
    while (remainingTrials-- && compressedFile.size > maxSizeByte) {
      canvas.width *= 0.9
      canvas.height *= 0.9

      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

      quality *= 0.9
      compressedFile = await canvasToFile(canvas, file.type, file.name, file.lastModified, quality)
    }
  }

  return compressedFile
}