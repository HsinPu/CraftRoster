'use strict';
const assert = require('node:assert/strict');
const { importPartnerRow } = require('../src/partner-import');
assert.deepEqual(importPartnerRow({ item_code: 'KIT-07', units: 2 }), {
  status: 200, line: { sku: 'KIT-07', productId: 'product-kit-07', quantity: 2 }
});
assert.deepEqual(importPartnerRow({ item_code: 'UNKNOWN-01', units: 1 }), { status: 404, error: 'unknown-item' });
assert.deepEqual(importPartnerRow({ item_code: 'KIT-07', units: 0 }), { status: 400, error: 'invalid-row' });
console.log('3 ordinary partner-import unit checks passed');
