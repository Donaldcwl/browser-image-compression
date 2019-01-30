import compress from './image-compression'
import {
  canvasToFile,
  drawFileInCanvas,
  drawImageInCanvas,
  getDataUrlFromFile,
  getFilefromDataUrl,
  loadImage
} from './utils.js'
import { compressOnWebWorker } from './web-worker'

/**
 * Compress an image file.
 *
 * @param {File} file
 * @param options - { maxSizeMB=Number.POSITIVE_INFINITY, maxWidthOrHeight, useWebWorker=true }
 * @returns {Promise<File>}
 */
async function imageCompression (file, options) {

  options.maxSizeMB = options.maxSizeMB || Number.POSITIVE_INFINITY
  options.useWebWorker = typeof options.useWebWorker === 'boolean' ? options.useWebWorker : true

  if (!(file instanceof Blob || file instanceof File)) {
    throw new Error('The file given is not an instance of Blob or File')
  } else if (!/^image/.test(file.type)) {
    throw new Error('The file given is not an image')
  }

  // try run in web worker, fall back to run in main thread
  const inWebWorker = typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope
  if (options.useWebWorker && typeof Worker === 'function' && !inWebWorker) {
    try {
      const compressedFile = await compressOnWebWorker(file, options)
      compressedFile.name = file.name
      compressedFile.lastModified = file.lastModified
      return compressedFile
    } catch (e) {
      console.error('run compression in web worker failed', e)
    }
  }
  if (inWebWorker) {
    console.log('run compression in web worker')
  } else {
    console.log('run compression in main thread')
  }

  const compressedFile = await compress(file, options)
  compressedFile.name = file.name
  compressedFile.lastModified = file.lastModified
  return compressedFile
}

imageCompression.drawImageInCanvas = drawImageInCanvas
imageCompression.getDataUrlFromFile = getDataUrlFromFile
imageCompression.getFilefromDataUrl = getFilefromDataUrl
imageCompression.loadImage = loadImage
imageCompression.canvasToFile = canvasToFile
imageCompression.drawFileInCanvas = drawFileInCanvas

export default imageCompression
