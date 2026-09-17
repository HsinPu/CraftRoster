'use strict';

const { feed } = require('./decoder.cjs');

function collect(chunks) {
  const output = [];
  for (const chunk of chunks) {
    const result = feed([], chunk);
    for (const payload of result.frames) {
      output.push(payload.map(byte => byte.toString(16).padStart(2, '0')).join(''));
    }
  }
  return output;
}

module.exports = { collect };
