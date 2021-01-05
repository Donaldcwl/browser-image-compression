## v1.0.14 (6 Jan 2021)
* updated: use UZIP to compress PNG image instead of Canvas
* fixed: PNG transparent background become black after compression [#84](https://github.com/Donaldcwl/browser-image-compression/issues/84), [#76](https://github.com/Donaldcwl/browser-image-compression/issues/76)
* fixed: progress jump back to 0 when Web Worker failback to main thread [#90](https://github.com/Donaldcwl/browser-image-compression/issues/90)

## v1.0.13 (8 Nov 2020)
* added: new option for setting initial quality level [#64](https://github.com/Donaldcwl/browser-image-compression/issues/64), [#78](https://github.com/Donaldcwl/browser-image-compression/issues/78)
* fixed: options object being altered by the compress func [#71](https://github.com/Donaldcwl/browser-image-compression/pull/71)
* fixed: issue with output size of png compression [#57](https://github.com/Donaldcwl/browser-image-compression/issues/57)

## v1.0.12 (4 June 2020)
* fixed: issue with SSR [#58](https://github.com/Donaldcwl/browser-image-compression/issues/58)

## v1.0.11 (8 May 2020)
* fixed: issue with IE support [#38](https://github.com/Donaldcwl/browser-image-compression/issues/38) [#23](https://github.com/Donaldcwl/browser-image-compression/issues/23)

## v1.0.10 (7 May 2020)
* fixed: issue in Web Worker when onProgress is undefined  [#50](https://github.com/Donaldcwl/browser-image-compression/issues/50) 
* fixed: handle behavior change of exif orientation in iOS 13.4.1 and Safari 13.1 Desktop [#52](https://github.com/Donaldcwl/browser-image-compression/issues/52)
* updated: typescript type definitions to resolve [#54](https://github.com/Donaldcwl/browser-image-compression/issues/54)

## v1.0.9 (25 Mar 2020)
* updated: compression becomes less aggressive, output file is closer to the 'maxWidthOrHeight' and/or 'maxSizeMB' in config
* fixed: file size increased in specific situation

## v1.0.8 (16 Mar 2020)
* added: support for Server Side Rendering (SSR)
* updated: ts type file

## v1.0.7 (15 Mar 2020)
* added: onProgress function in options for compression progress updates
* added: allow fileType override
* added: ts type file
* updated: useWebWorker default set to false
* fixed: garbage clean canvas for safari
* fixed: issue in Cordova support
* fixed: issue in IE browser
* fixed: other issues

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
