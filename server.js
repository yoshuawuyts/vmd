/*global window:true*/
const BrowserWindow = require('browser-window')
const crashReporter = require('crash-reporter')
const chokidar = require('chokidar')
const assert = require('assert')
const path = require('path')
const app = require('app')
const fs = require('fs')

crashReporter.start()

const filePath = process.argv[2]
assert(filePath, 'no file path specified')

global.baseUrl = path.relative(__dirname, path.resolve(path.dirname(filePath)))
if (global.baseUrl) global.baseUrl += '/'

const watcher = chokidar.watch(filePath, { usePolling: true })

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  app.quit()
})

app.on('ready', function () {
  window = new BrowserWindow({
    title: path.basename(filePath) + ' - vmd',
    icon: path.join(__dirname, 'resources/vmd.png'),
    width: 800,
    height: 600
  })

  window.loadUrl('file://' + __dirname + '/index.html')
  window.webContents.on('did-finish-load', sendMarkdown)

  watcher.on('change', sendMarkdown)

  function sendMarkdown () {
    var file = fs.readFileSync(filePath, { encoding: 'utf8' })
    window.webContents.send('md', file)
  }
})
