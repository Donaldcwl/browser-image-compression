import fs from 'fs'
import path from 'path'
import chai, { expect } from 'chai'
import chaiAsPromised from 'chai-as-promised'
import imageCompression from '../lib'

const { drawImageInCanvas, getDataUrlFromFile, getFilefromDataUrl, loadImage, getExifOrientation, drawFileInCanvas } = imageCompression

const IMAGE_DIR = './example'
const JPG_NAME = '178440.jpg'
const JPG_PATH = path.join(IMAGE_DIR, JPG_NAME)
const JPG_FILE = fs.readFileSync(JPG_PATH)
const PNG_NAME = 'sonic.png'
const PNG_PATH = path.join(IMAGE_DIR, PNG_NAME)
const PNG_FILE = fs.readFileSync(PNG_PATH)
const base64String = 'data:image/jpeg;base64,' + Buffer.from(JPG_FILE).toString('base64')
// const base64String2 = 'data:image/png;base64,' + new Buffer(fs.readFileSync(PNG_PATH)).toString('base64');

chai.use(chaiAsPromised)

function setupCustomFileAPI () {
  const fileAPI = require('file-api')
  const tmp = { FileReader: global.FileReader, File: global.File }
  global.FileReader = fileAPI.FileReader
  global.File = fileAPI.File
  return () => {
    global.FileReader = tmp.FileReader
    global.File = tmp.File
  }
}

