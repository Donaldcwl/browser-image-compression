## v1.0.2 (8 Apr 2019)
* fixing bug related to image orientation and squeezing

## v1.0.1 (8 Mar 2019)
* fixing bug related to wrong image output resolution in some case

## v1.0.0 (6 Feb 2019)
* breaking change: change "imageCompression" function signature
* use of OffscreenCanvas when support, fallback to document.createElement('canvas')
* use createImageBitmap when support, fallback to FileReader readAsDataURL
* add web worker support
* follows image exif orientation