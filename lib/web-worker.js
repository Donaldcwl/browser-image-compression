import lib from './index'
import compress from './image-compression'
import { getNewCanvasAndCtx } from './utils'

let cnt = 0
let imageCompressionLibUrl
let worker

function createWorker (script) {
  if (typeof script === 'function') {
    script = `(${f})()`
  }
  return new Worker(URL.createObjectURL(new Blob([script])))
}

function createSourceObject (str) {
  return URL.createObjectURL(new Blob([str], { type: 'application/javascript' }))
}

function generateLib () {
  // prepare the lib to be used inside WebWorker
  return createSourceObject(`
    function imageCompression (){return (${lib}).apply(null, arguments)}

    imageCompression.getDataUrlFromFile = ${lib.getDataUrlFromFile}
    imageCompression.getFilefromDataUrl = ${lib.getFilefromDataUrl}
    imageCompression.loadImage = ${lib.loadImage}
    imageCompression.drawImageInCanvas = ${lib.drawImageInCanvas}
    imageCompression.drawFileInCanvas = ${lib.drawFileInCanvas}
    imageCompression.canvasToFile = ${lib.canvasToFile}
    imageCompression.getExifOrientation = ${lib.getExifOrientation}
    imageCompression.handleMaxWidthOrHeight = ${lib.handleMaxWidthOrHeight}
    imageCompression.followExifOrientation = ${lib.followExifOrientation}
    imageCompression.cleanupMemory = ${lib.cleanupMemory}

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

function generateWorkerScript () {
  // code to be run in the WebWorker
  return createWorker(`
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
        self.postMessage({ error: e.message + '\\n' + e.stack, id })
      }
    })
  `)
}

export function compressOnWebWorker (file, options) {
  return new Promise(async (resolve, reject) => {
    let id = cnt++

    if (!imageCompressionLibUrl) {
      imageCompressionLibUrl = generateLib()
    }

    if (!worker) {
      worker = generateWorkerScript()
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
