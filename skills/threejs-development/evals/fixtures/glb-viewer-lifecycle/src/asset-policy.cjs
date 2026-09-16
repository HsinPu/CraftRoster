'use strict';
const MAX_BYTES = 1024 * 1024;
function validateContainer(bytes) {
  if (!(bytes instanceof ArrayBuffer)) throw new Error('Expected GLB ArrayBuffer');
  if (bytes.byteLength < 20 || bytes.byteLength > MAX_BYTES) throw new Error('GLB byte limit');
  const header = new DataView(bytes);
  if (header.getUint32(0, true) !== 0x46546c67 || header.getUint32(4, true) !== 2) throw new Error('GLB type or version');
  if (header.getUint32(8, true) !== bytes.byteLength) throw new Error('GLB length mismatch');
  return bytes;
}
module.exports = { validateContainer, MAX_BYTES };

