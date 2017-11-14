/* global vmd:true */

const remote = require('electron').remote;

const url = remote.require('url');
const path = remote.require('path');
const fs = remote.require('fs');
const shell = remote.shell;
const clipboard = remote.clipboard;
const nativeImage = remote.nativeImage;
const conf = remote.getGlobal('conf');
const currentWindow = remote.getCurrentWindow();
const searchInPage = require('electron-in-page-search').default;
const renderMarkdown = require('./render-markdown');
const createMenu = require('../shared/create-menu');
const hist = require('./history')();
const zoom = require('./zoom')(conf.zoom);

const inPageSearch = searchInPage(remote.getCurrentWebContents());

hist.subscribe(() => {
  vmd.setHistoryStatus(currentWindow.id, {
    canGoBack: hist.canGoBack(),
    canGoForward: hist.canGoForward(),
  });
});

function isMarkdownPath(filePath) {
  // http://superuser.com/questions/249436/file-extension-for-markdown-files
  return [
    '.markdown',
    '.mdown',
    '.mkdn',
    '.md',
    '.mkd',
    '.mdwn',
    '.mdtxt',
    '.mdtext',
  ].indexOf(path.extname(filePath)) !== -1;
}

function getImageDataUrl(imageUrl, callback) {
  const img = new window.Image();

  img.onload = function handleImgLoaded() {
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;

    canvas.getContext('2d').drawImage(img, 0, 0);

    callback(null, canvas.toDataURL('image/png'));
  };

  img.src = imageUrl;
}

function copyImageToClipboard(imageInfo, callback) {
  if (!imageInfo) {
    if (typeof callback === 'function') {
      callback(new Error('no image info'));
      return;
    }
  }

  if (imageInfo.type === 'external') {
    getImageDataUrl(imageInfo.href, (dataUrlErr, dataUrl) => {
      if (dataUrlErr) {
        return;
      }

      try {
        clipboard.writeImage(nativeImage.createFromDataURL(dataUrl));
      } catch (clipboardWriteErr) {
        console.error(clipboardWriteErr);
      }
    });
    return;
  }

  if (imageInfo.type === 'file') {
    try {
      clipboard.writeImage(nativeImage.createFromPath(imageInfo.path));
      return;
    } catch (err) {
      console.error(err);
    }
  }
}

function scrollToHash(hash) {
  if (!hash) {
    document.body.scrollIntoView(true);
    return;
  }

  const hashName = hash.slice(1);
  const el = document.getElementById(hashName) || document.querySelector(`a[name="${hashName}"]`);

  if (el) {
    el.scrollIntoView(true);
  }
}

function navigateTo(item) {
  if (item === null) {
    return;
  }

  const currentFilePath = document.body.getAttribute('data-filepath');
  const isSameFile = !item.filePath || (currentFilePath === item.filePath);

  if (isSameFile) {
    scrollToHash(item.hash);
    return;
  }

  if (item.filePath) {
    vmd.setFilePath(currentWindow.id, item.filePath);
  }
}

function findClosestNode(nodeName, el) {
  let closestNode = el;
  for (; closestNode && closestNode !== document; closestNode = closestNode.parentNode) {
    if (closestNode.nodeName === nodeName) {
      return closestNode;
    }
  }

  return null;
}

const findClosestLink = findClosestNode.bind(null, 'A');
const findClosestImage = findClosestNode.bind(null, 'IMG');

function getLinkType(el) {
  if (!el) {
    return null;
  }

  const href = el.getAttribute('href') || el.getAttribute('src');

  if (!href) {
    return null;
  }

  const filePath = document.body.getAttribute('data-filepath');
  const parsedHref = url.parse(href);
  const hash = parsedHref.hash;
  const protocol = parsedHref.protocol;
  const pathname = parsedHref.pathname;

  if (protocol && protocol !== 'file:') {
    return {
      type: 'external',
      href,
    };
  }

  if (hash && !protocol && !pathname) {
    return {
      type: 'hash',
      path: filePath,
      hash,
    };
  }

  if (filePath && pathname) {
    try {
      const targetPath = path.resolve(path.dirname(filePath), pathname);
      const stat = fs.statSync(targetPath);

      if (stat.isFile()) {
        if (hash && filePath === targetPath) {
          return {
            type: 'hash',
            path: filePath,
            hash,
          };
        }

        if (isMarkdownPath(targetPath)) {
          return {
            type: 'markdown-file',
            path: targetPath,
          };
        }

        return {
          type: 'file',
          path: targetPath,
        };
      }

      if (stat.isDirectory()) {
        return {
          type: 'directory',
          path: targetPath,
        };
      }
    } catch (err) {
      console.error(err);
    }
  }

  return null;
}

