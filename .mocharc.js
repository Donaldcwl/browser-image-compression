module.exports = {
  recursive: true,
  require: ['@babel/register', '@babel/polyfill', './test/setup_global.js', './test/setup_jsdom.js']
}