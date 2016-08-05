const path = require('path')
const fs = require('fs')
const minimist = require('minimist')

const isNotPackaged = /electron$/.test(process.argv[0])

const argv = isNotPackaged
  ? minimist([].concat(process.argv).splice(2))
  : minimist([].concat(process.argv).splice(1))

const defaults = fs.readFileSync(path.join(__dirname, '../defaults.yml'), 'utf-8')

const aliases = {
  v: 'version',
  h: 'help',
  t: 'title',
  d: 'devtools',
  z: 'zoom'
}

module.exports = require('rucola')('vmd', defaults, aliases, argv)
