/* global vmd:true */

const assign = require('object-assign')

const electron = {
  ipc: require('electron').ipcRenderer,
  sharedState: require('electron').remote.require('../shared/shared-state')
}

// no var/let/const on purpose
vmd = assign({
  openFile: function (filePath) {
    electron.ipc.send('open-file', filePath)
  },

  on: function (eventName, listener) {
    if (!electron.ipc) { return }
    electron.ipc.on(eventName, listener)
  },

  off: function (eventName, listener) {
    if (!electron.ipc) { return }
    if (typeof listener !== 'function') { return }
    return electron.ipc.removeListener(eventName, listener)
  },

  onPrintAction: function (callback) {
    vmd.on('print', callback)
  },

  onHistoryBackAction: function (callback) {
    vmd.on('history-back', callback)
  },

  onHistoryForwardAction: function (callback) {
    vmd.on('history-forward', callback)
  },

  onZoomInAction: function (callback) {
    vmd.on('zoom-in', callback)
  },

  onZoomOutAction: function (callback) {
    vmd.on('zoom-out', callback)
  },

  onZoomResetAction: function (callback) {
    vmd.on('zoom-reset', callback)
  },

  onContent: function (callback) {
    vmd.on('md', callback)
  }
}, electron.sharedState)
