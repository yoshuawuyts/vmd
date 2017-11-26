/* eslint-disable no-use-before-define */

const fs = require('fs');
const path = require('path');
const url = require('url');
const {
  app,
  dialog,
  protocol,
  shell,
  Menu,
} = require('electron');
const getStdin = require('get-stdin');
const pkg = require('../package.json');
const createWindow = require('./create-window');
const conf = require('./config');
const styles = require('./styles');
const sharedState = require('../shared/shared-state');
const createMenu = require('../shared/create-menu');

global.conf = conf;

const markdownExtensions = ['markdown', 'mdown', 'mkdn', 'md', 'mkd', 'mdwn', 'mdtxt', 'mdtext'];
const defaultFilePath = path.join(__dirname, '..', 'renderer', 'default.html');

if (conf.help) {
  console.log(fs.readFileSync(path.join(__dirname, '..', 'usage.txt'), 'utf-8'));
  app.exit(0);
}

if (conf.version) {
  console.log(pkg.version);
  app.exit(0);
}

if (conf.versions) {
  console.log('vmd:      ', pkg.version);
  console.log('electron: ', process.versions.electron);
  console.log('node:     ', process.versions.node);
  console.log('chrome:   ', process.versions.chrome);
  console.log('v8:       ', process.versions.v8);
  console.log('openssl:  ', process.versions.openssl);
  console.log('zlib:     ', process.versions.zlib);
  app.exit(0);
}

if (conf.get('list.highlight.themes')) {
  console.log('Available highlight.js themes:');
  styles.getHighlightThemes()
    .forEach((name) => {
      console.log(` - ${name}`);
    });
  app.exit(0);
}

let filePath = conf._[0] || (process.stdin.isTTY ? conf.document : null);
const fromFile = !!filePath;

if (fromFile) {
  try {
    let stat = fs.statSync(path.resolve(filePath));

    if (stat.isDirectory()) {
      filePath = path.resolve(filePath, conf.document);
      stat = fs.statSync(filePath);
    }

    if (stat.isDirectory()) {
      console.error('Cannot open', `${filePath}: is a directory`);
      app.exit(1);
    }
  } catch (ex) {
    if (ex.code === 'ENOENT') {
      // use default window since no file was provided
      filePath = defaultFilePath;
    } else {
      console.error('Cannot open', `${filePath}:`, ex.message);
      app.exit(1);
    }
  }
}

function createWindowOptions(loadFromFile, fileOrContent) {
  const windowOptions = {
    devTools: conf.devtools,
    title: conf.title,
    window: conf.window,
    mainStylesheet: conf.get('styles.main'),
    extraStylesheet: conf.get('styles.extra'),
    highlightTheme: conf.get('highlight.theme'),
    highlightStylesheet: conf.get('highlight.stylesheet'),
    handlers: {
      openFileDialog: (win) => {
        openFileDialog(win);
      },
    },
  };

  if (loadFromFile) {
    windowOptions.filePath = fileOrContent;
  } else {
    windowOptions.contents = fileOrContent;
  }

  return windowOptions;
}

function openFileInReader(win, file, openInNewWindow) {
  if (!openInNewWindow) {
    sharedState.setFilePath(win.id, file);
    return;
  }

  createWindow(createWindowOptions(true, file));
}

function openFileDialog(win, openInNewWindow) {
  const dialogOptions = {
    title: 'Select markdown file',
    properties: ['openFile'],
    filters: [
      {
        name: 'Markdown',
        extensions: markdownExtensions,
      },
      {
        name: 'All files',
        extensions: ['*'],
      },
    ],
  };

  if (win) {
    dialog.showOpenDialog(win, dialogOptions, (filePaths) => {
      if (!Array.isArray(filePaths) || !filePaths.length) {
        return;
      }

      openFileInReader(win, filePaths[0], openInNewWindow);
    });
  }
}

function openAboutDialog(win) {
  const readmePath = path.resolve(__dirname, '..', 'README.md');
  openFileInReader(win, readmePath, true);
}

function registerEmojiProtocol() {
  const emojiPath = path.resolve(path.dirname(require.resolve('emojify.js')), '..', 'images', 'basic');

  protocol.registerFileProtocol(
    'emoji',
    (req, callback) => {
      const emoji = url.parse(req.url).hostname;
      // eslint-disable-next-line standard/no-callback-literal
      callback({
        path: path.join(emojiPath, `${emoji}.png`),
      });
    },
    (err) => {
      if (err) {
        console.error('failed to register protocol');
      }
    },
  );
}

