const highlightjs = require('highlight.js')
const marked = require('marked')
const remote = require('electron').remote
const app = remote.app
const Menu = remote.Menu
const MenuItem = remote.MenuItem
const ipc = require('electron').ipcRenderer
const conf = remote.getGlobal('conf')
const currentWindow = remote.getCurrentWindow()

var rightClickPosition = null

marked.setOptions({
  highlight: function (code, lang) {
    return highlightjs.highlightAuto(code, [lang]).value
  }
})

ipc.on('md', function (ev, raw) {
  const md = marked(raw)
  const base = document.querySelector('base')
  const body = document.querySelector('.markdown-body')
  base.setAttribute('href', remote.getGlobal('baseUrl'))
  body.innerHTML = md
})

window.addEventListener('keydown', function (ev) {
  var esc = ev.keyCode === 27
  var w = ev.keyCode === 87
  var ctrlW = ev.ctrlKey && w
  var cmdW = ev.metaKey && w

  if (esc || ctrlW || cmdW) currentWindow.close()
})

var zoom = require('./zoom')(conf.zoom)

// menu
var vmdSubmenu = [
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
        click: function () {
          window.print()
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
        click: function () {
          document.execCommand('copy')
        }
      },
      {
        label: 'Select All',
        accelerator: 'CmdOrCtrl+A',
        click: function () {
          document.execCommand('selectAll')
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
        click: function () {
          zoom.zoomIn()
        }
      },
      {
        label: 'Zoom Out',
        accelerator: 'CmdOrCtrl+-',
        click: function () {
          zoom.zoomOut()
        }
      },
      {
        label: 'Reset Zoom',
        accelerator: 'CmdOrCtrl+0',
        click: function () {
          zoom.reset()
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

// Context menus
// Doc: https://github.com/atom/electron/blob/master/docs/api/menu.md
const menu = new Menu()

menu.append(new MenuItem({
  label: 'Copy',
  role: 'copy'
}))

menu.append(new MenuItem({
  label: 'Select All',
  role: 'selectall'
}))

// Separator
menu.append(new MenuItem({
  type: 'separator'
}))

menu.append(new MenuItem({
  label: 'Reload',
  click: function () {
    currentWindow.reload()
  }
}))

menu.append(new MenuItem({
  type: 'separator'
}))

menu.append(new MenuItem({
  label: 'Inspect Element',
  click: function () {
    currentWindow.inspectElement(
      rightClickPosition.x,
      rightClickPosition.y
    )
  }
}))

window.addEventListener('contextmenu', function (e) {
  e.preventDefault()
  rightClickPosition = {
    x: e.x,
    y: e.y
  }
  menu.popup(currentWindow)
}, false)

Menu.setApplicationMenu(Menu.buildFromTemplate(template))
