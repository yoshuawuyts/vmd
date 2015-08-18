const path = require('path')
const fs = require('fs')

const defaults = fs.readFileSync(path.join(__dirname, 'defaults.yml'), 'utf-8')

const aliases = {
  d: 'devtools',
  z: 'zoom'
}

module.exports = require('rucola')('vmd', defaults, aliases)
