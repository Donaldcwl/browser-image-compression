import { Component, OnInit } from '@angular/core'
import { DomSanitizer, SafeUrl } from '@angular/platform-browser'
import imageCompression from 'browser-image-compression'

@Component({
  selector: 'app-image-compress',
  templateUrl: './image-compress.component.html',
  styleUrls: ['./image-compress.component.css']
})
export class ImageCompressComponent implements OnInit {
  currentWebWorker: boolean
  maxSizeMB: number = 1
  maxWidthOrHeight: number = 1024
  webWorkerLog: string = ''
  mainThreadLog: string = ''
  webWorkerProgress: string = ''
  mainThreadProgress: string = ''
  webWorkerDownloadLink: SafeUrl
  mainThreadDownloadLink: SafeUrl
  preview: SafeUrl = ''

  constructor (private sanitizer: DomSanitizer) {}

  ngOnInit () { }

  async compressImage (file: File, useWebWorker: boolean) {
    if (!file) return
    this.currentWebWorker = useWebWorker
    console.log(file, this.currentWebWorker)
    this.preview = this.sanitizer.bypassSecurityTrustUrl(URL.createObjectURL(file))

    this.updateLog(false, 'Source image size:' + (file.size / 1024 / 1024).toFixed(2) + 'mb')
    console.log('input', file)
    console.log('ExifOrientation', await imageCompression.getExifOrientation(file))

    var options = {
      maxSizeMB: this.maxSizeMB,
      maxWidthOrHeight: this.maxWidthOrHeight,
      useWebWorker: this.currentWebWorker,
      onProgress: (p) => {
        if (this.currentWebWorker) {
          this.webWorkerProgress = '(' + p + '%' + ')'
        } else {
          this.mainThreadProgress = '(' + p + '%' + ')'
        }
      }
    }
    const output = await imageCompression(file, options)
    this.updateLog(true, ', output size:' + (output.size / 1024 / 1024).toFixed(2) + 'mb')
    console.log('output', output)
    if (this.currentWebWorker) {
      this.webWorkerDownloadLink = this.sanitizer.bypassSecurityTrustUrl(URL.createObjectURL(output))
    } else {
      this.mainThreadDownloadLink = this.sanitizer.bypassSecurityTrustUrl(URL.createObjectURL(output))
    }
    this.updateLog(true, ', output size:' + (output.size / 1024 / 1024).toFixed(2) + 'mb')

    // await uploadToServer(output)
  }

  updateLog (isAppend = false, log: string) {
    if (this.currentWebWorker) {
      this.webWorkerLog = (isAppend ? this.webWorkerLog : '') + log
    } else {
      this.mainThreadLog = (isAppend ? this.mainThreadLog : '') + log
    }
  }
}
