'use strict';
const zlib = require('node:zlib');
function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function pngChunk(type, data) {
  const tag = Buffer.from(type), size = Buffer.alloc(4), crc = Buffer.alloc(4);
  size.writeUInt32BE(data.length); crc.writeUInt32BE(crc32(Buffer.concat([tag, data])));
  return Buffer.concat([size, tag, data, crc]);
}
function makePng() {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(1, 0); header.writeUInt32BE(1, 4); header[8] = 8; header[9] = 6;
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), pngChunk('IHDR', header),
    pngChunk('IDAT', zlib.deflateSync(Buffer.from([0, 245, 140, 30, 255]))), pngChunk('IEND', Buffer.alloc(0))]);
}
function makeGlb(corrupt = false) {
  const positions = Buffer.alloc(36);
  [-0.7,-0.6,0, 0.7,-0.6,0, 0,0.7,0].forEach((n, i) => positions.writeFloatLE(n, i * 4));
  const uv = Buffer.alloc(24);
  [0,0, 1,0, 0.5,1].forEach((n, i) => uv.writeFloatLE(n, i * 4));
  const image = corrupt ? Buffer.from('bounded-invalid-png') : makePng();
  const data = Buffer.concat([positions, uv, image]);
  const binary = Buffer.concat([data, Buffer.alloc((4 - data.length % 4) % 4)]);
  const gltf = {
    asset: { version: '2.0', generator: 'CraftRoster first-party numeric triangle fixture' },
    scene: 0, scenes: [{ nodes: [0] }], nodes: [{ mesh: 0 }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0, TEXCOORD_0: 1 }, material: 0 }] }],
    buffers: [{ byteLength: binary.length }],
    bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: 36, target: 34962 },
      { buffer: 0, byteOffset: 36, byteLength: 24, target: 34962 },
      { buffer: 0, byteOffset: 60, byteLength: image.length }],
    accessors: [{ bufferView: 0, componentType: 5126, count: 3, type: 'VEC3', min: [-0.7,-0.6,0], max: [0.7,0.7,0] },
      { bufferView: 1, componentType: 5126, count: 3, type: 'VEC2' }],
    materials: [{ pbrMetallicRoughness: { baseColorTexture: { index: 0 }, metallicFactor: 0, roughnessFactor: 0.8 }, doubleSided: true }],
    textures: [{ source: 0 }], images: [{ bufferView: 2, mimeType: 'image/png' }]
  };
  const rawJson = Buffer.from(JSON.stringify(gltf));
  const json = Buffer.concat([rawJson, Buffer.alloc((4 - rawJson.length % 4) % 4, 32)]);
  const header = Buffer.alloc(12); header.writeUInt32LE(0x46546c67, 0); header.writeUInt32LE(2, 4); header.writeUInt32LE(28 + json.length + binary.length, 8);
  const jsonHeader = Buffer.alloc(8); jsonHeader.writeUInt32LE(json.length); jsonHeader.writeUInt32LE(0x4e4f534a, 4);
  const binHeader = Buffer.alloc(8); binHeader.writeUInt32LE(binary.length); binHeader.writeUInt32LE(0x004e4942, 4);
  return Buffer.concat([header, jsonHeader, json, binHeader, binary]);
}
module.exports = { makeGlb, makePng, crc32 };

