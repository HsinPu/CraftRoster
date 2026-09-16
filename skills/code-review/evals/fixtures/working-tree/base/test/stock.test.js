'use strict';
const assert = require('node:assert/strict');
const { reserveStock } = require('../src/stock');
assert.deepEqual(reserveStock(10, 3), { accepted: true, remaining: 7 });
assert.deepEqual(reserveStock(2, 5), { accepted: false, remaining: 2 });
assert.throws(() => reserveStock(-1, 2), RangeError);
assert.throws(() => reserveStock(5, 0), RangeError);
assert.throws(() => reserveStock(5, 1.5), RangeError);
console.log('Stock normal-path tests passed.');
