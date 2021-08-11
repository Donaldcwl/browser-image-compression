const jsdom = require('jsdom');

const { JSDOM } = jsdom;

const { window } = new JSDOM('', { resources: 'usable' });

if (typeof window.Worker === 'undefined') {
  window.Worker = function () {};
}

global.window = window;
const KEYS = ['document', 'navigator', 'Blob', 'File', 'URL', 'Worker', 'FileReader', 'atob', 'Uint8Array', 'Image', 'HTMLCanvasElement', 'HTMLImageElement'];
KEYS.forEach((key) => global[key] = window[key]);

if (typeof window.URL.createObjectURL === 'undefined') {
  Object.defineProperty(window.URL, 'createObjectURL', { value: () => {} });
}
