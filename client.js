const marked = require('marked')
const ipc = require('ipc')

ipc.on('md', function (raw) {
  const md = marked(raw)
  const body = document.querySelector('.markdown-body')
  body.innerHTML = md
})
