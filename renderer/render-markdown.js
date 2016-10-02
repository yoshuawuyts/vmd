const assign = require('object-assign')
const remark = require('remark')
const slug = require('remark-slug')
const hljs = require('remark-highlight.js')
const emojiToGemoji = require('remark-emoji-to-gemoji')
const html = require('remark-html')
const visit = require('unist-util-visit')
const toString = require('mdast-util-to-string')

module.exports = renderMarkdown

const renderer = remark()
  .use(emojiToGemoji)
  .use(gemojiToImages)
  .use(fixHeadings)
  .use(fixCheckListStyles)
  .use(slug)
  .use([hljs, html], {
    sanitize: false
  })

function renderMarkdown (text) {
  return renderer.process(text).toString()
}

function gemojiToImages (remark) {
  function extractTextNode (string, start, end) {
    const startLine = string.slice(0, start).split('\n')
    const endLine = string.slice(0, end).split('\n')

    const position = {
      start: {
        line: startLine.length,
        column: startLine[startLine.length - 1].length + 1
      },
      end: {
        line: endLine.length,
        column: endLine[endLine.length - 1].length + 1
      }
    }

    const textNode = {
      type: 'text',
      value: string.slice(start, end),
      position: position
    }

    return textNode
  }

  return function transformer (tree) {
    const reg = /:([^:]+):/g

    visit(tree, 'text', function (node, index, parent) {
      // Because adding nodes to parent.children changes the indices and the
      // index provided by `visit` is therefore wrong we need to find the new
      // index
      const actualIndex = parent.children.reduce(function (actualIndex, child, index) {
        return child === node ? index : actualIndex
      }, null)

      const nodes = []
      let lastIndex = 0
      let m

      while ((m = reg.exec(node.value)) !== null) {
        const gemojiLength = m[0].length
        const gemojiName = m[1]

        if (m.index !== lastIndex) {
          const textNode = extractTextNode(node.value, lastIndex, m.index)
          lastIndex += textNode.value.length
          nodes.push(textNode)
        }

        const imageNode = {
          type: 'image',
          data: {
            hProperties: {
              align: 'absmiddle',
              alt: ':' + gemojiName + ':',
              className: 'emoji'
            }
          },
          url: 'emoji://' + gemojiName,
          title: ':' + gemojiName + ':'
        }

        nodes.push(imageNode)

        lastIndex += gemojiLength
      }

      if (lastIndex !== node.value.length) {
        const textNode = extractTextNode(node.value, lastIndex, node.value.length)
        nodes.push(textNode)
      }

      const beforeNodes = parent.children.slice(0, actualIndex)
      const afterNodes = parent.children.slice(actualIndex + 1)

      parent.children = [].concat(
        beforeNodes,
        nodes,
        afterNodes
      )
    })
  }
}

function fixCheckListStyles (remark) {
  return function transformer (tree) {
    visit(tree, 'listItem', function (node) {
      if (node.checked !== null) {
        const data = patchNode(node, 'data', {})
        patchNode(data, 'hProperties', {
          className: 'task-list-item'
        })
      }
    })
  }
}

function fixHeadings (remark) {
  const reg = /^([#]+)\s?(.+)$/

  return function transformer (tree) {
    visit(tree, 'paragraph', function (node, index, parent) {
      const nodeText = toString(node)
      if (parent.type === 'root' && reg.test(nodeText)) {
        const nodeTextParts = reg.exec(nodeText)
        node.type = 'heading'
        node.depth = nodeTextParts[1].length

        node.children = [].concat(node.children)
          .map(function (child, index) {
            if (child.type === 'text' && index === 0) {
              return assign({}, child, {
                value: nodeTextParts[2]
              })
            }
          })
      }
    })
  }
}

function patchNode (context, key, value) {
  if (!context[key]) {
    context[key] = value
  }

  return context[key]
}
