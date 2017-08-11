const deepEqual = require('deep-equal');

module.exports = function history() {
  let historyData = [];
  let currentPosition = null;
  const listeners = [];

  function current() {
    if (!historyData.length) {
      return null;
    }

    return historyData[currentPosition];
  }

  function notifyListeners() {
    listeners.slice().forEach((listener) => {
      listener();
    });
  }

  function cut() {
    if (currentPosition !== null) {
      historyData = historyData.slice(0, currentPosition + 1);
    }
  }

  function push(item) {
    if (deepEqual(item, current())) {
      return current();
    }

    cut();
    historyData.push(item);

    if (currentPosition === null) {
      currentPosition = 0;
    } else {
      currentPosition += 1;
    }

    process.nextTick(notifyListeners);
    return current();
  }

  function canGoBack(steps = 1) {
    return currentPosition - steps >= 0;
  }

  function canGoForward(steps = 1) {
    return currentPosition + steps <= historyData.length - 1;
  }

  function back(steps = 1) {
    if (canGoBack(steps)) {
      currentPosition -= steps;
    } else {
      currentPosition = 0;
    }

    process.nextTick(notifyListeners);
    return current();
  }

  function forward(steps = 1) {
    if (canGoForward(steps)) {
      currentPosition += steps;
    } else {
      currentPosition = historyData.length - 1;
    }

    process.nextTick(notifyListeners);
    return current();
  }

  function subscribe(listener) {
    listeners.push(listener);
    let isSubscribed = true;

    return function unsubscribe() {
      if (!isSubscribed) {
        return;
      }

      isSubscribed = false;
      const index = listeners.indexOf(listener);
      listeners.splice(index, 1);
    };
  }

  return {
    push,
    canGoBack,
    canGoForward,
    back,
    forward,
    current,
    subscribe,
  };
};
