# Browser Image Compression #
[![npm](https://img.shields.io/npm/v/browser-image-compression.svg)](https://www.npmjs.com/package/browser-image-compression)
[![npm](https://img.shields.io/npm/l/browser-image-compression.svg)](https://www.npmjs.com/package/browser-image-compression)

Javascript module to be run in the web browser for image compression.
You can use this module to compress jpeg and png image by reducing **resolution** or **storage size** before uploading to application server to save bandwidth.

## Install ##
```
npm install browser-image-compression --save
or
yarn add browser-image-compression
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
<script type="text/javascript" src="path/to/dist/browser-image-compression.js"></script>
```

## API ##
### Main function ###
#### imageCompression(file: File[, maxSizeMB: number][, maxWidthOrHeight: number]): Promise\<File> ####
### Helper function ###
#### imageCompression.drawImageInCanvas(img: HTMLImageElement[, maxWidthOrHeight: number]): Canvas ####
#### imageCompression.getDataUrlFromFile(file: File): Promise\<base64 encoded string> ####
#### imageCompression.getFilefromDataUrl(dataUrl: string): Promise\<File> ####
#### imageCompression.loadImage(url: string): Promise\<HTMLImageElement> ####

## Usage ##
```
<input type="file" accept="image/*" onchange="handleImageUpload(event);">
```
```javascript
function handleImageUpload(event) {

  var imageFile = event.target.files[0];
  console.log('originalFile instanceof Blob', imageFile instanceof Blob); // true
  console.log(`originalFile size ${imageFile.size / 1024 / 1024} MB`);

  var maxSizeMB = 1;
  var maxWidthOrHeight = 1920; // compressedFile will scale down by ratio to a point that width or height is smaller than maxWidthOrHeight
  imageCompression(imageFile, maxSizeMB, maxWidthOrHeight) // maxSizeMB, maxWidthOrHeight are optional
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
with async/await syntax:
```javascript
async function handleImageUpload(event) {

  const imageFile = event.target.files[0];
  console.log('originalFile instanceof Blob', imageFile instanceof Blob); // true
  console.log(`originalFile size ${imageFile.size / 1024 / 1024} MB`);

  const maxSizeMB = 1;
  const maxWidthOrHeight = 1920; // compressedFile will scale down by ratio to a point that width or height is smaller than maxWidthOrHeight
  try {
    const compressedFile = await imageCompression(imageFile, maxSizeMB);  // maxSizeMB, maxWidthOrHeight are optional
    console.log('compressedFile instanceof Blob', compressedFile instanceof Blob); // true
    console.log(`compressedFile size ${compressedFile.size / 1024 / 1024} MB`); // smaller than maxSizeMB

    await uploadToServer(compressedFile); // write your own logic
  } catch (error) {
    console.log(error);
  }

}
```

## Browsers support ##

| [<img src="https://raw.githubusercontent.com/godban/browsers-support-badges/master/src/images/edge.png" alt="IE / Edge" width="16px" height="16px" />](http://godban.github.io/browsers-support-badges/)</br>IE / Edge | [<img src="https://raw.githubusercontent.com/godban/browsers-support-badges/master/src/images/firefox.png" alt="Firefox" width="16px" height="16px" />](http://godban.github.io/browsers-support-badges/)</br>Firefox | [<img src="https://raw.githubusercontent.com/godban/browsers-support-badges/master/src/images/chrome.png" alt="Chrome" width="16px" height="16px" />](http://godban.github.io/browsers-support-badges/)</br>Chrome | [<img src="https://raw.githubusercontent.com/godban/browsers-support-badges/master/src/images/safari.png" alt="Safari" width="16px" height="16px" />](http://godban.github.io/browsers-support-badges/)</br>Safari | [<img src="https://raw.githubusercontent.com/godban/browsers-support-badges/master/src/images/opera.png" alt="Opera" width="16px" height="16px" />](http://godban.github.io/browsers-support-badges/)</br>Opera | [<img src="https://raw.githubusercontent.com/godban/browsers-support-badges/master/src/images/chrome-android.png" alt="Chrome for Android" width="16px" height="16px" />](http://godban.github.io/browsers-support-badges/)</br>Chrome for Android |
| --------- | --------- | --------- | --------- | --------- | --------- |
| IE10, IE11, Edge| last 2 versions| last 2 versions| last 2 versions| last 2 versions| last 2 versions

## Example ##
Please check the "example" folder in this repo