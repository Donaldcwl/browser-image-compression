import fs from 'fs';
import path from 'path';
import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import imageCompression from '../lib';
import BROWSER_NAME from '../lib/config/browser-name';
import MAX_CANVAS_SIZE from '../lib/config/max-canvas-size';

const {
  drawImageInCanvas, getDataUrlFromFile, getFilefromDataUrl, loadImage, getExifOrientation, drawFileInCanvas,
} = imageCompression;

const IMAGE_DIR = './example';
const JPG_NAME = '178440.jpg';
const JPG_PATH = path.join(IMAGE_DIR, JPG_NAME);
const JPG_FILE = fs.readFileSync(JPG_PATH);
const JPG_NAME2 = 'flower.jpg';
const JPG_PATH2 = path.join(IMAGE_DIR, JPG_NAME2);
const JPG_FILE2 = fs.readFileSync(JPG_PATH2);
const PNG_NAME = 'sonic.png';
const PNG_PATH = path.join(IMAGE_DIR, PNG_NAME);
const PNG_FILE = fs.readFileSync(PNG_PATH);
const EXIF_FILES = [
  ...Array(9).fill('Landscape_#.jpg'),
  ...Array(9).fill('Portrait_#.jpg'),
]
  .map((fileName, i) => fileName.replace('#', i % 9))
  .map((fileName) => path.join(IMAGE_DIR, 'Exif orientation examples', fileName))
  .map((filePath) => fs.readFileSync(filePath));
const BMP_NAME = 'sample_1280×853.bmp';
const BMP_PATH = path.join(IMAGE_DIR, BMP_NAME);
const BMP_FILE = fs.readFileSync(BMP_PATH);
const base64String = `data:image/jpeg;base64,${Buffer.from(JPG_FILE).toString('base64')}`;
const base64String2 = `data:image/png;base64,${Buffer.from(PNG_FILE).toString('base64')}`;
const base64String3 = `data:image/bmp;base64,${Buffer.from(BMP_FILE).toString('base64')}`;

chai.use(chaiAsPromised);