function handleLink(ev) {
  if (ev.target === document.querySelector('.welcome-page')) {
    vmd.openFileDialog();
    return;
  }

  const link = getLinkType(findClosestLink(ev.target));

  if (!link) {
    return;
  }

  if (link.type === 'external') {
    shell.openExternal(link.href);
    return;
  }

  if (link.type === 'hash') {
    navigateTo(hist.push({
      filePath: link.path,
      hash: link.hash,
    }));
    return;
  }

  if (link.type === 'directory' || link.type === 'file') {
    shell.openItem(link.path);
    return;
  }

  if (link.type === 'markdown-file') {
    if (ev.shiftKey) {
      vmd.openFile(link.path);
      return;
    }

    navigateTo(hist.push({
      filePath: link.path,
    }));
  }
}

function updateSelection() {
  const selection = window.getSelection();

  if (selection) {
    const str = selection.toString();

    if (str) {
      vmd.setSelection(currentWindow.id, selection.toString());
      return;
    }
  }

  vmd.clearSelection(currentWindow.id);
}

vmd.onPrintAction(() => {
  window.print();
});

vmd.onFindAction(() => {
  inPageSearch.openSearchWindow();
});

vmd.onZoomInAction(zoom.zoomIn.bind(zoom));
vmd.onZoomOutAction(zoom.zoomOut.bind(zoom));
vmd.onZoomResetAction(zoom.reset.bind(zoom));

vmd.onHistoryBackAction(() => {
  navigateTo(hist.back());
});

vmd.onHistoryForwardAction(() => {
  navigateTo(hist.forward());
});

vmd.onContent((ev, data) => {
  const body = document.body;
  const pageContent = document.querySelector('.page-content');
  const base = document.querySelector('base');

  if (data.filePath) {
    body.setAttribute('data-filepath', data.filePath);

    if (hist.current() === null) {
      hist.push({ filePath: data.filePath });
    }
  } else {
    hist.push({ hash: '' });
  }

  if (data.baseUrl) {
    base.setAttribute('href', data.baseUrl);
  }

  if (data.isHTML) {
    pageContent.innerHTML = data.contents;
  } else {
    let mdBody = document.querySelector('.markdown-body');

    if (!mdBody) {
      pageContent.innerHTML = '<div class="markdown-body"></div>';
      mdBody = document.querySelector('.markdown-body');
    }

    renderMarkdown(data.contents, conf, (err, file) => {
      if (err) {
        console.error(err);
      }
      mdBody.innerHTML = String(file);
    });
  }
});

window.addEventListener('click', (ev) => {
  ev.preventDefault();
  handleLink(ev);
});

window.addEventListener('keydown', (ev) => {
  const esc = ev.keyCode === 27;

  if (esc) currentWindow.close();
});

window.addEventListener('mouseup', () => {
  updateSelection();
});

window.addEventListener('keyup', () => {
  updateSelection();
});

document.addEventListener('drop', (ev) => {
  ev.preventDefault();
  ev.stopPropagation();

  const filePath = ev.dataTransfer.files.length && ev.dataTransfer.files[0].path;

  if (!filePath || !isMarkdownPath(filePath)) {
    return;
  }

  if (ev.shiftKey) {
    vmd.openFile(filePath);
    return;
  }

  vmd.setFilePath(currentWindow.id, filePath);
});

document.addEventListener('dragover', (ev) => {
  ev.preventDefault();
  ev.stopPropagation();
});

document.addEventListener('dragenter', (ev) => {
  ev.preventDefault();
  ev.stopPropagation();
  if (ev.toElement !== document.body) {
    return;
  }
  document.body.setAttribute('data-isDragging', true);
});

