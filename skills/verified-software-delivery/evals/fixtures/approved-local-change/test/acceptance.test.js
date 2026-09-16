'use strict';
const assert = require('node:assert/strict');
const { summarizeOrder } = require('../src/order-summary');
const order = require('../fixtures/order.json');
const expected = require('../fixtures/order.expected.json');
assert.deepEqual(summarizeOrder(order.lines), expected);
console.log('Representative-order local acceptance passed.');
