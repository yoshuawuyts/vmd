const marked = require('marked')
const highlightjs = require('highlight.js')

const emojiRegex = /:([A-Za-z0-9_\-\+\xff]+?):/g

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

var originalInlineOutput = marked.InlineLexer.prototype.output

marked.InlineLexer.prototype.output = function (src) {
  src = escapeEmoji(src)
  return unescapeEmoji(originalInlineOutput.call(this, src))
}

marked.setOptions({
  renderer: renderer,
  highlight: function (code, lang) {
    return highlightjs.highlightAuto(code, [lang]).value
  }
})

module.exports = function (src) {
  return marked(src)
}
