'use strict';
const fs = require('node:fs'), path = require('node:path'), esbuild = require('esbuild');
const { makeGlb } = require('./generate-assets.cjs');
const root = path.resolve(__dirname, '..'), destination = path.join(root, '.build');
fs.mkdirSync(path.join(destination, 'assets'), { recursive: true });
esbuild.buildSync({ absWorkingDir: root, entryPoints: ['src/viewer.js'], outfile: path.join(destination, 'app.js'), bundle: true, platform: 'browser', format: 'iife', sourcemap: true, logLevel: 'warning' });
for (const file of ['index.html', 'style.css']) fs.copyFileSync(path.join(root, file), path.join(destination, file));
fs.writeFileSync(path.join(destination, 'assets/triangle.glb'), makeGlb());
fs.writeFileSync(path.join(destination, 'assets/corrupt-texture.glb'), makeGlb(true));
console.log('Built real Three.js/GLTFLoader and authored GLBs; browser/GPU outcomes unverified.');

