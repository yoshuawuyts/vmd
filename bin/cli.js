#!/usr/bin/env node
const spawn = require('child_process').spawn
const electron = require('electron-prebuilt')
const path = require('path')
const fs = require('fs')

const serverPath = path.join(__dirname, '../server.js')
const md = process.argv[2]
var args = [serverPath]

if (md) {
  if (!fs.existsSync(path.resolve(md))) {
    console.error('Cannot access ', md + ': No such file')
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
