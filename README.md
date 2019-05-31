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
https://cdn.jsdelivr.net/npm/browser-image-compression@1.0.5/dist/browser-image-compression.js
or
https://cdn.jsdelivr.net/npm/browser-image-compression@latest/dist/browser-image-compression.js
```

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
<script type="text/javascript" src="https://cdn.jsdelivr.net/npm/browser-image-compression@latest/dist/browser-image-compression.js"></script>
```

## API ##
### Main function ###
```javascript
// you should provide one of maxSizeMB, maxWidthOrHeight in the options
const options = { 
  maxSizeMB: number,          // (default: Number.POSITIVE_INFINITY)
  maxWidthOrHeight: number,   // compressedFile will scale down by ratio to a point that width or height is smaller than maxWidthOrHeight (default: undefined)
  useWebWorker: boolean,      // optional, use multi-thread web worker, fallback to run in main-thread (default: true)
  maxIteration: number        // optional, max number of iteration to compress the image (default: 10)
}

imageCompression(file: File, options): Promise<File>
```
### Helper function ###
- for advanced user only, most user won't need to use the helper functions
```javascript
imageCompression.getDataUrlFromFile(file: File): Promise<base64 encoded string>
imageCompression.getFilefromDataUrl(dataUrl: string): Promise<File>
imageCompression.loadImage(url: string): Promise<HTMLImageElement>
imageCompression.drawImageInCanvas(img: HTMLImageElement): HTMLCanvasElement
imageCompression.drawFileInCanvas(file: File): Promise<[ImageBitmap | HTMLImageElement, HTMLCanvasElement]>
imageCompression.canvasToFile(canvas, fileType, fileName, fileLastModified[, quality]): Promise<File|Blob>
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

  var options = {
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

## Browsers support ##

| [<img src="https://raw.githubusercontent.com/godban/browsers-support-badges/master/src/images/edge.png" alt="IE / Edge" width="16px" height="16px" />](http://godban.github.io/browsers-support-badges/)</br>IE / Edge | [<img src="https://raw.githubusercontent.com/godban/browsers-support-badges/master/src/images/firefox.png" alt="Firefox" width="16px" height="16px" />](http://godban.github.io/browsers-support-badges/)</br>Firefox | [<img src="https://raw.githubusercontent.com/godban/browsers-support-badges/master/src/images/chrome.png" alt="Chrome" width="16px" height="16px" />](http://godban.github.io/browsers-support-badges/)</br>Chrome | [<img src="https://raw.githubusercontent.com/godban/browsers-support-badges/master/src/images/safari.png" alt="Safari" width="16px" height="16px" />](http://godban.github.io/browsers-support-badges/)</br>Safari | [<img src="https://raw.githubusercontent.com/godban/browsers-support-badges/master/src/images/opera.png" alt="Opera" width="16px" height="16px" />](http://godban.github.io/browsers-support-badges/)</br>Opera | [<img src="https://raw.githubusercontent.com/godban/browsers-support-badges/master/src/images/chrome-android.png" alt="Chrome for Android" width="16px" height="16px" />](http://godban.github.io/browsers-support-badges/)</br>Chrome for Android |
| --------- | --------- | --------- | --------- | --------- | --------- |
| IE10, IE11, Edge| last 2 versions| last 2 versions| last 2 versions| last 2 versions| last 2 versions


## Example ##
Please check the "[example]" folder in this repo
- How to run the example:
```bash
git clone https://github.com/Donaldcwl/browser-image-compression.git
cd browser-image-compression/example
# open "basic.html" on your browser
```

## Contribution ##
1. fork the repo and git clone it
2. run `npm run watch` # it will watch code change in lib/ folder and generate js in dist/ folder
3. add/update code in lib/ folder
4. try the code by opening example/development.html which will load the js in dist/ folder
5. add/update test in test/ folder
6. `npm run test`
7. push to your forked repo on github
8. make a pull request to this repo

[dist]: https://github.com/Donaldcwl/browser-image-compression/tree/master/dist
[example]: https://github.com/Donaldcwl/browser-image-compression/tree/master/example
[delivrjs]: https://cdn.jsdelivr.net/
