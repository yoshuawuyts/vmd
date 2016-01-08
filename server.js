const fs = require('fs')
const path = require('path')
const url = require('url')
const app = require('electron').app
const Menu = require('electron').Menu
const getStdin = require('get-stdin')
const createWindow = require('./create-window')
const conf = global.conf = require('./config')

const filePath = conf._[0] || (process.stdin.isTTY ? conf.document : null)
const fromFile = !!filePath

if (fromFile) {
  try {
    var stat = fs.statSync(path.resolve(filePath))

    if (stat.isDirectory()) {
      console.error('Cannot open', filePath + ': is a directory')
      process.exit(1)
    }
  } catch (ex) {
    console.error('Cannot open', filePath + ':', ex.code === 'ENOENT' ? 'no such file' : ex.message)
    process.exit(1)
  }
}

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  app.quit()
})

app.on('ready', function () {
  registerEmojiProtocol()
  addApplicationMenu()

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

function registerEmojiProtocol () {
  const protocol = require('electron').protocol
  const emojiPath = path.resolve(path.dirname(require.resolve('emojify.js')), '..', 'images', 'basic')

  protocol.registerFileProtocol(
    'emoji',
    function (req, callback) {
      var emoji = url.parse(req.url).hostname
      callback({
        path: path.join(emojiPath, emoji + '.png')
      })
    },
    function (err) {
      if (err) {
        console.error('failed to register protocol')
      }
    }
  )
}

function addApplicationMenu () {
  // menu
  var vmdSubmenu = [
    {
      label: 'Close window',
      accelerator: 'CmdOrCtrl+W',
      role: 'close'
    },
    {
      label: 'Quit',
      accelerator: 'CmdOrCtrl+Q',
      click: function () {
        app.quit()
      }
    }
  ]

  if (process.platform === 'darwin') {
    vmdSubmenu = [
      {
        label: 'About vmd',
        selector: 'orderFrontStandardAboutPanel:'
      },
      {
        type: 'separator'
      }
    ].concat(vmdSubmenu)
  }

  // Doc: https://github.com/atom/electron/blob/master/docs/api/menu-item.md
  var template = [
    {
      label: 'vmd',
      submenu: vmdSubmenu
    },
    {
      label: 'File',
      submenu: [
        {
          label: 'Print',
          accelerator: 'CmdOrCtrl+P',
          click: function (item, win) {
            win.webContents.send('print')
          }
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        {
          label: 'Copy',
          accelerator: 'CmdOrCtrl+C',
          role: 'copy'
        },
        {
          label: 'Select All',
          accelerator: 'CmdOrCtrl+A',
          role: 'selectall'
        }
      ]
    },
    {
      label: 'History',
      submenu: [
        {
          label: 'Back',
          accelerator: 'Alt+Left',
          click: function (item, win) {
            win.webContents.send('history-back')
          }
        },
        {
          label: 'Forward',
          accelerator: 'Alt+Right',
          click: function (item, win) {
            win.webContents.send('history-forward')
          }
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Zoom In',
          accelerator: 'CmdOrCtrl+Plus',
          click: function (item, win) {
            win.webContents.send('zoom-in')
          }
        },
        {
          label: 'Zoom Out',
          accelerator: 'CmdOrCtrl+-',
          click: function (item, win) {
            win.webContents.send('zoom-out')
          }
        },
        {
          label: 'Reset Zoom',
          accelerator: 'CmdOrCtrl+0',
          click: function (item, win) {
            win.webContents.send('zoom-reset')
          }
        },
        {
          label: 'Toggle Developer Tools',
          accelerator: (function () {
            if (process.platform === 'darwin') {
              return 'Alt+Command+I'
            } else {
              return 'Ctrl+Shift+I'
            }
          })(),
          click: function (item, focusedWindow) {
            if (focusedWindow) {
              focusedWindow.toggleDevTools()
            }
          }
        }
      ]
    }
  ]

  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}
