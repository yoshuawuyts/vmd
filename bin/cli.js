#!/usr/bin/env node
const spawn = require('child_process').spawn;
const electron = require('electron');
const path = require('path');

const serverPath = path.join(__dirname, '../main/main.js');

const args = [serverPath]
  .concat([].concat(process.argv).splice(2))
  .concat('--not-packaged=true');

const proc = spawn(electron, args, { stdio: 'inherit' });
proc.on('close', (code) => {
  process.exit(code);
});
