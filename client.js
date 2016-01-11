/*global vmd:true*/

const remote = require('electron').remote
const url = remote.require('url')
const path = remote.require('path')
const fs = remote.require('fs')
const shell = remote.shell
const clipboard = remote.clipboard
const nativeImage = remote.nativeImage
const conf = remote.getGlobal('conf')
const currentWindow = remote.getCurrentWindow()
const renderMarkdown = require('./render-markdown')
const createMenu = require('./create-menu')
const hist = require('./history')()
const zoom = require('./zoom')(conf.zoom)

hist.subscribe(function () {
  vmd.setHistoryStatus(currentWindow.id, {
    canGoBack: hist.canGoBack(),
    canGoForward: hist.canGoForward()
  })
})

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

function getImageDataUrl (imageUrl, callback) {
  var img = new window.Image()

  img.onload = function () {
    var canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight

    canvas.getContext('2d').drawImage(img, 0, 0)

    callback(null, canvas.toDataURL('image/png'))
  }

  img.src = imageUrl
}

function copyImageToClipboard (imageInfo, callback) {
  if (!imageInfo) {
    if (typeof callback === 'function') {
      return callback(new Error('no image info'))
    }
  }

  if (imageInfo.type === 'external') {
    return getImageDataUrl(imageInfo.href, function (err, dataUrl) {
      if (err) {
        return
      }

      try {
        clipboard.writeImage(nativeImage.createFromDataURL(dataUrl))
      } catch (ex) {
        console.log(ex)
      }
    })
  }

  if (imageInfo.type === 'file') {
    try {
      return clipboard.writeImage(nativeImage.createFromPath(imageInfo.path))
    } catch (ex) {
      console.log(ex)
    }
  }
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
    vmd.setFilePath(currentWindow.id, item.filePath)
  }
}

function findClosestNode (nodeName, el) {
  for (; el && el !== document; el = el.parentNode) {
    if (el.nodeName === nodeName) {
      return el
    }
  }

  return null
}

const findClosestLink = findClosestNode.bind(null, 'A')
const findClosestImage = findClosestNode.bind(null, 'IMG')

function getLinkType (el) {
  if (!el) {
    return null
  }

  const href = el.getAttribute('href') || el.getAttribute('src')

  if (!href) {
    return null
  }

  const filePath = document.body.getAttribute('data-filepath')
  const parsedHref = url.parse(href)
  const hash = parsedHref.hash
  const protocol = parsedHref.protocol
  const pathname = parsedHref.pathname

  if (protocol && protocol !== 'file:') {
    return {
      type: 'external',
      href: href
    }
  }

  if (hash && !protocol && !pathname) {
    return {
      type: 'hash',
      path: filePath,
      hash: hash
    }
  }

  if (filePath && pathname) {
    try {
      const targetPath = path.resolve(path.dirname(filePath), pathname)
      const stat = fs.statSync(targetPath)

      if (stat.isFile()) {
        if (hash && filePath === targetPath) {
          return {
            type: 'hash',
            path: filePath,
            hash: hash
          }
        }

        if (isMarkdownPath(targetPath)) {
          return {
            type: 'markdown-file',
            path: targetPath
          }
        }

        return {
          type: 'file',
          path: targetPath
        }
      }

      if (stat.isDirectory()) {
        return {
          type: 'directory',
          path: targetPath
        }
      }
    } catch (ex) {
      console.log(ex)
    }
  }

  return null
}

function handleLink (ev) {
  var link = getLinkType(findClosestLink(ev.target))

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

function updateSelection () {
  var selection = window.getSelection()

  if (selection) {
    var str = selection.toString()

    if (str) {
      return vmd.setSelection(currentWindow.id, selection.toString())
    }
  }

  vmd.clearSelection(currentWindow.id)
}

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
  const md = renderMarkdown(data.contents)
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
  ev.preventDefault()
  handleLink(ev)
})

window.addEventListener('keydown', function (ev) {
  var esc = ev.keyCode === 27

  if (esc) currentWindow.close()
})

