const highlightjs = require('highlight.js')
const marked = require('marked')
const remote = require('remote')
const ipc = require('ipc')
const conf = remote.getGlobal('conf')

marked.setOptions({
  highlight: function (code, lang) {
    return highlightjs.highlightAuto(code, [ lang ]).value
  }
})

ipc.on('md', function (raw) {
  const md = marked(raw)
  const base = document.querySelector('base')
  const body = document.querySelector('.markdown-body')
  base.setAttribute('href', remote.getGlobal('baseUrl'))
  body.innerHTML = md
})

window.addEventListener('keydown', function (ev) {
  if (ev.keyCode === 27) remote.getCurrentWindow().close()
})

var zoom = require('./zoom')(conf.zoom)

// menu
var vmdSubmenu = [
  { label: 'Quit', accelerator: 'CmdOrCtrl+Q', click: function () { remote.require('app').quit() } }
]

if (process.platform === 'darwin') {
  vmdSubmenu = [
    { label: 'About vmd', selector: 'orderFrontStandardAboutPanel:' },
    { type: 'separator' }
  ].concat(vmdSubmenu)
}

var template = [
  {
    label: 'vmd',
    submenu: vmdSubmenu
  },
  {
    label: 'File',
    submenu: [
      { label: 'Print', accelerator: 'CmdOrCtrl+P', click: function () { window.print() } }
    ]
  },
  {
    label: 'View',
    submenu: [
      { label: 'Zoom In', accelerator: 'CmdOrCtrl+Plus', click: function () { zoom.zoomIn() } },
      { label: 'Zoom Out', accelerator: 'CmdOrCtrl+-', click: function () { zoom.zoomOut() } },
      { label: 'Reset Zoom', accelerator: 'CmdOrCtrl+0', click: function () { zoom.reset() } }
    ]
  }
]

var Menu = remote.require('menu')
Menu.setApplicationMenu(Menu.buildFromTemplate(template))
