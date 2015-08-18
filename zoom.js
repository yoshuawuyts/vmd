var zoom = {
  init: function (zoom) {
    if (zoom) {
      this.currentZoom = +zoom
      this.update()
      return this
    }

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
