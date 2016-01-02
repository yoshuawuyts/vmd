const highlightjs = require('highlight.js')
const marked = require('marked')
const remote = require('electron').remote
const url = remote.require('url')
const path = remote.require('path')
const fs = remote.require('fs')
const app = remote.app
const shell = remote.shell
const Menu = remote.Menu
const MenuItem = remote.MenuItem
const ipc = require('electron').ipcRenderer
const conf = remote.getGlobal('conf')
const currentWindow = remote.getCurrentWindow()
const hist = require('./history')()

var rightClickPosition = null

function isMarkdownPath (filePath) {
  // http://superuser.com/questions/249436/file-extension-for-markdown-files
  return [
    '.markdown',
    '.mdown',
    '.mkdn',
    '.md',
    '.mkd',
    '.mdwn',
    '.mdtxt',
    '.mdtext'
  ].indexOf(path.extname(filePath)) !== -1
}

function scrollToHash (hash) {
  if (!hash) {
    return document.body.scrollIntoView(true)
  }

  hash = hash.slice(1)
  var el = document.getElementById(hash) || document.querySelector('a[name="' + hash + '"]')

  if (el) {
    el.scrollIntoView(true)
  }
}

function changeFile (filePath) {
  ipc.send('change-file', filePath)
}

function openFile (filePath) {
  ipc.send('open-file', filePath)
}

function navigateTo (item) {
  if (item === null) {
    return
  }

  const currentFilePath = document.body.getAttribute('data-filepath')
  const isSameFile = !item.filePath || (currentFilePath === item.filePath)

  if (isSameFile) {
    return scrollToHash(item.hash)
  }

  if (item.filePath) {
    changeFile(item.filePath)
  }
}

function handleLink (ev) {
  const filePath = document.body.getAttribute('data-filepath')
  const href = ev.target.getAttribute('href')
  const parsedHref = url.parse(href)
  const hash = parsedHref.hash
  const protocol = ev.target.protocol
  const pathname = ev.target.pathname

  if (/^(http(s)?|mailto):$/.test(protocol)) {
    return shell.openExternal(ev.target.href)
  }

  if (hash && !parsedHref.protocol && !parsedHref.pathname) {
    return navigateTo(hist.push({
      filePath: filePath,
      hash: hash
    }))
  }

  if (filePath) {
    try {
      const stat = fs.statSync(pathname)

      if (stat.isFile()) {
        if (hash && filePath === pathname) {
          return navigateTo(hist.push({
            filePath: filePath,
            hash: hash
          }))
        }

        if (isMarkdownPath(pathname)) {
          if (ev.shiftKey) {
            return openFile(pathname)
          }

          return navigateTo(hist.push({
            filePath: pathname
          }))
        }

        return shell.openItem(pathname)
      }

      if (stat.isDirectory()) {
        return shell.openItem(pathname)
      }
    } catch (ex) {
      console.log(ex)
    }
  }

  shell.openExternal(ev.target.href)
}

marked.setOptions({
  highlight: function (code, lang) {
    return highlightjs.highlightAuto(code, [lang]).value
  }
})

ipc.on('md', function (ev, data) {
  const md = marked(data.contents)
  const body = document.body
  const base = document.querySelector('base')
  const mdBody = document.querySelector('.markdown-body')

  if (data.filePath) {
    body.setAttribute('data-filepath', data.filePath)

    if (hist.current() === null) {
      hist.push({ filePath: data.filePath })
    }
  } else {
    hist.push({ hash: '' })
  }

  if (data.baseUrl) {
    base.setAttribute('href', data.baseUrl)
  }

  mdBody.innerHTML = md
})

window.addEventListener('click', function (ev) {
  if (ev.target.nodeName === 'A') {
    ev.preventDefault()
    handleLink(ev)
  }
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
    label: 'History',
    submenu: [
      {
        label: 'Back',
        accelerator: 'Alt+Left',
        click: function () {
          navigateTo(hist.back())
        }
      },
      {
        label: 'Forward',
        accelerator: 'Alt+Right',
        click: function () {
          navigateTo(hist.forward())
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
