import BROWSER_NAME from './browser-name';

// see: https://github.com/jhildenbiddle/canvas-size#test-results
// see: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/canvas#maximum_canvas_size
export default {
  [BROWSER_NAME.CHROME]: 16384,
  [BROWSER_NAME.FIREFOX]: 11180,
  [BROWSER_NAME.DESKTOP_SAFARI]: 16384,
  [BROWSER_NAME.IE]: 8192,
  [BROWSER_NAME.MOBILE_SAFARI]: 4096,
  [BROWSER_NAME.ETC]: 8192,
};
