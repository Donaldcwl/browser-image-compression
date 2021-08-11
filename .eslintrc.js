module.exports = {
  env: {
    browser: true,
  },
  extends: [
    'airbnb-base',
  ],
  parserOptions: {
    ecmaVersion: 12,
    sourceType: 'module',
  },
  rules: {
    'max-len': ['warn', { code: 150 }],
  },
  ignorePatterns: ['dist'],
};
