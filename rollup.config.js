import babel from 'rollup-plugin-babel'
import istanbul from 'rollup-plugin-istanbul'
import { terser } from 'rollup-plugin-terser'
import nodent from 'rollup-plugin-nodent'

let pkg = require('./package.json')
let external = Object.keys(pkg.dependencies)

let plugins = [
  nodent({ noRuntime: true, promises: true }),
  babel(),
  terser()
]

if (process.env.BUILD !== 'production') {
  plugins.push(istanbul({
    exclude: ['test/**/*', 'node_modules/**/*']
  }))
}


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
