'use strict';
const fs = require('node:fs'), path = require('node:path');
const { makeWav } = require('./audio.cjs');
const root = path.resolve(__dirname,'..'), output = path.join(root,'dist');
const dependency = path.join(root,'node_modules/three');
if (JSON.parse(fs.readFileSync(path.join(dependency,'package.json'))).version !== '0.152.2') throw new Error('Exact legacy three@0.152.2 required');
if (fs.existsSync(output)) throw new Error('Use a fresh disposable copy; dist will not be overwritten');
const files = ['index.html','style.css','src/app.js','src/design.js','src/model.js','src/renderer.js','assets/materials.json',
  'saved-designs/oak-chair.v1.json','saved-designs/wide-chair.v1.json','saved-designs/invalid-version.json','saved-designs/invalid-units.json','saved-designs/invalid-material.json'];
for (const file of files) { const target = path.join(output,file); fs.mkdirSync(path.dirname(target),{recursive:true}); fs.copyFileSync(path.join(root,file),target); }
fs.mkdirSync(path.join(output,'vendor'));
fs.copyFileSync(path.join(dependency,'build/three.module.js'),path.join(output,'vendor/three.module.js'));
fs.copyFileSync(path.join(dependency,'LICENSE'),path.join(output,'vendor/LICENSE'));
fs.writeFileSync(path.join(output,'assets/tone-a.wav'),makeWav(JSON.parse(fs.readFileSync(path.join(root,'assets/audio-cue.json')))));
console.log('Legacy raster static build created; no browser, device or modernization result claimed.');
