var zoom = {
  init: function () {
    this.currentZoom = +window.getComputedStyle(document.body).getPropertyValue('zoom')
    return this
  },

  update: function () {
    document.body.style.zoom = this.currentZoom
  },

  zoomIn: function () {
    this.currentZoom += 0.1
    this.update()
  },

  zoomOut: function () {
    this.currentZoom -= 0.1
    this.update()
  },

  reset: function () {
    this.currentZoom = 1
    this.update()
  }
}

module.exports = zoom.init.bind(zoom)
