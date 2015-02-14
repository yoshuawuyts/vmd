const BrowserWindow = require('browser-window')
const assert = require('assert')
const app = require('app')
const ipc = require('ipc')
const fs = require('fs')
const path = require('path')
const chokidar = require('chokidar')

require('crash-reporter').start()

const mainWindow = null

const filePath = process.argv[2]
assert(filePath, 'no file path specified')

global.baseUrl = path.relative(__dirname, path.resolve(path.dirname(filePath)));
if (global.baseUrl) { global.baseUrl += '/'; }

const watcher = chokidar.watch(filePath, {
  usePolling: true
})

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
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
  window.on('closed', function () {
    mainWindow = null
  })

  watcher.on('change', sendMarkdown)

  function sendMarkdown () {
      var file = fs.readFileSync(filePath, { encoding: 'utf8' })
      window.webContents.send('md', file)
  }
})
