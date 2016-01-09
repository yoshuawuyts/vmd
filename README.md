# vmd
[![NPM version][npm-image]][npm-url]
[![build status][travis-image]][travis-url]
[![Downloads][downloads-image]][downloads-url]
[![js-standard-style][standard-image]][standard-url]

Preview markdown files in a separate window. Markdown is formatted exactly the
same as on GitHub.

![screenshot](./docs/screenshot.png)

## Installation

```bash
$ npm install -g vmd
```

## Usage

```
vmd [FILE] [OPTIONS]
```

If no FILE is provided it will try to read from standard input, or
automatically look for "README.md" if in a TTY.

### Examples

Read a file from disk:

```sh
$ vmd DOCUMENT.md
```

When no path to a document is supplied, "README.md" will be opened by default:

```sh
$ vmd
```

It reads from `stdin` so you can pipe markdown text in to it:

```sh
$ cat README.md | vmd
```

For example, you can see the readme for [browserify](https://github.com/substack/node-browserify) like so:

```sh
$ npm view browserify readme | vmd
```

Or from a GitHub project:

```sh
$ gh-rtfm substack/node-browserify | vmd
```

### Options

 - `-v, --version`: Display the version number.

 - `--versions`: Display version numbers of different internal components such
   as Electron.

 - `-h, --help`: Display usage instructions.

 - `-d, --devtools`: Open with the developer tools open.

 - `-z, --zoom=NUM`: Set a zoom factor to make the content larger or smaller.
   For example `--zoom=1.25`

 - `--document=FILENAME`: vmd will look for "README.md" by default if no file
   path has been specified. This can be changed to something else.

 - `--list-highlight-themes`: Display a list of available syntax highlighting
   themes.

 - `--styles-main=FILE`: Provide a custom CSS file to display the content.

 - `--styles-extra=FILE`: Provide a custom CSS file to do additional styling.
   For example to override some CSS properties fr the default style.

 - `--highlight-theme=NAME`: Use a different syntax highlighting theme for code
   blocks. Run `vmd --list-highlight-themes` to get a list of available themes.

 - `--highlight-stylesheet=FILE`: Provide a custom CSS file for syntax
   highlighting in code blocks.

## Configuration

All [Options](#options) that contain a value can be persisted in configuration
file in INI, YAML or JSON format. The configuration file can be in any of the
following locations: `$HOME/.vmdrc`, `$HOME/.vmd/config`, `$HOME/.config/vmd`,
`$HOME/.config/vmd/config`, `/etc/vmdrc`, or a custom location provided using
the `--config=FILE` option.

If you wish to change some of the default settings create a config file called
`.vmdrc` in your home directory or in `~/.config/vmd`.

Here's a sample config file:

```ini
zoom = 1.2
highlight.theme = monokai
styles.extra = /my/custom/vmd/style-fixes.css
```

Options provided as command-line arguments will always have precedence over the
values in the configuration file. So `--zoom=1.5` will set the zoom factor to
1.5 regardless of what's in the config file.

## Authors

- [Yoshua Wuyts](https://github.com/yoshuawuyts)
- [Max Kueng](https://github.com/maxkueng)

## License

[MIT](https://tldrlegal.com/license/mit-license)

[npm-image]: https://img.shields.io/npm/v/vmd.svg?style=flat-square
[npm-url]: https://npmjs.org/package/vmd
[travis-image]: https://img.shields.io/travis/yoshuawuyts/vmd/master.svg?style=flat-square
[travis-url]: https://travis-ci.org/yoshuawuyts/vmd
[downloads-image]: http://img.shields.io/npm/dm/vmd.svg?style=flat-square
[downloads-url]: https://npmjs.org/package/vmd
[standard-image]: https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square
[standard-url]: https://github.com/feross/standard
