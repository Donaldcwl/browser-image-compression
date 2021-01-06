import babel from 'rollup-plugin-babel'
import { terser } from 'rollup-plugin-terser'
import nodent from 'rollup-plugin-nodent'
import license from 'rollup-plugin-license'
import copy from 'rollup-plugin-copy'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import path from 'path'

const pkg = require('./package.json')
const notExternal = [
  // 'pako',
  'uzip'
]
const external = Object.keys(pkg.dependencies).filter(value => !notExternal.includes(value))

let plugins = [
  nodent({ noRuntime: true, promises: true }),
  babel(),
  terser({
    keep_fnames: true,
    mangle: { reserved: ['CustomFile', 'CustomFileReader', 'UPNG', 'UZIP'] }
  }),
  license({
    sourcemap: true,
    banner: '<%= _.startCase(pkg.name) %>\nv<%= pkg.version %>\nby <%= pkg.author %>\n<%= pkg.repository.url %>',
  }),
  copy({
    targets: [
      { src: 'lib/index.d.ts', dest: path.dirname(pkg.types) , rename: path.basename(pkg.types) }
    ]
  }),
  nodeResolve(),
  commonjs()
]

export default {
  input: 'lib/index.js',
  plugins: plugins,
  external: external,
  output: [
    {
      file: pkg.main,
      name: 'imageCompression',
      format: 'umd',
      sourcemap: true,
      globals: {
        // pako: 'pako',
        uzip: 'UZIP'
      }
    },
    {
      file: pkg.module,
      format: 'es',
      sourcemap: true,
      globals: {
        // pako: 'pako',
        uzip: 'UZIP'
      }
    }
  ]
}
