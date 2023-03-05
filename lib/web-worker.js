function createWorkerScriptURL(script) {
  const blobArgs = [];
  if (typeof script === 'function') {
    blobArgs.push(`(${script})()`);
  } else {
    blobArgs.push(script);
  }
  return URL.createObjectURL(new Blob(blobArgs));
}

const workerScript = `
let scriptImported = false
self.addEventListener('message', async (e) => {
  const { file, id, imageCompressionLibUrl, options } = e.data
  options.onProgress = (progress) => self.postMessage({ progress, id })
  try {
    if (!scriptImported) {
      // console.log('[worker] importScripts', imageCompressionLibUrl)
      self.importScripts(imageCompressionLibUrl)
      scriptImported = true
    }
    // console.log('[worker] self', self)
    const compressedFile = await imageCompression(file, options)
    self.postMessage({ file: compressedFile, id })
  } catch (e) {
    // console.error('[worker] error', e)
    self.postMessage({ error: e.message + '\\n' + e.stack, id })
  }
})
`;
let workerScriptURL;

export default function compressOnWebWorker(file, options) {
  return new Promise((resolve, reject) => {
    if (!workerScriptURL) {
      workerScriptURL = createWorkerScriptURL(workerScript);
    }
    const worker = new Worker(workerScriptURL);

    function handler(e) {
      if (options.signal && options.signal.aborted) {
        worker.terminate();
        return;
      }
      if (e.data.progress !== undefined) {
        options.onProgress(e.data.progress);
        return;
      }
      if (e.data.error) {
        reject(new Error(e.data.error));
        worker.terminate();
        return;
      }
      resolve(e.data.file);
      worker.terminate();
    }

    worker.addEventListener('message', handler);
    worker.addEventListener('error', reject);
    if (options.signal) {
      options.signal.addEventListener('abort', () => {
        reject(options.signal.reason);
        worker.terminate();
      });
    }

    worker.postMessage({
      file,
      imageCompressionLibUrl: options.libURL,
      options: { ...options, onProgress: undefined, signal: undefined },
    });
  });
}
