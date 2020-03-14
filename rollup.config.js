import babel from 'rollup-plugin-babel'
import { terser } from 'rollup-plugin-terser'
import nodent from 'rollup-plugin-nodent'
import license from 'rollup-plugin-license'
import copy from 'rollup-plugin-copy'
import path from 'path'

const pkg = require('./package.json')
const external = Object.keys(pkg.dependencies)

let plugins = [
  nodent({ noRuntime: true, promises: true }),
  babel(),
  terser({
    keep_fnames: true,
    mangle: { reserved: ['CustomFile', 'CustomFileReader'] }
  }),
  license({
    sourcemap: true,
    banner: '<%= _.startCase(pkg.name) %>\nv<%= pkg.version %>\nby <%= pkg.author %>\n<%= pkg.repository.url %>',
  }),
  copy({
    targets: [
      { src: 'lib/index.d.ts', dest: path.dirname(pkg.types) , rename: path.basename(pkg.types) }
    ]
  })
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
      sourcemap: true
    },
    {
      file: pkg.module,
      format: 'es',
      sourcemap: true
    }
  ]
}
