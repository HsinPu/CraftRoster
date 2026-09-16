'use strict';
const assert = require('node:assert/strict');
const { normalizeSku } = require('../src/normalize-sku');
assert.equal(normalizeSku('KIT-07'), 'KIT-07');
assert.equal(normalizeSku('PAD-02'), 'PAD-02');
assert.throws(() => normalizeSku(7), TypeError);
console.log('3 ordinary SKU unit checks passed');
