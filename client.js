const marked = require('marked')
const ipc = require('ipc')
const remote = require('remote')

ipc.on('md', function (raw) {
  const md = marked(raw)
  const base = document.querySelector('base');
  const body = document.querySelector('.markdown-body')
  base.setAttribute('href', remote.getGlobal('baseUrl'))
  body.innerHTML = md
})

window.addEventListener('keydown', function (ev) {
  if (ev.keyCode === 27) {
    remote.getCurrentWindow().close()
  }
});
