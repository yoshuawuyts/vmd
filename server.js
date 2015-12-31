/*global window:true*/
const app = require('electron').app
const BrowserWindow = require('electron').BrowserWindow
const crashReporter = require('electron').crashReporter
const chokidar = require('chokidar')
const path = require('path')
const fs = require('fs')
const getStdin = require('get-stdin')
const conf = global.conf = require('./config')

crashReporter.start()

const filePath = conf._[0]
const fromFile = Boolean(filePath)
var stdin, window

if (!fromFile) {
  getStdin()
    .then(function (body) {
      stdin = body.toString()
      sendMarkdown()
    })
}

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

  window.loadURL('file://' + __dirname + '/index.html')
  window.webContents.on('did-finish-load', sendMarkdown)

  if (conf.devtools) {
    window.openDevTools()
  }

  if (fromFile) {
    watcher.on('change', sendMarkdown)
    // (OS X) Set represented filename (icon in title bar)
    if (process.platform === 'darwin') {
      window.setRepresentedFilename(path.resolve(filePath))
    }
  }
})

function sendMarkdown () {
  const resolved = fromFile
    ? path.resolve(path.dirname(filePath))
    : process.cwd()

  var baseUrl = path.relative(__dirname, resolved)
  if (baseUrl) baseUrl += '/'

  if (window) {
    var contents = fromFile
      ? fs.readFileSync(filePath, { encoding: 'utf8' })
      : stdin

    window.webContents.send('md', {
      filePath: filePath,
      baseUrl: baseUrl,
      contents: contents
    })
  }
}
