import imageCompression from './index'
import compress from './image-compression'

let cnt = 0
let imageCompressionLibUrl

function createWorker (f) {
  return new Worker(URL.createObjectURL(new Blob([`(${f})()`])))
}

const worker = createWorker(() => {
  self.addEventListener('message', async (e) => {
    const { file, id, imageCompressionLibUrl, options } = e.data
    try {
      // console.log('[worker] importScripts', imageCompressionLibUrl)
      importScripts(imageCompressionLibUrl)
      // console.log('[worker] self', self)
      const compressedFile = await imageCompression(file, options)
      self.postMessage({ file: compressedFile, id })
    } catch (e) {
      // console.error('[worker] error', e)
      self.postMessage({ error: e.message, id })
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
    
    getDataUrlFromFile = imageCompression.getDataUrlFromFile
    getFilefromDataUrl = imageCompression.getFilefromDataUrl
    loadImage = imageCompression.loadImage
    drawImageInCanvas = imageCompression.drawImageInCanvas
    drawFileInCanvas = imageCompression.drawFileInCanvas
    canvasToFile = imageCompression.canvasToFile
    getExifOrientation = imageCompression.getExifOrientation
    handleMaxWidthOrHeight = imageCompression.handleMaxWidthOrHeight
    followExifOrientation = imageCompression.followExifOrientation

    function compress (){return (${compress}).apply(null, arguments)}
    `)
      // imageCompressionLibUrl = new URL('../dist/browser-image-compression.js', window.location.href).href
    }
    let id = cnt++

    function handler (e) {
      if (e.data.id === id) {
        worker.removeEventListener('message', handler)
        if (e.data.error) {
          reject(e.data.error)
        }
        resolve(e.data.file)
      }
    }

    worker.addEventListener('message', handler)
    worker.postMessage({ file, id, imageCompressionLibUrl, options })
  })
}