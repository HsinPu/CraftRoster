'use strict';
function normalizeSku(input) {
  if (typeof input !== 'string') throw new TypeError('SKU must be a string');
  return input.trim().toUpperCase();
}
module.exports = { normalizeSku };
