/*global vmd:true*/

const highlightjs = require('highlight.js')
const marked = require('marked')
const remote = require('electron').remote
const url = remote.require('url')
const path = remote.require('path')
const fs = remote.require('fs')
const shell = remote.shell
const Menu = remote.Menu
const MenuItem = remote.MenuItem
const conf = remote.getGlobal('conf')
const currentWindow = remote.getCurrentWindow()
const hist = require('./history')()
const zoom = require('./zoom')(conf.zoom)

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
    vmd.changeFile(item.filePath)
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
            return vmd.openFile(pathname)
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

  if (/^[a-z0-9-_]+:/g.test(href)) {
    try {
      shell.openExternal(ev.target.href)
    } catch (ex) {
      console.log(ex)
    }
  }
}

marked.setOptions({
  highlight: function (code, lang) {
    return highlightjs.highlightAuto(code, [lang]).value
  }
})

vmd.onPrintAction(function () {
  window.print()
})

vmd.onZoomInAction(zoom.zoomIn.bind(zoom))
vmd.onZoomOutAction(zoom.zoomOut.bind(zoom))
vmd.onZoomResetAction(zoom.reset.bind(zoom))

vmd.onHistoryBackAction(function () {
  navigateTo(hist.back())
})

vmd.onHistoryForwardAction(function () {
  navigateTo(hist.forward())
})

vmd.onContent(function (ev, data) {
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

  if (esc) currentWindow.close()
})

const contextMenu = {
  items: [
    {
      item: new MenuItem({
        label: 'Copy',
        role: 'copy'
      }),
      visible: function (item) {
        var selection = window.getSelection()
        return selection && selection.toString() !== ''
      }
    },
    {
      item: new MenuItem({
        label: 'Select All',
        role: 'selectall'
      })
    },
    {
      item: new MenuItem({
        type: 'separator'
      })
    },
    {
      item: new MenuItem({
        label: 'Reload',
        click: function () {
          currentWindow.reload()
        }
      })
    },
    {
      item: new MenuItem({
        type: 'separator'
      })
    },
    {
      item: new MenuItem({
        label: 'Inspect Element',
        click: function () {
          currentWindow.inspectElement(
            contextMenu.position.x,
            contextMenu.position.y
          )
        }
      })
    }
  ],

  init: function () {
    contextMenu.menu = new Menu()

    contextMenu.items.forEach(function (item) {
      contextMenu.menu.append(item.item)
    })

    contextMenu.update()
  },

  update: function (ev) {
    if (ev) {
      contextMenu.position = {
        x: ev.x,
        y: ev.y
      }
    }

    contextMenu.items.forEach(function (item) {
      if (typeof item.visible === 'function') {
        item.item.visible = item.visible(item, ev)
      }

      if (typeof item.enabled === 'function') {
        item.item.enabled = item.enabled(item, ev)
      }
    })
  },

  show: function (ev) {
    contextMenu.update(ev)
    contextMenu.menu.popup(currentWindow)
  }
}

contextMenu.init()

window.addEventListener('contextmenu', function (ev) {
  ev.preventDefault()
  contextMenu.show(ev)
}, false)
