'use strict';
const assert = require('node:assert/strict');
const { submitOrder } = require('../src/order-service');
const inventory = { notebook: 10 };
assert.deepEqual(submitOrder({ sku: 'notebook', quantity: 3 }, inventory), { status: 201, order: { sku: 'notebook', quantity: 3 } });
assert.equal(inventory.notebook, 7);
assert.deepEqual(submitOrder({ sku: 'missing', quantity: 1 }, inventory), { status: 409, message: 'Unavailable' });
assert.deepEqual(inventory, { notebook: 7 });
console.log('Order service normal-path tests passed.');
