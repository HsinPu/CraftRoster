'use strict';
const assert = require('node:assert/strict');
const { makeGlb } = require('../tools/generate-assets.cjs');
const { validateContainer, MAX_BYTES } = require('../src/asset-policy.cjs');
function arrayBuffer(buffer) { return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength); }
function run() {
  for (const corrupt of [false, true]) {
    const bytes = makeGlb(corrupt);
    assert.equal(validateContainer(arrayBuffer(bytes)).byteLength, bytes.length);
    assert.equal(bytes.readUInt32LE(8), bytes.length);
    const gltf = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString());
    assert.equal(gltf.accessors[0].count, 3); assert.equal(gltf.images[0].mimeType, 'image/png');
    assert.ok(bytes.length < 2048);
  }
  assert.throws(() => validateContainer(new ArrayBuffer(MAX_BYTES + 1)), /byte limit/);
  const truncated = makeGlb().subarray(0, 24);
  assert.throws(() => validateContainer(arrayBuffer(truncated)), /length mismatch/);
  console.log('PASS ordinary GLB envelope and authored sample checks; no browser or full asset-policy certification');
}
if (require.main === module) run();
module.exports = { run };

