const zoom = {
  init(initialZoom) {
    if (initialZoom) {
      this.currentZoom = +initialZoom;
      this.update();
      return this;
    }

    this.currentZoom = +window.getComputedStyle(document.body).getPropertyValue('zoom');
    return this;
  },

  update() {
    document.body.style.zoom = this.currentZoom;
  },

  zoomIn() {
    this.currentZoom += 0.1;
    this.update();
  },

  zoomOut() {
    this.currentZoom -= 0.1;
    this.update();
  },

  reset() {
    this.currentZoom = 1;
    this.update();
  },
};

module.exports = zoom.init.bind(zoom);
