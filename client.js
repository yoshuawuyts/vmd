const highlightjs = require('highlight.js')
const marked = require('marked')
const remote = require('remote')
const ipc = require('ipc')

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

// menu
var template = [
  {
    label: 'vmd',
    submenu: [
      { label: 'About vmd', selector: 'orderFrontStandardAboutPanel:' },
      { type: 'separator' },
      { label: 'Services', submenu: [] },
      { type: 'separator' },
      { label: 'Hide vmd', accelerator: 'Command+H', selector: 'hide:' },
      { label: 'Hide Others', accelerator: 'Command+Shift+H', selector: 'hideOtherApplications:' },
      { label: 'Show All', selector: 'unhideAllApplications:' },
      { type: 'separator' },
      { label: 'Quit', accelerator: 'Command+Q', click: function () { remote.require('app').quit() } }
    ]
  },
  { label: 'File',
    submenu: [
      { label: 'Print', accelerator: 'Command+P', click: function () { window.print() } }
    ]
  }
]

var Menu = remote.require('menu')
Menu.setApplicationMenu(Menu.buildFromTemplate(template))
