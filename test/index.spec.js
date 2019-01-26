import fs from 'fs'
import path from 'path'
import chai from 'chai'
import { expect } from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { File, FileReader } from 'file-api'
import imageCompression from '../lib'

const { drawImageInCanvas, getDataUrlFromFile, getFilefromDataUrl, loadImage } = imageCompression

const IMAGE_DIR = './example'
const JPG_NAME = '178440.jpg'
const JPG_PATH = path.join(IMAGE_DIR, JPG_NAME)
const PNG_NAME = 'sonic.png'
const PNG_PATH = path.join(IMAGE_DIR, PNG_NAME)
const base64String = 'data:image/jpeg;base64,' + Buffer.from(fs.readFileSync(JPG_PATH)).toString('base64')
// const base64String2 = 'data:image/png;base64,' + new Buffer(fs.readFileSync(PNG_PATH)).toString('base64');

chai.use(chaiAsPromised)

describe('Tests', function () {
  this.timeout(30000)

  let cleanUpJsDom

  beforeEach(() => {
    cleanUpJsDom = require('jsdom-global')(null, { resources: 'usable' })
    global.FileReader = FileReader
    global.File = File
  })

  it('get File from base64', async () => {
    const file = await getFilefromDataUrl(base64String, JPG_PATH)
    expect(file.type).to.equal('image/jpeg')
    expect(file.size).to.equal(2001612)
    expect(file).to.be.an.instanceof(Blob)
  })

  it('get base64 from file', async () => {
    const file = new File(JPG_PATH)
    const base64 = await getDataUrlFromFile(file)
    expect(base64).to.equal(base64String)
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
    expect(canvas.toDataURL).to.be.a('function')
  })

  it('compress jpg image file', async () => {
    const file = new File(JPG_PATH)

    const maxSizeMB = 1
    const maxSizeByte = maxSizeMB * 1024 * 1024

    const compressedFile = await imageCompression(file, maxSizeMB)
    expect(compressedFile.size).to.be.at.most(maxSizeByte)
  })

  it('compress png image file', async () => {
    const file = new File(PNG_PATH)

    const maxSizeMB = 1
    const maxSizeByte = maxSizeMB * 1024 * 1024

    const compressedFile = await imageCompression(file, maxSizeMB)
    expect(compressedFile.size).to.be.at.most(maxSizeByte)
  })

  it('fails if wrong file provided', async () => {
    const file = undefined

    const maxSizeMB = 1
    return expect(imageCompression(file, maxSizeMB)).to.eventually.rejectedWith(/not an instance of/)
  })

  it('fails if wrong file provided 2', async () => {
    const file = { type: '' }

    const maxSizeMB = 1
    return expect(imageCompression(file, maxSizeMB)).to.eventually.rejectedWith(/not an instance of/)
  })

  it('fails if wrong file type provided', async () => {
    const file = new File(__filename)

    const maxSizeMB = 1
    return expect(imageCompression(file, maxSizeMB)).to.eventually.rejectedWith(/not an image/)
  })

  afterEach(() => {
    cleanUpJsDom()
  })

})