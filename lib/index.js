import compress from './image-compression'
import { compressOnWebWorker } from './web-worker'
import {
  getExifOrientation,
} from './utils'

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
  options.useWebWorker = typeof options.useWebWorker === 'boolean' ? options.useWebWorker : true
  if (options.useWebWorker && typeof Worker === 'function') {
    try {
      // try run in web worker, fall back to run in main thread
      const result = await compressOnWebWorker(file, options)
      return result
    } catch (e) {
      console.warn('Run compression in web worker failed:', e, ', fall back to main thread')
      return compress(file, options)
    }
  }
  return compress(file, options)
}

imageCompression.getExifOrientation = getExifOrientation

export default imageCompression
