const path = require('path')
const fs = require('fs')
const BrowserWindow = require('electron').BrowserWindow
const ipc = require('electron').ipcMain
const chokidar = require('chokidar')
const assign = require('object-assign')

const defaultOptions = {
  width: 800,
  height: 600
}

module.exports = function createWindow (options) {
  options = assign({}, defaultOptions, options)

  const fromFile = typeof options.filePath !== 'undefined'
  var watcher

  var preloadPath = path.resolve(__dirname, 'api.js')

  var win = new BrowserWindow({
    preload: preloadPath,
    icon: path.join(__dirname, 'resources/vmd.png'),
    width: options.width,
    height: options.height
  })

  updateTitle()

  win.loadURL('file://' + __dirname + '/index.html')
  win.on('close', onClose)
  win.webContents.on('did-finish-load', sendMarkdown)

  win.on('closed', function () {
    win = null
  })

  if (options.devTools) {
    win.openDevTools()
  }

  if (fromFile) {
    watcher = chokidar.watch(options.filePath, { usePolling: true })
    watcher.on('change', sendMarkdown)
  }

  ipc.on('change-file', onChangeFile)
  ipc.on('open-file', onOpenFile)

  function onOpenFile (ev, filePath) {
    if (ev.sender === win.webContents) {
      createWindow({
        filePath: filePath,
        devTools: options.devTools
      })
    }
  }

  function onChangeFile (ev, filePath) {
    if (ev.sender === win.webContents) {
      changeFile(filePath)
    }
  }

  function onClose () {
    if (watcher) {
      watcher.close()
    }

    ipc.removeListener('change-file', onChangeFile)
    ipc.removeListener('open-file', onOpenFile)
  }

  function updateTitle () {
    var prefix = fromFile ? (path.basename(options.filePath) + ' - ') : ''

    win.setTitle(prefix + 'vmd')

    // (OS X) Set represented filename (icon in title bar)
    if (fromFile && process.platform === 'darwin') {
      win.setRepresentedFilename(path.resolve(options.filePath))
    }
  }

  function changeFile (filePath) {
    if (watcher) {
      watcher.unwatch(options.filePath)
      watcher.add(filePath)
    }

    options.filePath = filePath
    updateTitle()
    sendMarkdown()
  }

  function sendMarkdown () {
    const resolved = fromFile
      ? path.resolve(path.dirname(options.filePath))
      : process.cwd()

    var baseUrl = path.relative(__dirname, resolved)
    if (baseUrl) baseUrl += '/'

    if (win) {
      var contents = fromFile
        ? fs.readFileSync(options.filePath, { encoding: 'utf8' })
        : options.contents

      win.webContents.send('md', {
        filePath: options.filePath,
        baseUrl: baseUrl,
        contents: contents
      })
    }
  }

  return {
    win: win,
    changeFile: changeFile
  }
}
