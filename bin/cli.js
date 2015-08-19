#!/usr/bin/env node
const spawn = require('child_process').spawn
const electron = require('electron-prebuilt')
const path = require('path')
const fs = require('fs')
const conf = require('../config')

const serverPath = path.join(__dirname, '../server.js')
const md = conf._[0] || (process.stdin.isTTY ? conf.document : null)

var args = [ serverPath ].concat([].concat(process.argv).splice(2))

if (md) {
  var stat

  try {
    stat = fs.statSync(path.resolve(md))
  } catch (e) {
    console.error('Cannot open', md + ':', e.code === 'ENOENT' ? 'no such file' : e.message)
    process.exit(1)
  }

  if (stat.isDirectory()) {
    console.error('Cannot open', md + ': is a directory')
    process.exit(1)
  }

  args.push(md)
} else if (process.stdin.isTTY) {
  console.error('No file path specified')
  process.exit(1)
}

// spawn electron
var proc = spawn(electron, args)

// pipe stdin into child process, if something was piped in
if (!md) {
  process.stdin.pipe(proc.stdin)
}