describe('Tests', function () {
  this.timeout(30000);

  const { navigator } = global;

  beforeEach(() => {
    global.navigator = navigator;
    imageCompression.getBrowserName.cachedResult = undefined;
  });

  it('get File from jpg base64', async () => {
    const file = await getFilefromDataUrl(base64String, JPG_PATH);
    expect(file.type).to.equal('image/jpeg');
    expect(file.size).to.equal(2001612);
    expect(file).to.be.an.instanceof(Blob);
  });

  it('get base64 from jpg file', async () => {
    const file = new File([JPG_FILE], JPG_NAME, { type: 'image/jpeg' });
    const base64 = await getDataUrlFromFile(file);
    expect(base64).to.equal(base64String);
  });

  it('get File from png base64', async () => {
    const file = await getFilefromDataUrl(base64String2, PNG_PATH);
    expect(file.type).to.equal('image/png');
    expect(file.size).to.equal(2304210);
    expect(file).to.be.an.instanceof(Blob);
  });

  it('get base64 from png file', async () => {
    const file = new File([PNG_FILE], PNG_NAME, { type: 'image/png' });
    const base64 = await getDataUrlFromFile(file);
    expect(base64).to.equal(base64String2);
  });

  it('get File from bmp base64', async () => {
    const file = await getFilefromDataUrl(base64String3, BMP_PATH);
    expect(file.type).to.equal('image/bmp');
    expect(file.size).to.equal(3275658);
    expect(file).to.be.an.instanceof(Blob);
  });

  it('get base64 from bmp file', async () => {
    const file = new File([BMP_FILE], BMP_NAME, { type: 'image/bmp' });
    const base64 = await getDataUrlFromFile(file);
    expect(base64).to.equal(base64String3);
  });

  it('load image', async () => {
    const img = await loadImage(base64String);
    expect(img).to.be.an.instanceof(Image);
    expect(img.src).to.equal(base64String);
  });

  it('draw image in canvas', async () => {
    const img = await loadImage(base64String);
    const canvas = await drawImageInCanvas(img);
    expect(canvas).to.be.an.instanceof(HTMLCanvasElement);
    expect(canvas.width).to.be.a('number');
    expect(canvas.height).to.be.a('number');
    expect(canvas.getContext).to.be.a('function');
  });

  it('draw file in canvas', async () => {
    const file = new File([JPG_FILE], JPG_NAME, { type: 'image/jpeg' });

    const [img, canvas] = await drawFileInCanvas(file);
    // expect(img).to.satisfy((c) => c instanceof HTMLImageElement || c instanceof ImageBitmap)
    expect(img).to.be.an.instanceof(HTMLImageElement);
    expect(canvas).to.be.an.instanceof(HTMLCanvasElement);
    expect(canvas.width).to.be.a('number');
    expect(canvas.height).to.be.a('number');
    expect(canvas.getContext).to.be.a('function');
  });

  it('compress jpg image file', async () => {
    const file = new File([JPG_FILE], JPG_NAME, { type: 'image/jpeg' });

    const maxSizeMB = 1;
    const maxSizeByte = maxSizeMB * 1024 * 1024;

    const compressedFile = await imageCompression(file, { maxSizeMB, useWebWorker: false, exifOrientation: -2 });
    expect(compressedFile.size).to.be.at.most(maxSizeByte);
  });

  it('resize jpg image file', async () => {
    const file = new File([JPG_FILE], JPG_NAME, { type: 'image/jpeg' });

    const maxWidthOrHeight = 720;

    const compressedFile = await imageCompression(file, { maxWidthOrHeight, useWebWorker: false, exifOrientation: -2 });

    const temp = await drawFileInCanvas(compressedFile);
    const img = temp[0];
    expect(img.width).to.be.at.most(maxWidthOrHeight);
    expect(img.height).to.be.at.most(maxWidthOrHeight);
  });

  it('compress and resize jpg image file', async () => {
    const file = new File([JPG_FILE], JPG_NAME, { type: 'image/jpeg' });

    const maxSizeMB = 1;
    const maxSizeByte = maxSizeMB * 1024 * 1024;
    const maxWidthOrHeight = 720;

    const compressedFile = await imageCompression(file, {
      maxSizeMB,
      maxWidthOrHeight,
      useWebWorker: false,
      exifOrientation: -2,
    });

    expect(compressedFile.size).to.be.at.most(maxSizeByte);

    const temp = await drawFileInCanvas(compressedFile);
    const img = temp[0];
    expect(img.width).to.be.at.most(maxWidthOrHeight);
    expect(img.height).to.be.at.most(maxWidthOrHeight);
  });

  it('compress png image file', async () => {
    const file = new File([PNG_FILE], PNG_NAME, { type: 'image/png' });

    const maxSizeMB = 1;
    const maxSizeByte = maxSizeMB * 1024 * 1024;

    const compressedFile = await imageCompression(file, { maxSizeMB, useWebWorker: false, exifOrientation: -2 });
    expect(compressedFile.size).to.be.at.most(maxSizeByte);
  });

  it('resize png image file', async () => {
    const file = new File([PNG_FILE], PNG_NAME, { type: 'image/png' });

    const maxWidthOrHeight = 720;

    const compressedFile = await imageCompression(file, { maxWidthOrHeight, useWebWorker: false, exifOrientation: -2 });

    const temp = await drawFileInCanvas(compressedFile);

    const img = temp[0];
    expect(img.width).to.be.at.most(maxWidthOrHeight);
    expect(img.height).to.be.at.most(maxWidthOrHeight);
  });

  it('compress and resize png image file', async () => {
    const file = new File([PNG_FILE], PNG_NAME, { type: 'image/png' });

    const maxSizeMB = 1;
    const maxSizeByte = maxSizeMB * 1024 * 1024;
    const maxWidthOrHeight = 720;

    const compressedFile = await imageCompression(file, {
      maxSizeMB,
      maxWidthOrHeight,
      useWebWorker: false,
      exifOrientation: -2,
    });

    expect(compressedFile.size).to.be.at.most(maxSizeByte);

    const temp = await drawFileInCanvas(compressedFile);

    const img = temp[0];
    expect(img.width).to.be.at.most(maxWidthOrHeight);
    expect(img.height).to.be.at.most(maxWidthOrHeight);
  });

  it('compress bmp image file', async () => {
    const file = new File([BMP_FILE], BMP_NAME, { type: 'image/bmp' });

    const maxSizeMB = 1;
    const maxSizeByte = maxSizeMB * 1024 * 1024;

    const compressedFile = await imageCompression(file, { maxSizeMB, useWebWorker: false, exifOrientation: -2, maxIteration: 15 });
    expect(compressedFile.size).to.be.at.most(maxSizeByte);
  });

  it('resize bmp image file', async () => {
    const file = new File([BMP_FILE], BMP_NAME, { type: 'image/bmp' });

    const maxWidthOrHeight = 720;

    const compressedFile = await imageCompression(file, { maxWidthOrHeight, useWebWorker: false, exifOrientation: -2 });

    const temp = await drawFileInCanvas(compressedFile);
    const img = temp[0];
    expect(img.width).to.be.at.most(maxWidthOrHeight);
    expect(img.height).to.be.at.most(maxWidthOrHeight);
  });

  it('compress and resize bmp image file', async () => {
    const file = new File([BMP_FILE], BMP_NAME, { type: 'image/bmp' });

    const maxSizeMB = 1;
    const maxSizeByte = maxSizeMB * 1024 * 1024;
    const maxWidthOrHeight = 720;

    const compressedFile = await imageCompression(file, {
      maxSizeMB,
      maxWidthOrHeight,
      useWebWorker: false,
    });

    expect(compressedFile.size).to.be.at.most(maxSizeByte);

    const temp = await drawFileInCanvas(compressedFile);
    const img = temp[0];
    expect(img.width).to.be.at.most(maxWidthOrHeight);
    expect(img.height).to.be.at.most(maxWidthOrHeight);
  });

  it('fails if wrong file provided', async () => {
    const file = undefined;

    const maxSizeMB = 1;
    return expect(imageCompression(file, {
      maxSizeMB,
      useWebWorker: false,
    })).to.eventually.rejectedWith(/not an instance of/);
  });

  it('fails if wrong file provided 2', async () => {
    const file = { type: '' };

    const maxSizeMB = 1;
    return expect(imageCompression(file, {
      maxSizeMB,
      useWebWorker: false,
    })).to.eventually.rejectedWith(/not an instance of/);
  });

  it('fails if wrong file type provided', async () => {
    const file = new File(['What is the meaning of life the universe and everything?'], 'text.txt', { type: 'text/plain' });

    const maxSizeMB = 1;
    await expect(imageCompression(file, { maxSizeMB, useWebWorker: false })).to.eventually.rejectedWith(/not an image/);
  });

  it('get the image orientation from Exif #-2 - orientation: -2', async () => {
    const file = new File([PNG_FILE], PNG_NAME, { type: 'image/png' });
    const orientation = await getExifOrientation(file);
    expect(orientation).to.equal(-2);
  });

  it('get the image orientation from Exif #-1 - orientation: -1', async () => {
    const file = new File([JPG_FILE], JPG_NAME, { type: 'image/jpeg' });
    const orientation = await getExifOrientation(file);
    expect(orientation).to.equal(-1);
  });

  EXIF_FILES.forEach((blob, i) => {
    const targetExifOrientation = i % 9;
    it(`get the image orientation from Exif #${i} - orientation: ${targetExifOrientation}`, async () => {
      const file = new File([blob], `${i}.jpg`);
      const orientation = await getExifOrientation(file);
      expect(orientation).to.equal(targetExifOrientation);
    });
  });

  it('alwaysKeepResolution', async () => {
    const file = new File([JPG_FILE], JPG_NAME, { type: 'image/jpeg' });

    const maxSizeMB = 1;

    const compressedFile = await imageCompression(file, {
      maxSizeMB,
      useWebWorker: false,
      exifOrientation: -2,
      alwaysKeepResolution: true,
    });

    const temp1 = await drawFileInCanvas(file);
    const img1 = temp1[0];
    const temp2 = await drawFileInCanvas(compressedFile);
    const img2 = temp2[0];
    expect(img2.width).to.equal(img1.width);
    expect(img2.height).to.equal(img1.height);
  });

  it('abort compression', async () => {
    const file = new File([JPG_FILE], JPG_NAME, { type: 'image/jpeg' });

    const maxSizeMB = 1;

    const controller = new AbortController();

    setTimeout(() => {
      controller.abort(new Error('I just want to stop'));
    }, 0);

    expect(imageCompression(file, {
      maxSizeMB,
      useWebWorker: false,
      exifOrientation: -2,
      signal: controller.signal,
    })).to.eventually.rejectedWith(/I just want to stop/);
  });

  it('getBrowserName Chrome', async () => {
    global.navigator = { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36' };
    const browserName = imageCompression.getBrowserName();
    expect(browserName).to.equal(BROWSER_NAME.CHROME);
  });

  it('getBrowserName iPhone', async () => {
    global.navigator = { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.3 Mobile/15E148 Safari/604.1' };
    const browserName = imageCompression.getBrowserName();
    expect(browserName).to.equal(BROWSER_NAME.IOS);
  });

  it('getBrowserName Safari', async () => {
    global.navigator = { userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_2) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.3 Safari/605.1.15' };
    const browserName = imageCompression.getBrowserName();
    expect(browserName).to.equal(BROWSER_NAME.DESKTOP_SAFARI);
  });

  it('getBrowserName Firefox', async () => {
    global.navigator = { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/109.0' };
    const browserName = imageCompression.getBrowserName();
    expect(browserName).to.equal(BROWSER_NAME.FIREFOX);
  });

  it('getBrowserName MSIE', async () => {
    global.navigator = { userAgent: 'Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.2; Trident/6.0)' };
    const browserName = imageCompression.getBrowserName();
    expect(browserName).to.equal(BROWSER_NAME.IE);
  });

  it('getBrowserName Other', async () => {
    global.navigator = { userAgent: 'Other' };
    const browserName = imageCompression.getBrowserName();
    expect(browserName).to.equal(BROWSER_NAME.ETC);
  });

  it('approximateBelowMaximumCanvasSizeOfBrowser', async () => {
    global.navigator = { userAgent: 'Chrome' };
    const browserName = imageCompression.getBrowserName();
    const maximumCanvasSize = MAX_CANVAS_SIZE[browserName];
    const { width, height } = imageCompression.approximateBelowMaximumCanvasSizeOfBrowser(maximumCanvasSize * 1.2, maximumCanvasSize * 1.3);
    expect(width * height).to.be.lessThanOrEqual(maximumCanvasSize * maximumCanvasSize);
  });

  it('approximateBelowMaximumCanvasSizeOfBrowser 2', async () => {
    global.navigator = { userAgent: 'Chrome' };
    const browserName = imageCompression.getBrowserName();
    const maximumCanvasSize = MAX_CANVAS_SIZE[browserName];
    const { width, height } = imageCompression.approximateBelowMaximumCanvasSizeOfBrowser(maximumCanvasSize * 1.3, maximumCanvasSize * 1.2);
    expect(width * height).to.be.lessThanOrEqual(maximumCanvasSize * maximumCanvasSize);
  });

  it('copyExifWithoutOrientation image with exif', async () => {
    const file = new File([JPG_FILE2], JPG_NAME2, { type: 'image/jpeg' });

    const [compressedFileWithExif, compressedFileWithoutExif] = await Promise.all([
      await imageCompression(file, {
        maxSizeMB: 1,
        useWebWorker: false,
        preserveExif: true,
      }),
      await imageCompression(file, {
        maxSizeMB: 1,
        useWebWorker: false,
        preserveExif: false,
      }),
    ]);
    expect(compressedFileWithExif.size).to.be.greaterThan(compressedFileWithoutExif.size);
  });

  it('copyExifWithoutOrientation image without exif', async () => {
    const file = new File([JPG_FILE], JPG_NAME, { type: 'image/jpeg' });

    const [compressedFileWithExif, compressedFileWithoutExif] = await Promise.all([
      await imageCompression(file, {
        maxSizeMB: 1,
        useWebWorker: false,
        preserveExif: true,
      }),
      await imageCompression(file, {
        maxSizeMB: 1,
        useWebWorker: false,
        preserveExif: false,
      }),
    ]);
    expect(compressedFileWithExif.size).to.be.equal(compressedFileWithoutExif.size);
  });

  afterEach(() => {
  });
});
