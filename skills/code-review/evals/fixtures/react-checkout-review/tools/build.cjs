'use strict';
const fs = require('node:fs');
const path = require('node:path');
const esbuild = require('esbuild');
const root = path.resolve(__dirname, '..');
for (const variant of ['base', 'head']) {
  const destination = path.join(root, '.build', variant);
  fs.mkdirSync(destination, { recursive: true });
  esbuild.buildSync({
    absWorkingDir: root,
    entryPoints: [variant + '/main.jsx'],
    outfile: path.join(destination, 'app.js'),
    bundle: true,
    platform: 'browser',
    format: 'iife',
    sourcemap: true,
    define: { 'process.env.NODE_ENV': '"development"' },
    logLevel: 'warning'
  });
  fs.writeFileSync(path.join(destination, 'index.html'),
    '<!doctype html>\n<html lang="en"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<title>Local checkout ' + variant + '</title><link rel="stylesheet" href="./app.css">' +
    '</head><body><div id="root"></div><script src="./app.js"></script></body></html>\n');
}
console.log('Built base and head with React; browser interaction and layout are unverified.');