document.addEventListener('dragleave', (ev) => {
  ev.preventDefault();
  ev.stopPropagation();
  if (ev.x === 0 && ev.y === 0) {
    document.body.setAttribute('data-isDragging', false);
  }
});

setInterval(() => {
  updateSelection();
}, 1000);

function addContextMenu() {
  const template = [
    {
      label: 'Open folder',
      click(model) {
        if (model.link) {
          shell.openItem(model.link.path);
        }
      },
      visible(model) {
        return model.link && model.link.type === 'directory';
      },
    },
    {
      label: 'Open file',
      click(model) {
        if (model.link && model.link.type === 'file') {
          shell.openItem(model.link.path);
        }

        if (model.link && model.link.type === 'markdown-file') {
          navigateTo(hist.push({
            filePath: model.link.path,
          }));
        }
      },
      visible(model) {
        return model.link && (model.link.type === 'file' || model.link.type === 'markdown-file');
      },
    },
    {
      label: 'Open image',
      click(model) {
        if (model.img) {
          shell.openItem(model.img.path);
        }
      },
      visible(model) {
        return model.img && model.img.type === 'file';
      },
    },
    {
      label: 'Open file in new window',
      click(model) {
        if (model.link) {
          vmd.openFile(model.link.path);
        }
      },
      visible(model) {
        return model.link && model.link.type === 'markdown-file';
      },
    },
    {
      label: 'Scroll to anchor',
      click(model) {
        if (model.link) {
          navigateTo(hist.push({
            filePath: model.link.path,
            hash: model.link.hash,
          }));
        }
      },
      visible(model) {
        return model.link && model.link.type === 'hash';
      },
    },
    {
      label: 'Open link',
      click(model) {
        if (model.link) {
          shell.openExternal(model.link.href);
        }
      },
      visible(model) {
        return model.link && model.link.type === 'external';
      },
    },
    {
      type: 'separator',
      visible(model) {
        return !!model.link;
      },
    },
    {
      label: 'Copy',
      role: 'copy',
      visible(model) {
        return !!model.selection;
      },
    },
    {
      label: 'Copy link address',
      click(model) {
        if (model.link) {
          clipboard.writeText(model.link.href);
        }
      },
      visible(model) {
        return model.link && model.link.type === 'external';
      },
    },
    {
      label: 'Copy image address',
      click(model) {
        if (model.img) {
          clipboard.writeText(model.img.href);
        }
      },
      visible(model) {
        return model.img && model.img.type === 'external';
      },
    },
    {
      label: 'Copy path',
      click(model) {
        if (model.link) {
          clipboard.writeText(model.link.path);
        }
      },
      visible(model) {
        const types = [
          'directory',
          'file',
          'markdown-file',
        ];
        return model.link && types.indexOf(model.link.type) !== -1;
      },
    },
    {
      label: 'Copy image path',
      click(model) {
        if (model.img) {
          clipboard.writeText(model.img.path);
        }
      },
      visible(model) {
        return model.img && model.img.type === 'file';
      },
    },
    {
      label: 'Copy image',
      click(model) {
        if (model.img) {
          copyImageToClipboard(model.img);
        }
      },
      visible(model) {
        return !!model.img;
      },
    },
    {
      label: 'Select All',
      role: 'selectall',
    },
    {
      type: 'separator',
    },
    {
      label: 'Inspect Element',
      click(model, item, win) {
        if (win) {
          win.inspectElement(model.x, model.y);
        }
      },
    },
  ];

  const contextMenu = createMenu(template, {});

  window.addEventListener('contextmenu', (ev) => {
    ev.preventDefault();

    const selection = window.getSelection();
    const selectionText = selection && selection.toString();

    const el = document.elementFromPoint(ev.x, ev.y) || null;

    contextMenu.update({
      x: ev.x,
      y: ev.y,
      selection: selectionText,
      element: el,
      link: getLinkType(findClosestLink(el)),
      img: getLinkType(findClosestImage(el)),
    });

    contextMenu.getMenu().popup(currentWindow);
  }, false);
}

addContextMenu();
