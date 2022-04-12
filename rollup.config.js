import { babel } from '@rollup/plugin-babel';
import { terser } from 'rollup-plugin-terser';
import nodent from 'rollup-plugin-nodent';
import license from 'rollup-plugin-license';
import copy from 'rollup-plugin-copy';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import replace from '@rollup/plugin-replace';
import path from 'path';
import { visualizer } from 'rollup-plugin-visualizer';

const pkg = require('./package.json');

const isProduction = process.env.BUILD === 'production';

const notExternal = ['uzip'];
const external = Object.keys(pkg.dependencies).filter(
  (value) => !notExternal.includes(value),
);

const plugins = [
  replace({
    preventAssignment: true,
    values: {
      'process.env.NODE_ENV': JSON.stringify(process.env.BUILD),
      'process.env.BUILD': JSON.stringify(process.env.BUILD),
      __buildDate__: () => JSON.stringify(new Date()),
      __buildVersion__: JSON.stringify(pkg.version),
    },
  }),
  nodeResolve(),
  nodent({ noRuntime: true, promises: true }),
  commonjs(),
  babel({
    babelHelpers: 'bundled',
  }),
  isProduction
    && terser({
      keep_fnames: true,
      mangle: { reserved: ['CustomFile', 'CustomFileReader', 'UPNG', 'UZIP'] },
    }),
  license({
    sourcemap: true,
    banner:
      '<%= _.startCase(pkg.name) %>\nv<%= pkg.version %>\nby <%= pkg.author %>\n<%= pkg.repository.url %>',
  }),
  copy({
    targets: [
      {
        src: 'lib/index.d.ts',
        dest: path.dirname(pkg.types),
        rename: path.basename(pkg.types),
      },
    ],
  }),
  visualizer({
    open: false,
    gzipSize: true,
    brotliSize: true,
  }),
];

export default {
  input: 'lib/index.js',
  plugins,
  external,
  output: [
    {
      file: pkg.main,
      name: 'imageCompression',
      format: 'umd',
      sourcemap: true,
      globals: {
        uzip: 'UZIP',
      },
    },
    {
      file: pkg.module,
      format: 'es',
      sourcemap: true,
      globals: {
        uzip: 'UZIP',
      },
    },
  ],
};
