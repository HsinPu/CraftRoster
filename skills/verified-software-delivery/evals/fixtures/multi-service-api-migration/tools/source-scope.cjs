'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
function sourceScope(root) {
  const inputs = {}, decoder = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true });
  function visit(directory, prefix = '') {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name < b.name ? -1 : 1)) {
      if (entry.isSymbolicLink()) throw new Error('Source scope rejects symlinks');
      if (!prefix && entry.name === 'evidence' && entry.isDirectory()) continue;
      const relative = `${prefix}${entry.name}`, absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(absolute, `${relative}/`);
      else if (entry.isFile()) inputs[relative] = hash(decoder.decode(fs.readFileSync(absolute)).replace(/\r\n/g, '\n'));
      else throw new Error('Source scope requires regular UTF-8 files');
    }
  }
  visit(root);
  return { algorithm: 'sha256-utf8-lf', scopePolicy: 'recursive regular UTF-8 fixture files; symlinks rejected', excludedRoots: ['evidence/'], inputs, digest: hash(JSON.stringify(inputs)) };
}
module.exports = { sourceScope };
