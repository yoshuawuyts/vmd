const app = require('electron').app
const crashReporter = require('electron').crashReporter
const getStdin = require('get-stdin')
const createWindow = require('./create-window')
const conf = global.conf = require('./config')

crashReporter.start()

const filePath = conf._[0]
const fromFile = Boolean(filePath)

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  app.quit()
})

app.on('ready', function () {
  if (!fromFile) {
    getStdin()
      .then(function (body) {
        createWindow({
          contents: body.toString(),
          devTools: conf.devtools
        })
      })
  } else {
    createWindow({
      filePath: filePath,
      devTools: conf.devtools
    })
  }
})
