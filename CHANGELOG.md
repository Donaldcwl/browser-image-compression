## v1.0.6 (5 July 2019)
* fixed: exif orientation do not work in some situations

## v1.0.5 (1 June 2019)
* added: support for cordova project that uses cordova-plugin-file
* optimized: follow image exif orientation even though image do not required to compress or resize
* fixed: error may throw on iPhone Safari because of OffscreenCanvas cannot get 2d context
* fixed: exif orientation do not work in some situations

## v1.0.2 (8 Apr 2019)
* fixed: bug related to image orientation and squeezing

## v1.0.1 (8 Mar 2019)
* fixed: bug related to wrong image output resolution in some cases

## v1.0.0 (6 Feb 2019)
* breaking change: change "imageCompression" function signature
* optimized: use of OffscreenCanvas when support, fallback to document.createElement('canvas')
* optimized: use createImageBitmap when support, fallback to FileReader readAsDataURL
* added: support web worker
* added: follows image exif orientation