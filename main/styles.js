const path = require('path')
const fs = require('fs')
const app = require('electron').app

exports.getHighlightThemes = function () {
  var themesPath = path.resolve(require.resolve('highlight.js'), '../..', 'styles')

  try {
    return fs.readdirSync(themesPath)
      .filter(function (name) {
        return path.extname(name) === '.css' && name !== 'default.css'
      })
      .map(function (name) {
        return path.basename(name, '.css')
      })
  } catch (ex) {
    return []
  }
}

exports.getHighlightTheme = function (theme) {
  var themePath = path.resolve(require.resolve('highlight.js'), '../..', 'styles', theme + '.css')

  try {
    return fs.readFileSync(themePath, 'utf-8')
  } catch (ex) {
    console.error('Cannot load theme', theme + ':', ex.code === 'ENOENT' ? 'no such file' : ex.message)
    app.exit(1)
  }
}

exports.getStylesheet = function (filePath) {
  var stylePath = path.resolve(filePath)

  try {
    return fs.readFileSync(stylePath, 'utf-8')
  } catch (ex) {
    console.error('Cannot load style', filePath + ':', ex.code === 'ENOENT' ? 'no such file' : ex.message)
    app.exit(1)
  }
}
