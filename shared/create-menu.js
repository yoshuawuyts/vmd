const isRenderer = process.type === 'renderer'
const electron = require('electron')
const Menu = isRenderer ? electron.remote.Menu : electron.Menu
const MenuItem = isRenderer ? electron.remote.MenuItem : electron.MenuItem

module.exports = function (template, model) {
  var _menu = new Menu()
  var _model = model

  var m = {
    getMenu: function () {
      return _menu
    },

    getModel: function () {
      return _model
    },

    update: function (model) {
      _model = model
      updateMenuItems(m.getModel(), template, m.getMenu())
    }
  }

  function updateMenuItems (model, tplArr, p) {
    tplArr.forEach(function (tplItem) {
      if (!tplItem._item) {
        
        var config = Object.assign({}, tplItem); 
        
        if (Array.isArray(tplItem.submenu)) {
            config.submenu = new Menu()
        }
        if (tplItem.click) {
          config.click = function (item, win) {
                tplItem.click(m.getModel(), item, win)
          }
        } 
        
        tplItem._item = new MenuItem(config)

        p.append(tplItem._item)
      }

      if (typeof tplItem.visible === 'function') {
        tplItem._item.visible = tplItem.visible(model, tplItem._item)
      }

      if (typeof tplItem.enabled === 'function') {
        tplItem._item.enabled = tplItem.enabled(model, tplItem._item)
      }

      if (tplItem._item.submenu) {
        updateMenuItems(model, tplItem.submenu, tplItem._item.submenu)
      }
    })

    return p
  }

  updateMenuItems(m.getModel(), template, m.getMenu())

  return m
}
