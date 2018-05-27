const {
  createStore,
  combineReducers,
} = require('redux');
const { BrowserWindow } = require('electron');

function focusedWindowAction(action) {
  const fw = BrowserWindow.getFocusedWindow();

  if (typeof action.windowId === 'undefined' && fw) {
    // eslint-disable-next-line no-param-reassign
    action.windowId = fw.id;
  }

  return action;
}

function focusedWindow(state, action) {
  if (typeof state === 'undefined') {
    return null;
  }

  switch (action.type) {
    case 'SET_FOCUSED_WINDOW':
      return action.windowId;

    default:
      return state;
  }
}

function win(state, action) {
  if (typeof state === 'undefined') {
    return {
      id: action.windowId,
    };
  }

  if (state.id !== action.windowId) {
    return state;
  }

  switch (action.type) {
    case 'SET_FILE_PATH':
      return Object.assign({}, state, {
        filePath: action.filePath,
      });

    case 'SET_HISTORY_STATUS':
      return Object.assign({}, state, {
        history: {
          canGoBack: action.canGoBack,
          canGoForward: action.canGoForward,
        },
      });

    case 'SET_SELECTION':
      return Object.assign({}, state, {
        selection: action.selection,
      });

    case 'CLEAR_SELECTION':
      return Object.assign({}, state, {
        selection: null,
      });

    default:
      return state;
  }
}

function windows(state, action) {
  if (typeof state === 'undefined') {
    return [];
  }

  switch (action.type) {
    case 'SET_FILE_PATH':
    case 'SET_SELECTION':
    case 'CLEAR_SELECTION':
    case 'SET_HISTORY_STATUS': {
      let newState = state.slice(0);
      const index = state.findIndex(w => w.id === action.windowId);

      if (index === -1) {
        newState = newState.concat(win(undefined, action));
      }

      return newState.map(w => win(w, action));
    }
    default:
      return state;
  }
}


const sharedState = combineReducers({
  focusedWindow,
  windows,
});

const store = createStore(sharedState);

function getWindowState(windowId) {
  return store.getState().windows
    .find(w => w.id === windowId);
}

function getFocusedWindowState() {
  const fw = BrowserWindow.getFocusedWindow();
  return fw && getWindowState(fw.id);
}

const actions = {

  setFocusedWindow(windowId) {
    store.dispatch(focusedWindowAction({
      type: 'SET_FOCUSED_WINDOW',
      windowId,
    }));
  },

  setFilePath(windowId, filePath) {
    store.dispatch(focusedWindowAction({
      type: 'SET_FILE_PATH',
      windowId,
      filePath,
    }));
  },

  setSelection(windowId, selection) {
    store.dispatch(focusedWindowAction({
      type: 'SET_SELECTION',
      windowId,
      selection,
    }));
  },

  clearSelection(windowId) {
    store.dispatch(focusedWindowAction({
      type: 'CLEAR_SELECTION',
      windowId,
    }));
  },

  setHistoryStatus(windowId, data) {
    store.dispatch(focusedWindowAction({
      type: 'SET_HISTORY_STATUS',
      windowId,
      canGoBack: data.canGoBack,
      canGoForward: data.canGoForward,
    }));
  },
};

module.exports = Object.assign({}, actions, {
  subscribe: store.subscribe,
  getState: store.getState,
  getWindowState,
  getFocusedWindowState,
});
