'use strict';
const assert = require('node:assert/strict');
const { summarizeOrder } = require('../src/order-summary');
assert.deepEqual(summarizeOrder([]), { itemCount: 0, totalCents: 0 });
assert.deepEqual(summarizeOrder([{ sku: 'x', quantity: 2, unitCents: 300 }]), { itemCount: 2, totalCents: 600 });
assert.throws(() => summarizeOrder([{ quantity: -1, unitCents: 300 }]), RangeError);
assert.throws(() => summarizeOrder([{ quantity: 1, unitCents: 1.5 }]), RangeError);
console.log('Order-summary focused unit checks passed.');
