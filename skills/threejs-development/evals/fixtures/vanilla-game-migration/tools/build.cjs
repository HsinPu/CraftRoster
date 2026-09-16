'use strict';
const fs = require('node:fs'), path = require('node:path');
const root = path.resolve(__dirname, '..'), destination = path.join(root, '.build/vanilla');
fs.mkdirSync(destination, { recursive: true });
require('esbuild').buildSync({ absWorkingDir: root, entryPoints: ['src/main.js'], outfile: path.join(destination, 'app.js'), bundle: true, platform: 'browser', format: 'iife', sourcemap: true, logLevel: 'warning' });
fs.cpSync(path.join(root, 'assets'), path.join(destination, 'assets'), { recursive: true });
fs.writeFileSync(path.join(destination, 'index.html'), '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Vanilla grid game</title><link rel="stylesheet" href="app.css"><div id="app"></div><script src="app.js"></script></html>');
console.log('Built existing vanilla game; browser and GPU verification not performed by this command.');
