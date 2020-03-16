import React from 'react'
import './App.css'
import imageCompression from 'browser-image-compression'

export default class App extends React.Component {
  constructor (...args) {
    super(...args)
    this.compressImage = this.compressImage.bind(this)
    this.handleChange = this.handleChange.bind(this)
    this.state = {
      maxSizeMB: 1,
      maxWidthOrHeight: 1024,
      webWorker: {
        progress: null,
        inputSize: null,
        outputSize: null,
        inputUrl: null,
        outputUrl: null
      },
      mainThread: {
        progress: null,
        inputSize: null,
        outputSize: null,
        inputUrl: null,
        outputUrl: null
      }
    }
  }

  handleChange (target) {
    return (e) => {
      this.setState({ [target]: e.currentTarget.value })
    }
  }

  onProgress (p, useWebWorker) {
    const targetName = useWebWorker ? 'webWorker' : 'mainThread'
    this.setState(prevState => ({
      ...prevState,
      [targetName]: {
        ...prevState[targetName],
        progress: p
      }
    }))
  }

  async compressImage (event, useWebWorker) {
    const file = event.target.files[0]
    console.log('input', file)
    console.log(
      'ExifOrientation',
      await imageCompression.getExifOrientation(file)
    )
    const targetName = useWebWorker ? 'webWorker' : 'mainThread'
    this.setState(prevState => ({
      ...prevState,
      [targetName]: {
        ...prevState[targetName],
        inputSize: (file.size / 1024 / 1024).toFixed(2),
        inputUrl: URL.createObjectURL(file)
      }
    }))
    var options = {
      maxSizeMB: this.state.maxSizeMB,
      maxWidthOrHeight: this.state.maxWidthOrHeight,
      useWebWorker,
      onProgress: p => this.onProgress(p, useWebWorker)
    }
    const output = await imageCompression(file, options)
    console.log('output', output)
    this.setState(prevState => ({
      ...prevState,
      [targetName]: {
        ...prevState[targetName],
        outputSize: (output.size / 1024 / 1024).toFixed(2),
        outputUrl: URL.createObjectURL(output)
      }
    }))
  }

  render () {
    const { webWorker, mainThread, maxSizeMB, maxWidthOrHeight } = this.state
    return (
      <div className="App">
        <div>
          Options:<br />
          <label htmlFor="maxSizeMB">maxSizeMB: <input type="number" id="maxSizeMB" name="maxSizeMB"
                                                       value={maxSizeMB}
                                                       onChange={this.handleChange('maxSizeMB')} /></label><br />
          <label htmlFor="maxWidthOrHeight">maxWidthOrHeight: <input type="number" id="maxWidthOrHeight"
                                                                     name="maxWidthOrHeight"
                                                                     value={maxWidthOrHeight}
                                                                     onChange={this.handleChange('maxWidthOrHeight')} /></label>
          <hr />
          <label htmlFor="web-worker">
            Compress in web-worker{' '}
            {webWorker.progress && <span>{webWorker.progress} %</span>}
            <input
              id="web-worker"
              type="file"
              accept="image/*"
              onChange={e => this.compressImage(e, true)}
            />
          </label>
          <p>
            {webWorker.inputSize && (
              <span>Source image size: {webWorker.inputSize} mb</span>
            )}
            {webWorker.outputSize && (
              <span>, Output image size: {webWorker.outputSize}</span>
            )}
          </p>
        </div>
        <div>
          <label htmlFor="main-thread">
            Compress in main-thread{' '}
            {mainThread.progress && <span>{mainThread.progress} %</span>}
            <input
              id="main-thread"
              type="file"
              accept="image/*"
              onChange={e => this.compressImage(e, false)}
            />
          </label>
          <p>
            {mainThread.inputSize && (
              <span>Source image size: {mainThread.inputSize} mb</span>
            )}
            {mainThread.outputSize && (
              <span>, Output image size: {mainThread.outputSize}</span>
            )}
          </p>
        </div>
        {(mainThread.inputUrl || webWorker.inputUrl) && (
          <table>
            <thead>
            <tr>
              <td>input preview</td>
              <td>output preview</td>
            </tr>
            </thead>
            <tbody>
            <tr>
              <td><img src={mainThread.inputUrl || webWorker.inputUrl} alt="input" /></td>
              <td><img src={mainThread.outputUrl || webWorker.outputUrl} alt="output" /></td>
            </tr>
            </tbody>
          </table>
        )}
      </div>
    )
  }
};