describe('Tests', function () {
  this.timeout(30000)

  beforeEach(() => {
  })

  it('get File from base64', async () => {
    const file = await getFilefromDataUrl(base64String, JPG_PATH)
    expect(file.type).to.equal('image/jpeg')
    expect(file.size).to.equal(2001612)
    expect(file).to.be.an.instanceof(Blob)
  })

  it('get base64 from file', async () => {
    const restore = setupCustomFileAPI()

    const file = new File(JPG_PATH)
    const base64 = await getDataUrlFromFile(file)
    expect(base64).to.equal(base64String)

    restore()
  })

  it('load image', async () => {
    const img = await loadImage(base64String)
    expect(img).to.be.an.instanceof(Image)
    expect(img.src).to.equal(base64String)
  })

  it('draw image in canvas', async () => {
    const img = await loadImage(base64String)
    const canvas = await drawImageInCanvas(img)
    expect(canvas).to.be.an.instanceof(HTMLCanvasElement)
    expect(canvas.width).to.be.a('number')
    expect(canvas.height).to.be.a('number')
    expect(canvas.getContext).to.be.a('function')
  })

  it('draw file in canvas', async () => {
    const restore = setupCustomFileAPI()

    const file = new File(JPG_PATH)

    const [img, canvas] = await drawFileInCanvas(file)
    // expect(img).to.satisfy((c) => c instanceof HTMLImageElement || c instanceof ImageBitmap)
    expect(img).to.be.an.instanceof(HTMLImageElement)
    expect(canvas).to.be.an.instanceof(HTMLCanvasElement)
    expect(canvas.width).to.be.a('number')
    expect(canvas.height).to.be.a('number')
    expect(canvas.getContext).to.be.a('function')

    restore()
  })

  it('compress jpg image file', async () => {
    const restore = setupCustomFileAPI()

    const file = new File(JPG_PATH)
    // const file = new File(JPG_FILE, JPG_NAME)
    // Object.defineProperty(file, 'type', { value: 'image/jpeg' })

    const maxSizeMB = 1
    const maxSizeByte = maxSizeMB * 1024 * 1024

    const compressedFile = await imageCompression(file, { maxSizeMB, useWebWorker: false, exifOrientation: -2 })
    expect(compressedFile.size).to.be.at.most(maxSizeByte)

    restore()
  })

  it('resize jpg image file', async () => {
    const restore = setupCustomFileAPI()

    const file = new File(JPG_PATH)
    // const file = new File(JPG_FILE, JPG_NAME)
    // Object.defineProperty(file, 'type', { value: 'image/jpeg' })

    const maxWidthOrHeight = 720

    const compressedFile = await imageCompression(file, { maxWidthOrHeight, useWebWorker: false, exifOrientation: -2 })

    restore()

    const temp = await drawFileInCanvas(compressedFile)
    const img = temp[0]
    expect(img.width).to.be.at.most(maxWidthOrHeight)
    expect(img.height).to.be.at.most(maxWidthOrHeight)

  })

  it('compress and resize jpg image file', async () => {
    const restore = setupCustomFileAPI()

    const file = new File(JPG_PATH)
    // const file = new File(JPG_FILE, JPG_NAME)
    // Object.defineProperty(file, 'type', { value: 'image/jpeg' })

    const maxSizeMB = 1
    const maxSizeByte = maxSizeMB * 1024 * 1024
    const maxWidthOrHeight = 720

    const compressedFile = await imageCompression(file, { maxSizeMB, maxWidthOrHeight, useWebWorker: false, exifOrientation: -2 })
    restore()

    expect(compressedFile.size).to.be.at.most(maxSizeByte)

    const temp = await drawFileInCanvas(compressedFile)
    const img = temp[0]
    expect(img.width).to.be.at.most(maxWidthOrHeight)
    expect(img.height).to.be.at.most(maxWidthOrHeight)

  })

  it('compress png image file', async () => {
    const restore = setupCustomFileAPI()

    const file = new File(PNG_PATH)

    const maxSizeMB = 1
    const maxSizeByte = maxSizeMB * 1024 * 1024

    const compressedFile = await imageCompression(file, { maxSizeMB, useWebWorker: false, exifOrientation: -2 })
    expect(compressedFile.size).to.be.at.most(maxSizeByte)

    restore()
  })

  it('resize png image file', async () => {
    const restore = setupCustomFileAPI()

    const file = new File(PNG_PATH)

    const maxWidthOrHeight = 720

    const compressedFile = await imageCompression(file, { maxWidthOrHeight, useWebWorker: false, exifOrientation: -2 })
    restore()

    const temp = await drawFileInCanvas(compressedFile)

    const img = temp[0]
    expect(img.width).to.be.at.most(maxWidthOrHeight)
    expect(img.height).to.be.at.most(maxWidthOrHeight)

  })

  it('compress and resize png image file', async () => {
    const restore = setupCustomFileAPI()

    const file = new File(PNG_PATH)

    const maxSizeMB = 1
    const maxSizeByte = maxSizeMB * 1024 * 1024
    const maxWidthOrHeight = 720

    const compressedFile = await imageCompression(file, { maxSizeMB, maxWidthOrHeight, useWebWorker: false, exifOrientation: -2 })
    restore()

    expect(compressedFile.size).to.be.at.most(maxSizeByte)

    const temp = await drawFileInCanvas(compressedFile)

    const img = temp[0]
    expect(img.width).to.be.at.most(maxWidthOrHeight)
    expect(img.height).to.be.at.most(maxWidthOrHeight)

  })

  it('fails if wrong file provided', async () => {
    const file = undefined

    const maxSizeMB = 1
    return expect(imageCompression(file, {
      maxSizeMB,
      useWebWorker: false
    })).to.eventually.rejectedWith(/not an instance of/)
  })

  it('fails if wrong file provided 2', async () => {
    const file = { type: '' }

    const maxSizeMB = 1
    return expect(imageCompression(file, {
      maxSizeMB,
      useWebWorker: false
    })).to.eventually.rejectedWith(/not an instance of/)
  })

  it('fails if wrong file type provided', async () => {
    const restore = setupCustomFileAPI()

    const file = new File(__filename)

    const maxSizeMB = 1
    await expect(imageCompression(file, { maxSizeMB, useWebWorker: false })).to.eventually.rejectedWith(/not an image/)

    restore()
  })

  it('get the get image orientation from Exif', async () => {
    const file = new File(JPG_FILE, JPG_NAME)
    const orientation = await getExifOrientation(file)
    expect(orientation).to.equal(-2)
  })

  afterEach(() => {
  })

})