import babel from 'rollup-plugin-babel';
import babelrc from 'babelrc-rollup';
import istanbul from 'rollup-plugin-istanbul';
import uglify from 'rollup-plugin-uglify';
import { minify } from 'uglify-es';
import nodent from 'rollup-plugin-nodent';

let pkg = require('./package.json');
let external = Object.keys(pkg.dependencies);

let plugins = [
  nodent({ noRuntime: true, promises: true }),
  babel(babelrc()),
  uglify({}, minify),
];

if (process.env.BUILD !== 'production') {
  plugins.push(istanbul({
    exclude: ['test/**/*', 'node_modules/**/*'],
  }));
}

export default {
  entry: 'lib/index.js',
  plugins: plugins,
  external: external,
  targets: [
    {
      dest: pkg.main,
      format: 'umd',
      moduleName: 'imageCompression',
      sourceMap: true,
    },
    {
      dest: pkg.module,
      format: 'es',
      sourceMap: true,
    },
  ],
};
