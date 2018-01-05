# vmd
[![NPM version][npm-image]][npm-url]
[![build status][travis-image]][travis-url]
[![Downloads][downloads-image]][downloads-url]
[![Codacy Badge][codacy-image]][codacy-url]

Preview markdown files in a separate window. Markdown is formatted exactly the
same as on GitHub.

[Features](#features) | [Installation](#installation) | [Usage](#usage) | [Examples](#examples) | [Command-line options](#options) | [Configuration](#configuration)

![screenshot](https://raw.githubusercontent.com/yoshuawuyts/vmd/master/docs/screenshot.png)

## Features

 - **GitHub style:** The markdown content is rendered as close to the way it's
   rendered on GitHub as possible.

 - **File watching:** Local files opened in vmd are watched for changes and the
   viewer will automatically update when a file has been changed. This makes it
   ideal for writing documents in your favorite text editor and get a live
   preview.

 - **Standard input:** View any markdown text from other programs by piping
   another program's output in to vmd. Check out the [examples](#examples) for
   cool use cases.

 - **Drag & Drop:** Drag files from your file browser or desktop on to a vmd
   window and render it. Hold the `Shift` key while dropping to open the file
   in a new window.

 - **Navigation:** Navigate within linked sections in a document, open relative
   links to other documents in the same window or in a new one (`shift-click`),
   and always be able to go back in the history. And open links to directories
   in your file manager and external links in your default browser.

 - **Clipboard:** Copy links and local file paths to the clipboard, and even
   copy images in binary format to paste them in to your image editing
   software.

 - **Emoji:** :bowtie: Displays emoji, such as `:sweat_drops:`. Take a look at the
   [Emoji Cheat Sheet][emoji-cheat-sheet] for a list of available emoji.

 - **Checklists:** Renders GitHub-style checklists.
   ```
    - [ ] List item 1
    - [x] List item 2
   ```
    - [ ] List item 1
    - [x] List item 2

 - **Search in page:** Search within your markdown file and scroll to the
   results. Select "Edit -> Find" from the menu or hit `Ctrl+F` (or `Cmd+F` on
   OS X).

 - **Customization:** Select different themes and provide your own styles to
   make vmd look the way you want. Take a look at the [Options](#options) for
   an overview of available customization options.

 - **Front Matter**: Renders [Front Matter][frontmatter] in YAML and, if
   enabled, in TOML and JSON so you can preview your Jekyll and Hugo content in
   vmd. See some [examples][hugo-frontmatter].

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

When a path to a directory is supplied, "directory/README.md" will be opened by default:

```sh
$ vmd node_modules/electron # opens node_modules/electron/README.md
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

 - `--window-preservestate=false`: By default vmd preserves the window state
   for the next session, set this option to false to disable this.

 - `--window-autohidemenubar=true`: By default vmd always shows the menu bar.
   To hide it set this flag to `true`. The menu visibility can be toggled using
   the `Alt` key. Linux and Windows only.

 - `--frontmatter-formats=FORMATS`: A comma-separated list of Front Matter
   formats. By default only the YAML format is enabled. Supported formats are
   YAML, TOML and JSON.

 - `--frontmatter-renderer=RENDERER`: Specify how to render Front Matter. Can
   be “table”, “code” or “none”. If “none” is specified the Front Matter will
   not be rendered at all. Default is “table”.

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

[Max Kueng](https://github.com/maxkueng), [Yoshua Wuyts](https://github.com/yoshuawuyts)
and [contributors](https://github.com/yoshuawuyts/vmd/graphs/contributors).

## License

[MIT](https://tldrlegal.com/license/mit-license)

[npm-image]: https://img.shields.io/npm/v/vmd.svg?style=flat-square
[npm-url]: https://npmjs.org/package/vmd
[travis-image]: https://img.shields.io/travis/yoshuawuyts/vmd/master.svg?style=flat-square
[travis-url]: https://travis-ci.org/yoshuawuyts/vmd
[downloads-image]: http://img.shields.io/npm/dm/vmd.svg?style=flat-square
[downloads-url]: https://npmjs.org/package/vmd
[emoji-cheat-sheet]: http://www.emoji-cheat-sheet.com/
[codacy-image]: https://img.shields.io/codacy/grade/ccaa489b6f664ebd9a12d900334be10f/master.svg?style=flat-square
[codacy-url]: https://www.codacy.com/app/maxkueng/vmd?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=yoshuawuyts/vmd&amp;utm_campaign=Badge_Grade
[frontmatter]: https://jekyllrb.com/docs/frontmatter/
[hugo-frontmatter]: https://gohugo.io/content-management/front-matter/
