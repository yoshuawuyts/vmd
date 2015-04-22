#!/usr/bin/env node
const proc = require('child_process')
const electron = require('electron-prebuilt')
const path = require('path')
const fs = require('fs')

const serverPath = path.join(__dirname, '../server.js')

const md = process.argv[2]
if (!md) {
  console.error('No file path specified')
  process.exit(1)
}

if (!fs.existsSync(path.resolve(md))) {
  console.error('Cannot access ', md + ': No such file')
  process.exit(1)
}

// spawn electron
proc.spawn(electron, [serverPath, md])
