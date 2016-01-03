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
const clipboard = remote.clipboard
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

function inspectLink (el) {
  if (!el || el.nodeName !== 'A') {
    return null
  }

  const filePath = document.body.getAttribute('data-filepath')
  const href = el.getAttribute('href')
  const parsedHref = url.parse(href)
  const hash = parsedHref.hash
  const protocol = el.protocol
  const pathname = el.pathname

  if (/^(http(s)?|mailto):$/.test(protocol)) {
    return {
      type: 'external',
      href: el.href
    }
  }

  if (hash && !parsedHref.protocol && !parsedHref.pathname) {
    return {
      type: 'hash',
      path: filePath,
      hash: hash
    }
  }

  if (filePath) {
    try {
      const stat = fs.statSync(pathname)

      if (stat.isFile()) {
        if (hash && filePath === pathname) {
          return {
            type: 'hash',
            path: filePath,
            hash: hash
          }
        }

        if (isMarkdownPath(pathname)) {
          return {
            type: 'markdown-file',
            path: pathname
          }
        }

        return {
          type: 'file',
          path: pathname
        }
      }

      if (stat.isDirectory()) {
        return {
          type: 'directory',
          path: pathname
        }
      }
    } catch (ex) {
      console.log(ex)
    }
  }

  if (/^[a-z0-9-_]+:/g.test(href)) {
    return {
      type: 'external',
      href: el.href
    }
  }

  return null
}

function handleLink (ev) {
  var link = inspectLink(ev.target)

  if (!link) {
    return
  }

  if (link.type === 'external') {
    return shell.openExternal(link.href)
  }

  if (link.type === 'hash') {
    return navigateTo(hist.push({
      filePath: link.path,
      hash: link.hash
    }))
  }

  if (link.type === 'directory' || link.type === 'file') {
    return shell.openItem(link.path)
  }

  if (link.type === 'markdown-file') {
    if (ev.shiftKey) {
      return vmd.openFile(link.path)
    }

    return navigateTo(hist.push({
      filePath: link.path
    }))
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
        label: 'Open folder',
        click: function () {
          var link = inspectLink(contextMenu.getElement())
          return link && shell.openItem(link.path)
        }
      }),
      visible: function (item) {
        var link = inspectLink(contextMenu.getElement())
        return link && link.type === 'directory'
      }
    },
    {
      item: new MenuItem({
        label: 'Open file',
        click: function () {
          var link = inspectLink(contextMenu.getElement())

          if (link && link.type === 'file') {
            return link && shell.openItem(link.path)
          }

          if (link && link.type === 'markdown-file') {
            return navigateTo(hist.push({
              filePath: link.path
            }))
          }
        }
      }),
      visible: function (item) {
        var link = inspectLink(contextMenu.getElement())
        return link && (link.type === 'file' || link.type === 'markdown-file')
      }
    },
    {
      item: new MenuItem({
        label: 'Open file in new window',
        click: function () {
          var link = inspectLink(contextMenu.getElement())
          return link && vmd.openFile(link.path)
        }
      }),
      visible: function (item) {
        var link = inspectLink(contextMenu.getElement())
        return link && link.type === 'markdown-file'
      }
    },
    {
      item: new MenuItem({
        label: 'Scroll to anchor',
        click: function () {
          var link = inspectLink(contextMenu.getElement())
          return link && navigateTo(hist.push({
            filePath: link.path,
            hash: link.hash
          }))
        }
      }),
      visible: function (item) {
        var link = inspectLink(contextMenu.getElement())
        return link && link.type === 'hash'
      }
    },
    {
      item: new MenuItem({
        label: 'Open link',
        click: function () {
          var link = inspectLink(contextMenu.getElement())
          return link && shell.openExternal(link.href)
        }
      }),
      visible: function (item) {
        var link = inspectLink(contextMenu.getElement())
        return link && link.type === 'external'
      }
    },
    {
      item: new MenuItem({
        type: 'separator'
      }),
      visible: function (item) {
        var link = inspectLink(contextMenu.getElement())
        return link !== null
      }
    },
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
        label: 'Copy link location',
        click: function () {
          var link = inspectLink(contextMenu.getElement())
          return link && clipboard.writeText(link.href)
        }
      }),
      visible: function (item) {
        var link = inspectLink(contextMenu.getElement())
        return link && link.type === 'external'
      }
    },
    {
      item: new MenuItem({
        label: 'Copy path',
        click: function () {
          var link = inspectLink(contextMenu.getElement())
          return link && clipboard.writeText(link.path)
        }
      }),
      visible: function (item) {
        var link = inspectLink(contextMenu.getElement())
        var types = [
          'directory',
          'file',
          'markdown-file'
        ]
        return link && types.indexOf(link.type) !== -1
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

  getElement: function () {
    if (!contextMenu.position) { return null }
    return document.elementFromPoint(contextMenu.position.x, contextMenu.position.y) || null
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
