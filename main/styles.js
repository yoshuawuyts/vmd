const path = require('path');
const fs = require('fs');
const { app } = require('electron');
const postcss = require('postcss');
const postcssImportant = require('postcss-safe-important');

exports.getHighlightThemes = function styles() {
  const themesPath = path.resolve(require.resolve('highlight.js'), '../..', 'styles');

  try {
    return fs.readdirSync(themesPath)
      .filter(name => path.extname(name) === '.css' && name !== 'default.css')
      .map(name => path.basename(name, '.css'));
  } catch (err) {
    return [];
  }
};

exports.getHighlightTheme = function getHighlightTheme(theme) {
  const themePath = path.resolve(require.resolve('highlight.js'), '../..', 'styles', `${theme}.css`);

  try {
    const themeStyles = fs.readFileSync(themePath, 'utf-8');
    return postcss(postcssImportant).process(themeStyles).css;
  } catch (err) {
    console.error('Cannot load theme', `${theme}:`, err.code === 'ENOENT' ? 'no such file' : err.message);
    app.exit(1);
  }

  return '';
};

exports.getStylesheet = function getStylesheet(filePath) {
  const stylePath = path.resolve(filePath);

  try {
    return fs.readFileSync(stylePath, 'utf-8');
  } catch (err) {
    console.error('Cannot load style', `${filePath}:`, err.code === 'ENOENT' ? 'no such file' : err.message);
    app.exit(1);
  }

  return '';
};