function addApplicationMenu() {
  function menuLabel(label) {
    if (process.platform === 'darwin') {
      return label.replace('&', '');
    }
    return label;
  }
  const template = [];

  if (process.platform === 'darwin') {
    template.push({
      label: 'vmd',
      submenu: [
        {
          label: 'About vmd',
          click() {
            openAboutDialog();
          },
        },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideothers' },
        { role: 'unhide' },
        { type: 'separator' },
        {
          label: 'Close window',
          accelerator: 'CmdOrCtrl+W',
          role: 'close',
        },
        {
          label: 'Quit',
          accelerator: 'CmdOrCtrl+Q',
          click() {
            app.quit();
          },
        },
      ],
    });
  }

  const fileMenu = {
    label: menuLabel('&File'),
    submenu: [
      {
        label: menuLabel('&Open'),
        accelerator: 'CmdOrCtrl+O',
        click(model, item, win) {
          openFileDialog(win, false);
        },
      },
      {
        label: menuLabel('Open in &new window'),
        accelerator: 'CmdOrCtrl+Shift+O',
        click(model, item, win) {
          openFileDialog(win, true);
        },
      },
      {
        label: menuLabel('&Print'),
        accelerator: 'CmdOrCtrl+P',
        click(model, item, win) {
          if (win) {
            win.webContents.send('print');
          }
        },
      },
    ],
  };

  if (process.platform !== 'darwin') {
    fileMenu.submenu = [].concat(fileMenu.submenu, [
      { type: 'separator' },
      {
        label: menuLabel('C&lose window'),
        accelerator: 'CmdOrCtrl+W',
        role: 'close',
      },
      {
        label: menuLabel('&Quit'),
        accelerator: 'CmdOrCtrl+Q',
        click() {
          app.quit();
        },
      },
    ]);
  }

  template.push(fileMenu);

  template.push({
    label: menuLabel('&Edit'),
    submenu: [
      {
        label: menuLabel('&Find'),
        accelerator: 'CmdOrCtrl+F',
        click(model, item, win) {
          win.webContents.send('find');
        },
      },
      {
        label: menuLabel('&Copy'),
        accelerator: 'CmdOrCtrl+C',
        role: 'copy',
        enabled(model) {
          return model && !!model.selection;
        },
      },
      {
        label: menuLabel('Select &All'),
        accelerator: 'CmdOrCtrl+A',
        role: 'selectall',
      },
    ],
  });

  template.push({
    label: menuLabel('&History'),
    submenu: [
      {
        label: menuLabel('&Back'),
        accelerator: 'Alt+Left',
        click(model, item, win) {
          if (win) {
            win.webContents.send('history-back');
          }
        },
        enabled(model) {
          return model.history && model.history.canGoBack;
        },
      },
      {
        label: menuLabel('&Forward'),
        accelerator: 'Alt+Right',
        click(model, item, win) {
          if (win) {
            win.webContents.send('history-forward');
          }
        },
        enabled(model) {
          return model.history && model.history.canGoForward;
        },
      },
    ],
  });

  template.push({
    label: menuLabel('&View'),
    submenu: [
      {
        label: menuLabel('Zoom &In'),
        accelerator: 'CmdOrCtrl+Plus',
        click(model, item, win) {
          if (win) {
            win.webContents.send('zoom-in');
          }
        },
      },
      {
        label: menuLabel('Zoom &Out'),
        accelerator: 'CmdOrCtrl+-',
        click(model, item, win) {
          if (win) {
            win.webContents.send('zoom-out');
          }
        },
      },
      {
        label: menuLabel('&Reset Zoom'),
        accelerator: 'CmdOrCtrl+0',
        click(model, item, win) {
          if (win) {
            win.webContents.send('zoom-reset');
          }
        },
      },
      {
        label: menuLabel('Toggle &Developer Tools'),
        accelerator: process.platform === 'darwin' ? 'Alt+Command+I' : 'Ctrl+Shift+I',
        click(model, item, win) {
          if (win) {
            win.toggleDevTools();
          }
        },
      },
    ],
  });

  const helpMenu = {
    label: menuLabel('He&lp'),
    submenu: [
      {
        label: menuLabel('S&ource Code'),
        click() {
          shell.openExternal('https://github.com/yoshuawuyts/vmd');
        },
      },
      {
        label: menuLabel('Report an &Issue'),
        click() {
          shell.openExternal('https://github.com/yoshuawuyts/vmd/issues');
        },
      },
      {
        label: menuLabel('&Releases'),
        click() {
          shell.openExternal('https://github.com/yoshuawuyts/vmd/releases');
        },
      },
    ],
  };

  if (process.platform !== 'darwin') {
    helpMenu.submenu = [].concat(helpMenu.submenu, [
      { type: 'separator' },
      {
        label: menuLabel('&About vmd'),
        click() {
          openAboutDialog();
        },
      },
    ]);
  }

  template.push(helpMenu);

  const menu = createMenu(template, {});

  sharedState.subscribe(() => {
    menu.update(sharedState.getFocusedWindowState() || {});
  });

  Menu.setApplicationMenu(menu.getMenu());
}

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  app.quit();
});

app.on('ready', () => {
  registerEmojiProtocol();
  addApplicationMenu();

  if (!fromFile) {
    getStdin()
      .then((body) => {
        if (!body) {
          createWindow(createWindowOptions(true, defaultFilePath));
          return;
        }

        createWindow(createWindowOptions(false, body.toString()));
      });
  } else {
    createWindow(createWindowOptions(true, filePath));
  }
});
