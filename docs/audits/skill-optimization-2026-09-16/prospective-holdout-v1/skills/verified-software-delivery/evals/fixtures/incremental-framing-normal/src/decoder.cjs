'use strict';

const { validateBytes } = require('./validate-bytes.cjs');

function feed(pending, chunk) {
  const bytes = validateBytes(pending, 'pending').concat(validateBytes(chunk, 'chunk'));
  const frames = [];
  let cursor = 0;
  while (cursor < bytes.length) {
    const length = bytes[cursor++];
    if (length > 16) throw new RangeError('frame length');
    if (cursor + length > bytes.length) break;
    frames.push(bytes.slice(cursor, cursor + length));
    cursor += length;
  }
  return { pending: [], frames };
}

module.exports = { feed };
