const {
  remote,
  Menu: ElectronMenu,
  MenuItem: ElectronMenuItem,
} = require('electron');

const isRenderer = process.type === 'renderer';

const Menu = isRenderer ? remote.Menu : ElectronMenu;
const MenuItem = isRenderer ? remote.MenuItem : ElectronMenuItem;

function updateMenuItems(m, model, tplArr = [], p) {
  tplArr.forEach((tplItem) => {
    if (!tplItem.menuItem) {
      const config = Object.assign({}, tplItem);

      if (Array.isArray(tplItem.submenu)) {
        config.submenu = new Menu();
      }
      if (tplItem.click) {
        config.click = (item, win) => {
          tplItem.click(m.getModel(), item, win);
        };
      }

      // eslint-disable-next-line no-param-reassign
      tplItem.menuItem = new MenuItem(config);

      p.append(tplItem.menuItem);
    }

    if (typeof tplItem.visible === 'function') {
      // eslint-disable-next-line no-param-reassign
      tplItem.menuItem.visible = tplItem.visible(model, tplItem.menuItem);
    }

    if (typeof tplItem.enabled === 'function') {
      // eslint-disable-next-line no-param-reassign
      tplItem.menuItem.enabled = tplItem.enabled(model, tplItem.menuItem);
    }

    if (tplItem.menuItem.submenu) {
      updateMenuItems(m, model, tplItem.submenu, tplItem.menuItem.submenu);
    }
  });

  return p;
}

module.exports = function createMenu(template, initialModel) {
  const menu = new Menu();
  let localModel = initialModel;

  const m = {
    getMenu() {
      return menu;
    },

    getModel() {
      return localModel;
    },

    update(newModel) {
      localModel = newModel;
      updateMenuItems(this, m.getModel(), template, m.getMenu());
    },
  };

  updateMenuItems(m, m.getModel(), template, m.getMenu());

  return m;
};
