import compress from './image-compression'
import {
  canvasToFile,
  drawFileInCanvas,
  drawImageInCanvas,
  followExifOrientation,
  getDataUrlFromFile,
  getExifOrientation,
  getFilefromDataUrl,
  getNewCanvasAndCtx,
  handleMaxWidthOrHeight,
  loadImage,
} from './utils'

let cnt = 0
let imageCompressionLibUrl

function createWorker (f) {
  return new Worker(URL.createObjectURL(new Blob([`(${f})()`])))
}

const worker = createWorker(() => {
  let scriptImported = false
  self.addEventListener('message', async (e) => {
    const { file, id, imageCompressionLibUrl, options } = e.data
    try {
      if (!scriptImported) {
        // console.log('[worker] importScripts', imageCompressionLibUrl)
        importScripts(imageCompressionLibUrl)
        scriptImported = true
      }
      // console.log('[worker] self', self)
      const compressedFile = await compress(file, options)
      self.postMessage({ file: compressedFile, id })
    } catch (e) {
      // console.error('[worker] error', e)
      self.postMessage({ error: e.message + '\n' + e.stack, id })
    }
  })
})

function createSourceObject (str) {
  return URL.createObjectURL(new Blob([str], { type: 'application/javascript' }))
}

export function compressOnWebWorker (file, options) {
  return new Promise(async (resolve, reject) => {
    if (!imageCompressionLibUrl) {
      imageCompressionLibUrl = createSourceObject(`
    canvasToFile = ${canvasToFile}
    drawFileInCanvas = ${drawFileInCanvas}
    drawImageInCanvas = ${drawImageInCanvas}
    followExifOrientation = ${followExifOrientation}
    getDataUrlFromFile = ${getDataUrlFromFile}
    getExifOrientation = ${getExifOrientation}
    getFilefromDataUrl = ${getFilefromDataUrl}
    getNewCanvasAndCtx = ${getNewCanvasAndCtx}
    handleMaxWidthOrHeight = ${handleMaxWidthOrHeight}
    loadImage = ${loadImage}

    CustomFileReader = FileReader

    CustomFile = File

    function _slicedToArray(arr, n) { return arr }

    function compress (){return (${compress}).apply(null, arguments)}
    `)
    }
    let id = cnt++

    function handler (e) {
      if (e.data.id === id) {
        worker.removeEventListener('message', handler)
        if (e.data.error) {
          reject(new Error(e.data.error))
        }
        resolve(e.data.file)
      }
    }

    worker.addEventListener('message', handler)
    worker.postMessage({ file, id, imageCompressionLibUrl, options })
  })
}
