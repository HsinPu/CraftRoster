'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const dependency = path.join(root, 'node_modules/three');
if (JSON.parse(fs.readFileSync(path.join(dependency, 'package.json'))).version !== '0.180.0') throw Error('Exact three@0.180.0 required');
const output = path.join(root, 'dist');
if (fs.existsSync(output)) throw Error('Use a fresh disposable fixture copy; existing dist will not be overwritten');
for (const file of ['index.html', 'style.css', 'src/probe.js', 'src/pixel-contract.js']) {
  const destination = path.join(output, file); fs.mkdirSync(path.dirname(destination), { recursive: true }); fs.copyFileSync(path.join(root, file), destination);
}
fs.mkdirSync(path.join(output, 'vendor'));
for (const file of ['three.module.js', 'three.core.js']) fs.copyFileSync(path.join(dependency, 'build', file), path.join(output, 'vendor', file));
fs.copyFileSync(path.join(dependency, 'LICENSE'), path.join(output, 'vendor/LICENSE'));
console.log('Static baseline build created; no renderer migration or device result claimed.');
