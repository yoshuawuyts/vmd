/*global window:true*/
const BrowserWindow = require('browser-window')
const crashReporter = require('crash-reporter')
const chokidar = require('chokidar')
const path = require('path')
const app = require('app')
const fs = require('fs')
const getStdin = require('get-stdin')
const conf = global.conf = require('./config')

crashReporter.start()

const filePath = conf._[0]
const fromFile = Boolean(filePath)
var stdin, window

if (!fromFile) {
  getStdin(function (body) {
    stdin = body.toString()
    sendMarkdown()
  })
}

const resolved = fromFile ? path.resolve(path.dirname(filePath)) : process.cwd()
global.baseUrl = path.relative(__dirname, resolved)
if (global.baseUrl) global.baseUrl += '/'

var watcher
if (fromFile) {
  watcher = chokidar.watch(filePath, { usePolling: true })
}

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  app.quit()
})

app.on('ready', function () {
  var prefix = fromFile ? (path.basename(filePath) + ' - ') : ''
  window = new BrowserWindow({
    title: prefix + 'vmd',
    icon: path.join(__dirname, 'resources/vmd.png'),
    width: 800,
    height: 600
  })

  window.loadUrl('file://' + __dirname + '/index.html')
  window.webContents.on('did-finish-load', sendMarkdown)

  if (conf.devtools) {
    window.openDevTools()
  }

  if (fromFile) {
    watcher.on('change', sendMarkdown)
  }
})

function sendMarkdown () {
  if (window) {
    var contents = fromFile
      ? fs.readFileSync(filePath, { encoding: 'utf8' })
      : stdin
    window.webContents.send('md', contents)
  }
}
