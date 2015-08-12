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
```sh
$ vmd DOCUMENT.md
```

When no path to a document is supplied, "README.md" will be opened by default.

```sh
$ vmd
```

You can also pipe markdown content into `stdin`:

```sh
$ cat README.md | vmd
```

For example, you can see the markdown for [browserify](https://github.com/substack/node-browserify) like so:

```sh
$ npm view browserify readme | vmd
```

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
