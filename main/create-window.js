const path = require('path');
const fs = require('fs');
const {
  BrowserWindow,
  ipcMain,
  protocol,
} = require('electron');
const template = require('lodash.template');
const chokidar = require('chokidar');
const assign = require('object-assign');
const sharedState = require('../shared/shared-state');
const styles = require('./styles');
const windowStateKeeper = require('electron-window-state');

const defaultOptions = {
  width: 800,
  height: 600,
  x: undefined,
  y: undefined,
};

module.exports = function createWindow(options) {
  let mainWindowState;
  let windowOptions;
  const preservestate = options.window.preservestate && options.window.preservestate !== 'false';
  const autoHideMenuBar = options.window.autohidemenubar && options.window.autohidemenubar !== 'false';

  if (preservestate) {
    mainWindowState = windowStateKeeper({
      file: 'vmd-window-state.json',
      defaultWidth: defaultOptions.width,
      defaultHeight: defaultOptions.height,
    });
    windowOptions = assign({}, defaultOptions, mainWindowState, options);
  } else {
    windowOptions = assign({}, defaultOptions, options);
  }

  const fromFile = typeof windowOptions.filePath !== 'undefined';
  let watcher;

  const preloadPath = path.resolve(__dirname, 'client-api.js');

  let win = new BrowserWindow({
    webPreferences: {
      preload: preloadPath,
    },
    icon: path.join(__dirname, 'assets/app-icon/png/512.png'),
    width: windowOptions.width,
    height: windowOptions.height,
    x: windowOptions.x,
    y: windowOptions.y,
    autoHideMenuBar,
  });

  function updateTitle() {
    const prefix =
      windowOptions.title ||
      (fromFile && (path.basename(windowOptions.filePath)));

    win.setTitle(prefix ? `${prefix} - vmd` : 'vmd');

    // (OS X) Set represented filename (icon in title bar)
    if (fromFile && process.platform === 'darwin') {
      win.setRepresentedFilename(path.resolve(windowOptions.filePath));
    }
  }

  function onOpenFile(ev, filePath) {
    if (ev.sender === win.webContents) {
      createWindow(assign({}, windowOptions, {
        filePath,
      }));
    }
  }

  function onClose() {
    if (watcher) {
      watcher.close();
    }

    ipcMain.removeListener('open-file', onOpenFile);
  }

  function sendMarkdown() {
    const resolved = fromFile
      ? path.resolve(path.dirname(windowOptions.filePath))
      : process.cwd();

    let baseUrl = path.relative(__dirname, resolved);
    if (baseUrl) baseUrl += '/';

    if (win) {
      const contents = fromFile
        ? fs.readFileSync(windowOptions.filePath, { encoding: 'utf8' })
        : windowOptions.contents;

      win.webContents.send('md', {
        filePath: windowOptions.filePath,
        baseUrl,
        contents,
      });
    }
  }

  function changeFile(filePath) {
    if (watcher) {
      watcher.unwatch(windowOptions.filePath);
      watcher.add(filePath);
    }

    windowOptions.filePath = filePath;
    updateTitle();
    sendMarkdown();
  }

  function temporarilyInterceptFileProtocol() {
    // very hacky way to dynamically create vmd.html
    const indexHtml = template(fs.readFileSync(path.join(__dirname, '..', 'renderer', 'vmd.html'), { encoding: 'utf-8' }));

    protocol.interceptStringProtocol(
      'file',
      (req, callback) => {
        const mainStyle = windowOptions.mainStylesheet
          ? styles.getStylesheet(windowOptions.mainStylesheet)
          : styles.getStylesheet(require.resolve('github-markdown-css'));

        const extraStyle = windowOptions.extraStylesheet
          ? styles.getStylesheet(windowOptions.extraStylesheet)
          : '';

        const highlightStyle = windowOptions.highlightStylesheet
          ? styles.getStylesheet(windowOptions.highlightStylesheet)
          : `${styles.getHighlightTheme('default')}\n${styles.getHighlightTheme(windowOptions.highlightTheme)}`;

        const data = {
          mainStyle,
          extraStyle,
          highlightStyle,
        };
        // eslint-disable-next-line standard/no-callback-literal
        callback({
          mimeType: 'text/html',
          data: indexHtml(data),
        });

        process.nextTick(() => {
          protocol.uninterceptProtocol('file');
        });
      },
      (err, scheme) => {
        if (err) {
          console.error('failed to register', scheme, 'protocol');
        }
      },
    );
  }

  updateTitle();

  temporarilyInterceptFileProtocol();
  win.loadURL(`file://${path.join(__dirname, '/../renderer/vmd.html')}`);
  win.on('close', onClose);
  win.webContents.on('did-finish-load', sendMarkdown);

  win.on('closed', () => {
    win = null;
  });

  win.on('focus', () => {
    sharedState.setFocusedWindow(win.id);
  });

  if (win.isFocused()) {
    sharedState.setFocusedWindow(win.id);
  }

  if (preservestate) {
    mainWindowState.manage(win);
  }

  if (windowOptions.devTools) {
    win.openDevTools();
  }

  if (fromFile) {
    watcher = chokidar.watch(windowOptions.filePath, { usePolling: true });
    watcher.on('change', sendMarkdown);
  }

  ipcMain.on('open-file', onOpenFile);

  sharedState.subscribe(() => {
    if (!win) {
      return;
    }

    const state = sharedState.getWindowState(win.id);

    if (state && state.filePath && state.filePath !== windowOptions.filePath) {
      changeFile(state.filePath);
    }
  });

  return {
    win,
    changeFile,
  };
};
