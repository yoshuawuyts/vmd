const path = require('path')
const fs = require('fs')
const minimist = require('minimist')

const isPackaged = process.argv.indexOf('--not-packaged=true') === -1
const argvSpliceStart = isPackaged ? 1 : 2
const argv = minimist([].concat(process.argv).splice(argvSpliceStart))

const defaults = fs.readFileSync(path.join(__dirname, '../defaults.yml'), 'utf-8')

const aliases = {
  v: 'version',
  h: 'help',
  t: 'title',
  d: 'devtools',
  z: 'zoom'
}

module.exports = require('rucola')('vmd', defaults, aliases, argv)
