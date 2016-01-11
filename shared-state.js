const assign = require('object-assign')
const createStore = require('redux').createStore
const combineReducers = require('redux').combineReducers
const BrowserWindow = require('electron').BrowserWindow

const sharedState = combineReducers({
  focusedWindow: focusedWindow,
  windows: windows
})

var store = createStore(sharedState)

function focusedWindowAction (action) {
  var fw = BrowserWindow.getFocusedWindow()

  if (typeof action.windowId === 'undefined' && fw) {
    action.windowId = fw.id
  }

  return action
}

const actions = {

  setFocusedWindow: function (windowId) {
    store.dispatch(focusedWindowAction({
      type: 'SET_FOCUSED_WINDOW',
      windowId: windowId
    }))
  },

  setSelection: function (windowId, selection) {
    store.dispatch(focusedWindowAction({
      type: 'SET_SELECTION',
      windowId: windowId,
      selection: selection
    }))
  },

  clearSelection: function (windowId) {
    store.dispatch(focusedWindowAction({
      type: 'CLEAR_SELECTION',
      windowId: windowId
    }))
  },

  setHistoryStatus: function (windowId, data) {
    store.dispatch(focusedWindowAction({
      type: 'SET_HISTORY_STATUS',
      windowId: windowId,
      canGoBack: data.canGoBack,
      canGoForward: data.canGoForward
    }))
  }
}

function focusedWindow (state, action) {
  if (typeof state === 'undefined') {
    return null
  }

  switch (action.type) {
    case 'SET_FOCUSED_WINDOW':
      return action.windowId

    default:
      return state
  }
}

function win (state, action) {
  if (typeof state === 'undefined') {
    return {
      id: action.windowId
    }
  }

  if (state.id !== action.windowId) {
    return state
  }

  switch (action.type) {
    case 'SET_HISTORY_STATUS':
      return assign({}, state, {
        history: {
          canGoBack: action.canGoBack,
          canGoForward: action.canGoForward
        }
      })

    case 'SET_SELECTION':
      return assign({}, state, {
        selection: action.selection
      })

    case 'CLEAR_SELECTION':
      return assign({}, state, {
        selection: null
      })

    default:
      return state
  }
}

function windows (state, action) {
  if (typeof state === 'undefined') {
    return []
  }

  switch (action.type) {
    case 'SET_SELECTION':
    case 'CLEAR_SELECTION':
    case 'SET_HISTORY_STATUS':
      var newState = state.slice(0)

      var index = state.findIndex(function (w) {
        return w.id === action.windowId
      })

      if (index === -1) {
        newState = newState.concat(win(undefined, action))
      }

      return newState.map(function (w) {
        return win(w, action)
      })

    default:
      return state
  }
}

function getFocusedWindowState () {
  var fw = BrowserWindow.getFocusedWindow()
  return fw && getWindowState(fw.id)
}

function getWindowState (windowId) {
  return store.getState().windows
    .find(function (w) {
      return w.id === windowId
    })
}

module.exports = assign({}, actions, {
  subscribe: store.subscribe,
  getState: store.getState,
  getWindowState: getWindowState,
  getFocusedWindowState: getFocusedWindowState
})
