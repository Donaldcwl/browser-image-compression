import babel from 'rollup-plugin-babel'
import { terser } from 'rollup-plugin-terser'
import nodent from 'rollup-plugin-nodent'
import license from 'rollup-plugin-license'

let pkg = require('./package.json')
let external = Object.keys(pkg.dependencies)

let plugins = [
  nodent({ noRuntime: true, promises: true }),
  babel(),
  terser({ keep_fnames: true }),
  license({
    sourcemap: true,
    banner: '<%= _.startCase(pkg.name) %>\nv<%= pkg.version %>\nby <%= pkg.author %>\n<%= pkg.repository.url %>',
  }),
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
