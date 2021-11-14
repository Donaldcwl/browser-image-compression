# Browser Image Compression #
[![npm](https://img.shields.io/npm/v/browser-image-compression.svg)](https://www.npmjs.com/package/browser-image-compression)
[![npm](./coverage/badge.svg)](https://github.com/Donaldcwl/browser-image-compression)
[![npm](https://img.shields.io/npm/l/browser-image-compression.svg)](https://github.com/Donaldcwl/browser-image-compression)

Javascript module to be run in the web browser for image compression.

## Features ##
- You can use this module to compress jpeg and png image by reducing **resolution** or **storage size** before uploading to application server to save bandwidth.
- **Multi-thread** (web worker) non-blocking compression are supported through options.

## Install ##
You can download imageCompression from the [dist folder][dist]. Alternatively, you can install it via yarn or npm
```
npm install browser-image-compression --save
or
yarn add browser-image-compression
```
or use a CDN like [delivrjs]:
```
https://cdn.jsdelivr.net/npm/browser-image-compression@1.0.17/dist/browser-image-compression.js
or
https://cdn.jsdelivr.net/npm/browser-image-compression@latest/dist/browser-image-compression.js
```

## Support
If this project help you reduce time to develop, you can buy me a cup of coffee :)

<a href="https://www.buymeacoffee.com/donaldcwl" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-red.png" alt="Buy Me A Coffee" height=60 width=217 ></a>

## How to use this module in your project? ##
#### Use as ES module ####

(can be used in framework like React, Angular, Vue etc)

(work with bundler like webpack and rollup)
```javascript
import imageCompression from 'browser-image-compression';
```

or

#### In html file ####
```html
<script type="text/javascript" src="https://cdn.jsdelivr.net/npm/browser-image-compression@1.0.17/dist/browser-image-compression.js"></script>
```

## API ##
### Main function ###
```javascript
// you should provide one of maxSizeMB, maxWidthOrHeight in the options
const options: Options = { 
  maxSizeMB: number,          // (default: Number.POSITIVE_INFINITY)
  maxWidthOrHeight: number,   // compressedFile will scale down by ratio to a point that width or height is smaller than maxWidthOrHeight (default: undefined)
                              // but, automatically reduce the size to smaller than the maximum Canvas size supported by each browser.
                              // Please check the Caveat part for details.
  onProgress: Function,       // optional, a function takes one progress argument (percentage from 0 to 100) 
  useWebWorker: boolean,      // optional, use multi-thread web worker, fallback to run in main-thread (default: true)

  // following options are for advanced users
  maxIteration: number,       // optional, max number of iteration to compress the image (default: 10)
  exifOrientation: number,    // optional, see https://stackoverflow.com/a/32490603/10395024
  fileType: string,           // optional, fileType override
  initialQuality: number      // optional, initial quality value between 0 and 1 (default: 1)
}

imageCompression(file: File, options: Options): Promise<File>
```

#### Caveat ####
Each browser limits [the maximum size](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/canvas#maximum_canvas_size) of a Canvas object. <br/>
So, we resize the image to less than the maximum size that each browser restricts. <br/>
(However, the `proportion/ratio` of the image remains.)

### Helper function ###
- for advanced users only, most users won't need to use the helper functions
```javascript
imageCompression.getDataUrlFromFile(file: File): Promise<base64 encoded string>
imageCompression.getFilefromDataUrl(dataUrl: string, filename: string, lastModified?: number): Promise<File>
imageCompression.loadImage(url: string): Promise<HTMLImageElement>
imageCompression.drawImageInCanvas(img: HTMLImageElement, fileType?: string): HTMLCanvasElement | OffscreenCanvas
imageCompression.drawFileInCanvas(file: File, options?: Options): Promise<[ImageBitmap | HTMLImageElement, HTMLCanvasElement | OffscreenCanvas]>
imageCompression.canvasToFile(canvas: HTMLCanvasElement | OffscreenCanvas, fileType: string, fileName: string, fileLastModified: number, quality?: number): Promise<File>
imageCompression.getExifOrientation(file: File): Promise<number> // based on https://stackoverflow.com/a/32490603/10395024
```

## Usage ##
```html
<input type="file" accept="image/*" onchange="handleImageUpload(event);">
```
async await syntax:
```javascript
async function handleImageUpload(event) {

  const imageFile = event.target.files[0];
  console.log('originalFile instanceof Blob', imageFile instanceof Blob); // true
  console.log(`originalFile size ${imageFile.size / 1024 / 1024} MB`);

  const options = {
    maxSizeMB: 1,
    maxWidthOrHeight: 1920,
    useWebWorker: true
  }
  try {
    const compressedFile = await imageCompression(imageFile, options);
    console.log('compressedFile instanceof Blob', compressedFile instanceof Blob); // true
    console.log(`compressedFile size ${compressedFile.size / 1024 / 1024} MB`); // smaller than maxSizeMB

    await uploadToServer(compressedFile); // write your own logic
  } catch (error) {
    console.log(error);
  }

}
```
Promise.then().catch() syntax:
```javascript
function handleImageUpload(event) {

  var imageFile = event.target.files[0];
  console.log('originalFile instanceof Blob', imageFile instanceof Blob); // true
  console.log(`originalFile size ${imageFile.size / 1024 / 1024} MB`);

  var options = {
    maxSizeMB: 1,
    maxWidthOrHeight: 1920,
    useWebWorker: true
  }
  imageCompression(imageFile, options)
    .then(function (compressedFile) {
      console.log('compressedFile instanceof Blob', compressedFile instanceof Blob); // true
      console.log(`compressedFile size ${compressedFile.size / 1024 / 1024} MB`); // smaller than maxSizeMB

      return uploadToServer(compressedFile); // write your own logic
    })
    .catch(function (error) {
      console.log(error.message);
    });
}
```

## Demo / Example ##
open https://donaldcwl.github.io/browser-image-compression/example/basic.html

or check the "[example]" folder in this repo

## Browsers support

| [<img src="https://raw.githubusercontent.com/alrra/browser-logos/master/src/edge/edge_48x48.png" alt="IE / Edge" width="24px" height="24px" />](http://godban.github.io/browsers-support-badges/)<br/>IE / Edge | [<img src="https://raw.githubusercontent.com/alrra/browser-logos/master/src/firefox/firefox_48x48.png" alt="Firefox" width="24px" height="24px" />](http://godban.github.io/browsers-support-badges/)<br/>Firefox | [<img src="https://raw.githubusercontent.com/alrra/browser-logos/master/src/chrome/chrome_48x48.png" alt="Chrome" width="24px" height="24px" />](http://godban.github.io/browsers-support-badges/)<br/>Chrome | [<img src="https://raw.githubusercontent.com/alrra/browser-logos/master/src/safari/safari_48x48.png" alt="Safari" width="24px" height="24px" />](http://godban.github.io/browsers-support-badges/)<br/>Safari | [<img src="https://raw.githubusercontent.com/alrra/browser-logos/master/src/safari-ios/safari-ios_48x48.png" alt="iOS Safari" width="24px" height="24px" />](http://godban.github.io/browsers-support-badges/)<br/>iOS Safari | [<img src="https://raw.githubusercontent.com/alrra/browser-logos/master/src/opera/opera_48x48.png" alt="Opera" width="24px" height="24px" />](http://godban.github.io/browsers-support-badges/)<br/>Opera |
| --------- | --------- | --------- | --------- | --------- | --------- |
| IE10, IE11, Edge| last 2 versions| last 2 versions| last 2 versions| last 2 versions| last 2 versions

## Remarks for compression to work in Web Worker
The browser need to support "OffscreenCanvas" API in order to take advantage of non-blocking compression. If browser do not support "OffscreenCanvas" API, main thread is used instead. See https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas#browser_compatibility for browser compatibility of "OffscreenCanvas" API.

## Typescript type definitions ##
Typescript definitions are included in the package & referenced in the `types` section of the `package.json`

## Contribution ##
1. fork the repo and git clone it
2. run `npm run watch` # it will watch code change in lib/ folder and generate js in dist/ folder
3. add/update code in lib/ folder
4. try the code by opening example/development.html which will load the js in dist/ folder
5. add/update test in test/ folder
6. `npm run test`
7. push to your forked repo on github
8. make a pull request to dev branch of this repo

[dist]: https://github.com/Donaldcwl/browser-image-compression/tree/master/dist
[example]: https://github.com/Donaldcwl/browser-image-compression/tree/master/example
[delivrjs]: https://cdn.jsdelivr.net/