window.addEventListener('mouseup', function (ev) {
  updateSelection()
})

window.addEventListener('keyup', function (ev) {
  updateSelection()
})

setInterval(function () {
  updateSelection()
}, 1000)

function addContextMenu () {
  var template = [
    {
      label: 'Open folder',
      click: function (model) {
        return model.link && shell.openItem(model.link.path)
      },
      visible: function (model) {
        return model.link && model.link.type === 'directory'
      }
    },
    {
      label: 'Open file',
      click: function (model) {
        if (model.link && model.link.type === 'file') {
          return model.link && shell.openItem(model.link.path)
        }

        if (model.link && model.link.type === 'markdown-file') {
          return navigateTo(hist.push({
            filePath: model.link.path
          }))
        }
      },
      visible: function (model) {
        return model.link && (model.link.type === 'file' || model.link.type === 'markdown-file')
      }
    },
    {
      label: 'Open image',
      click: function (model) {
        return model.img && shell.openItem(model.img.path)
      },
      visible: function (model) {
        return model.img && model.img.type === 'file'
      }
    },
    {
      label: 'Open file in new window',
      click: function (model) {
        return model.link && vmd.openFile(model.link.path)
      },
      visible: function (model) {
        return model.link && model.link.type === 'markdown-file'
      }
    },
    {
      label: 'Scroll to anchor',
      click: function (model) {
        return model.link && navigateTo(hist.push({
          filePath: model.link.path,
          hash: model.link.hash
        }))
      },
      visible: function (model) {
        return model.link && model.link.type === 'hash'
      }
    },
    {
      label: 'Open link',
      click: function (model) {
        return model.link && shell.openExternal(model.link.href)
      },
      visible: function (model) {
        return model.link && model.link.type === 'external'
      }
    },
    {
      type: 'separator',
      visible: function (model) {
        return !!model.link
      }
    },
    {
      label: 'Copy',
      role: 'copy',
      visible: function (model) {
        return !!model.selection
      }
    },
    {
      label: 'Copy link address',
      click: function (model) {
        return model.link && clipboard.writeText(model.link.href)
      },
      visible: function (model) {
        return model.link && model.link.type === 'external'
      }
    },
    {
      label: 'Copy image address',
      click: function (model) {
        return model.img && clipboard.writeText(model.img.href)
      },
      visible: function (model) {
        return model.img && model.img.type === 'external'
      }
    },
    {
      label: 'Copy path',
      click: function (model) {
        return model.link && clipboard.writeText(model.link.path)
      },
      visible: function (model) {
        var types = [
          'directory',
          'file',
          'markdown-file'
        ]
        return model.link && types.indexOf(model.link.type) !== -1
      }
    },
    {
      label: 'Copy image path',
      click: function (model) {
        return model.img && clipboard.writeText(model.img.path)
      },
      visible: function (model) {
        return model.img && model.img.type === 'file'
      }
    },
    {
      label: 'Copy image',
      click: function (model) {
        return model.img && copyImageToClipboard(model.img)
      },
      visible: function (model) {
        return !!model.img
      }
    },
    {
      label: 'Select All',
      role: 'selectall'
    },
    {
      type: 'separator'
    },
    {
      label: 'Inspect Element',
      click: function (model, item, win) {
        win && win.inspectElement(model.x, model.y)
      }
    }
  ]

  var contextMenu = createMenu(template, {})

  window.addEventListener('contextmenu', function (ev) {
    ev.preventDefault()

    var selection = window.getSelection()
    var selectionText = selection && selection.toString()

    var el = document.elementFromPoint(ev.x, ev.y) || null

    contextMenu.update({
      x: ev.x,
      y: ev.y,
      selection: selectionText,
      element: el,
      link: getLinkType(findClosestLink(el)),
      img: getLinkType(findClosestImage(el))
    })

    contextMenu.getMenu().popup(currentWindow)
  }, false)
}

addContextMenu()
