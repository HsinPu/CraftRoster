'use strict';
const assert = require('node:assert/strict');
const { applyDiscount } = require('../lib/discount');

assert.equal(applyDiscount(10000, 1500), 8500);
assert.equal(applyDiscount(800, 0), 800);
assert.equal(applyDiscount(800, 10000), 0);
assert.equal(applyDiscount(0, 2500), 0);
assert.throws(() => applyDiscount(-1, 500), RangeError);
assert.throws(() => applyDiscount(100, 10001), RangeError);
assert.throws(() => applyDiscount(1.5, 500), RangeError);
console.log('Discount normal-path checks passed.');
