import imageCompression from './index'
import compress from './image-compression'
import { getNewCanvasAndCtx } from './utils'

let cnt = 0
let imageCompressionLibUrl
let worker

function createWorker (f) {
  return new Worker(URL.createObjectURL(new Blob([`(${f})()`])))
}

function createSourceObject (str) {
  return URL.createObjectURL(new Blob([str], { type: 'application/javascript' }))
}

export function compressOnWebWorker (file, options) {
  return new Promise(async (resolve, reject) => {
    if (!imageCompressionLibUrl) {
      imageCompressionLibUrl = createSourceObject(`
    function imageCompression (){return (${imageCompression}).apply(null, arguments)}

    imageCompression.getDataUrlFromFile = ${imageCompression.getDataUrlFromFile}
    imageCompression.getFilefromDataUrl = ${imageCompression.getFilefromDataUrl}
    imageCompression.loadImage = ${imageCompression.loadImage}
    imageCompression.drawImageInCanvas = ${imageCompression.drawImageInCanvas}
    imageCompression.drawFileInCanvas = ${imageCompression.drawFileInCanvas}
    imageCompression.canvasToFile = ${imageCompression.canvasToFile}
    imageCompression.getExifOrientation = ${imageCompression.getExifOrientation}
    imageCompression.handleMaxWidthOrHeight = ${imageCompression.handleMaxWidthOrHeight}
    imageCompression.followExifOrientation = ${imageCompression.followExifOrientation}
    imageCompression.cleanupMemory = ${imageCompression.cleanupMemory}

    getDataUrlFromFile = imageCompression.getDataUrlFromFile
    getFilefromDataUrl = imageCompression.getFilefromDataUrl
    loadImage = imageCompression.loadImage
    drawImageInCanvas = imageCompression.drawImageInCanvas
    drawFileInCanvas = imageCompression.drawFileInCanvas
    canvasToFile = imageCompression.canvasToFile
    getExifOrientation = imageCompression.getExifOrientation
    handleMaxWidthOrHeight = imageCompression.handleMaxWidthOrHeight
    followExifOrientation = imageCompression.followExifOrientation
    cleanupMemory = imageCompression.cleanupMemory

    getNewCanvasAndCtx = ${getNewCanvasAndCtx}
    
    CustomFileReader = FileReader
    
    CustomFile = File
    
    function _slicedToArray(arr, n) { return arr }
    
    function _typeof(a) { return typeof a }

    function compress (){return (${compress}).apply(null, arguments)}
    `)
    }
    let id = cnt++

    if (!worker) {
      worker = createWorker(() => {
        // START code to be run in the web worker
        let scriptImported = false
        self.addEventListener('message', async (e) => {
          const { file, id, imageCompressionLibUrl, options } = e.data
          options.onProgress = (progress) => self.postMessage({ progress, id })
          try {
            if (!scriptImported) {
              // console.log('[worker] importScripts', imageCompressionLibUrl)
              self.importScripts(imageCompressionLibUrl)
              scriptImported = true
            }
            // console.log('[worker] self', self)
            const compressedFile = await imageCompression(file, options)
            self.postMessage({ file: compressedFile, id })
          } catch (e) {
            // console.error('[worker] error', e)
            self.postMessage({ error: e.message + '\n' + e.stack, id })
          }
        })
        // END code to be run in the web worker
      })
    }

    function handler (e) {
      if (e.data.id === id) {
        if (e.data.progress !== undefined && e.data.progress < 100) {
          options.onProgress(e.data.progress)
          return
        }
        worker.removeEventListener('message', handler)
        if (e.data.error) {
          reject(new Error(e.data.error))
        }
        resolve(e.data.file)
      }
    }

    worker.addEventListener('message', handler)
    worker.postMessage({
      file,
      id,
      imageCompressionLibUrl,
      options: { ...options, onProgress: undefined }
    })
  })
}
