const marked = require('marked')
const highlightjs = require('highlight.js')

const emojiRegex = /:([A-Za-z0-9_\-\+\xff]+?):/g
const listItemRegex = /^\[(x|\s)\]\s*(.+)$/

function escapeUnderscore (str) {
  return str.replace(/[_]/g, '\xff')
}

function unescapeUnderscore (str) {
  return str.replace(/[\xff]/g, '_')
}

function escapeEmoji (str) {
  return str.replace(emojiRegex, function (match, emojiname) {
    return ':' + escapeUnderscore(emojiname) + ':'
  })
}

function unescapeEmoji (str) {
  return str.replace(emojiRegex, function (match, emojiname) {
    return ':' + unescapeUnderscore(emojiname) + ':'
  })
}

var renderer = new marked.Renderer()

renderer.text = function (text) {
  return text.replace(emojiRegex, function (match, emojiname) {
    emojiname = unescapeUnderscore(emojiname)
    return '<img alt=":' + emojiname + ':" src="emoji://' + emojiname + '" />'
  })
}

var originalListItemRenderer = marked.Renderer.prototype.listitem

renderer.listitem = function (text) {
  var match = listItemRegex.exec(text)
  if (match) {
    var label = match[2]
    var checked = match[1] === 'x' ? 'checked' : ''

    text = '<label><input type="checkbox" class="task-list-item-checkbox" disabled ' + checked + ' /> ' + label + '</label>'

    return '<li class="task-list-item">' + text + '</li>'
  }

  return originalListItemRenderer(text)
}

var originalInlineOutput = marked.InlineLexer.prototype.output

marked.InlineLexer.prototype.output = function (src) {
  return unescapeEmoji(originalInlineOutput.call(this, escapeEmoji(src)))
}

marked.setOptions({
  renderer: renderer,
  smartLists: true,
  highlight: function (code, lang) {
    return highlightjs.highlightAuto(code, [lang]).value
  }
})

module.exports = function (src) {
  return marked(src)
}
