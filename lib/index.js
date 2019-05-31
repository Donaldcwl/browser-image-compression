import compress from './image-compression'
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
  CustomFile
} from './utils'
import { compressOnWebWorker } from './web-worker'

/**
 * Compress an image file.
 *
 * @param {File} file
 * @param {Object} options - { maxSizeMB=Number.POSITIVE_INFINITY, maxWidthOrHeight, useWebWorker=true, maxIteration = 10, exifOrientation }
 * @param {number} [options.maxSizeMB=Number.POSITIVE_INFINITY]
 * @param {number} [options.maxWidthOrHeight=undefined] * @param {number} [options.maxWidthOrHeight=undefined]
 * @param {boolean} [options.useWebWorker=true]
 * @param {number} [options.maxIteration=10]
 * @param {number} [options.exifOrientation=] - default to be the exif orientation from the image file
 * @returns {Promise<File | Blob>}
 */
async function imageCompression (file, options) {

  let compressedFile

  options.maxSizeMB = options.maxSizeMB || Number.POSITIVE_INFINITY
  options.useWebWorker = typeof options.useWebWorker === 'boolean' ? options.useWebWorker : true

  if (!(file instanceof Blob || file instanceof CustomFile)) {
    throw new Error('The file given is not an instance of Blob or File')
  } else if (!/^image/.test(file.type)) {
    throw new Error('The file given is not an image')
  }

  // try run in web worker, fall back to run in main thread
  const inWebWorker = typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope

  // if (inWebWorker) {
  //   console.log('run compression in web worker')
  // } else {
  //   console.log('run compression in main thread')
  // }

  if (options.useWebWorker && typeof Worker === 'function' && !inWebWorker) {
    try {
      // "compressOnWebWorker" is kind of like a recursion to call "imageCompression" again inside web worker
      compressedFile = await compressOnWebWorker(file, options)
    } catch (e) {
      console.warn('Run compression in web worker failed:', e, ', fall back to main thread')
      compressedFile = await compress(file, options)
    }
  } else {
    compressedFile = await compress(file, options)
  }

  try {
    compressedFile.name = file.name
    compressedFile.lastModified = file.lastModified
  } catch (e) {}

  return compressedFile
}

imageCompression.getDataUrlFromFile = getDataUrlFromFile
imageCompression.getFilefromDataUrl = getFilefromDataUrl
imageCompression.loadImage = loadImage
imageCompression.drawImageInCanvas = drawImageInCanvas
imageCompression.drawFileInCanvas = drawFileInCanvas
imageCompression.canvasToFile = canvasToFile
imageCompression.getExifOrientation = getExifOrientation
imageCompression.handleMaxWidthOrHeight = handleMaxWidthOrHeight
imageCompression.followExifOrientation = followExifOrientation

export default imageCompression
