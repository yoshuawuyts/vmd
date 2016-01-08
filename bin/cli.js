#!/usr/bin/env node
const spawn = require('child_process').spawn
const electron = require('electron-prebuilt')
const path = require('path')
const serverPath = path.join(__dirname, '../server.js')

var args = [ serverPath ].concat([].concat(process.argv).splice(2))
spawn(electron, args, { stdio: 'inherit' })
