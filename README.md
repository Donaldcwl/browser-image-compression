# Browser Image Compression
[![npm](https://img.shields.io/npm/v/browser-image-compression.svg)](https://www.npmjs.com/package/browser-image-compression)
[![npm](./coverage/badge.svg)](https://github.com/Donaldcwl/browser-image-compression)
[![npm](https://img.shields.io/npm/l/browser-image-compression.svg)](https://github.com/Donaldcwl/browser-image-compression)

Javascript module to be run in the web browser for image compression.

## Features
- You can use this module to compress jpeg and png images by reducing **resolution** or **storage size** before uploading to the application server to save bandwidth.
- **Multi-thread** (web worker) non-blocking compression is supported through options.


## Upgrade to version 2
Note that core-js is dropped in version 2, please read the [IE support](#ie-support) section.

## Demo / Example
open https://donaldcwl.github.io/browser-image-compression/example/basic.html

or check the "[example]" folder in this repo


## Usage
```html
<input type="file" accept="image/*" onchange="handleImageUpload(event);">
```
### async await syntax:
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
### Promise.then().catch() syntax:
<details>
  <summary>Click to expand</summary>
  
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
</details>

## Installing
### Use as ES module:
You can install it via npm or yarn
```bash
npm install browser-image-compression --save
# or
yarn add browser-image-compression
```
```javascript
import imageCompression from 'browser-image-compression';
```
(can be used in frameworks like React, Angular, Vue etc)

(work with bundlers like webpack and rollup)

### (or) Load UMD js file:
You can download imageCompression from the [dist folder][dist].

Alternatively, you can use a CDN like [delivrjs]:
```html
<script type="text/javascript" src="https://cdn.jsdelivr.net/npm/browser-image-compression@2.0.0/dist/browser-image-compression.js"></script>
```


## Support
If this project helps you reduce the time to develop, you can buy me a cup of coffee :)

<a href="https://donaldcwl.github.io/donation/" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-red.png" alt="Buy Me A Coffee" height=60 width=217 ></a>

## API
### Main function
```javascript
// you should provide one of maxSizeMB, maxWidthOrHeight in the options
const options: Options = { 
  maxSizeMB: number,            // (default: Number.POSITIVE_INFINITY)
  maxWidthOrHeight: number,     // compressedFile will scale down by ratio to a point that width or height is smaller than maxWidthOrHeight (default: undefined)
                                // but, automatically reduce the size to smaller than the maximum Canvas size supported by each browser.
                                // Please check the Caveat part for details.
  onProgress: Function,         // optional, a function takes one progress argument (percentage from 0 to 100) 
  useWebWorker: boolean,        // optional, use multi-thread web worker, fallback to run in main-thread (default: true)

  signal: AbortSignal,          // options, to abort / cancel the compression

  // following options are for advanced users
  maxIteration: number,         // optional, max number of iteration to compress the image (default: 10)
  exifOrientation: number,      // optional, see https://stackoverflow.com/a/32490603/10395024
  fileType: string,             // optional, fileType override e.g., 'image/jpeg', 'image/png' (default: file.type)
  initialQuality: number,       // optional, initial quality value between 0 and 1 (default: 1)
  alwaysKeepResolution: boolean // optional, only reduce quality, always keep width and height (default: false)
}

imageCompression(file: File, options: Options): Promise<File>
```

#### Caveat
Each browser limits [the maximum size](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/canvas#maximum_canvas_size) of a Canvas object. <br/>
So, we resize the image to less than the maximum size that each browser restricts. <br/>
(However, the `proportion/ratio` of the image remains.)

#### Abort / Cancel Compression
To use this feature, please check the browser compatibility: https://caniuse.com/?search=AbortController
```javascript
function handleImageUpload(event) {

  var imageFile = event.target.files[0];

  var controller = new AbortController();

  var options = {
    // other options here
    signal: controller.signal,
  }
  imageCompression(imageFile, options)
    .then(function (compressedFile) {
      return uploadToServer(compressedFile); // write your own logic
    })
    .catch(function (error) {
      console.log(error.message); // output: I just want to stop
    });
  
  // simulate abort the compression after 1.5 seconds
  setTimeout(function () {
    controller.abort(new Error('I just want to stop'));
  }, 1500);
}
```

### Helper function
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


## Browsers support

| [<img src="https://raw.githubusercontent.com/alrra/browser-logos/master/src/edge/edge_48x48.png" alt="IE / Edge" width="24px" height="24px" />](http://godban.github.io/browsers-support-badges/)<br/>IE / Edge | [<img src="https://raw.githubusercontent.com/alrra/browser-logos/master/src/firefox/firefox_48x48.png" alt="Firefox" width="24px" height="24px" />](http://godban.github.io/browsers-support-badges/)<br/>Firefox | [<img src="https://raw.githubusercontent.com/alrra/browser-logos/master/src/chrome/chrome_48x48.png" alt="Chrome" width="24px" height="24px" />](http://godban.github.io/browsers-support-badges/)<br/>Chrome | [<img src="https://raw.githubusercontent.com/alrra/browser-logos/master/src/safari/safari_48x48.png" alt="Safari" width="24px" height="24px" />](http://godban.github.io/browsers-support-badges/)<br/>Safari | [<img src="https://raw.githubusercontent.com/alrra/browser-logos/master/src/safari-ios/safari-ios_48x48.png" alt="iOS Safari" width="24px" height="24px" />](http://godban.github.io/browsers-support-badges/)<br/>iOS Safari | [<img src="https://raw.githubusercontent.com/alrra/browser-logos/master/src/opera/opera_48x48.png" alt="Opera" width="24px" height="24px" />](http://godban.github.io/browsers-support-badges/)<br/>Opera |
| --------- | --------- | --------- | --------- | --------- | --------- |
| IE10, IE11, Edge| last 2 versions| last 2 versions| last 2 versions| last 2 versions| last 2 versions

### IE support
This library uses ES features such as Promise API, globalThis. If you need to support browsers that do not support new ES features like IE. You can include the core-js polyfill in your project.

You can include the following script to load the core-js polyfill:
```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/core-js/3.21.1/minified.min.js"></script>
```


## Remarks for compression to work in Web Worker
The browser needs to support "OffscreenCanvas" API in order to take advantage of non-blocking compression. If the browser does not support "OffscreenCanvas" API, the main thread is used instead. See https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas#browser_compatibility for browser compatibility of "OffscreenCanvas" API.


## Typescript type definitions
Typescript definitions are included in the package & referenced in the `types` section of the `package.json`


## Contribution
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
