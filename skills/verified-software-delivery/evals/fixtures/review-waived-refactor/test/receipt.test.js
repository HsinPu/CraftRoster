'use strict';
const assert = require('node:assert/strict');
const { formatRetailReceipt, formatWholesaleReceipt } = require('../src/receipt');
const cases = [
  { items: [], body: 'Total cents: 0' },
  { items: [{ name: 'Notebook', quantity: 2, unitCents: 1250 }], body: 'Notebook: 2 x 1250 = 2500\nTotal cents: 2500' },
  { items: [{ name: '鉛筆', quantity: 3, unitCents: 150 }, { name: 'Sample', quantity: 0, unitCents: 999 }], body: '鉛筆: 3 x 150 = 450\nSample: 0 x 999 = 0\nTotal cents: 450' }
];
for (const item of cases) {
  const before = JSON.stringify(item.items);
  assert.equal(formatRetailReceipt(item.items), `RETAIL\n${item.body}`);
  assert.equal(formatWholesaleReceipt(item.items), `WHOLESALE\n${item.body}`);
  assert.equal(JSON.stringify(item.items), before);
}
console.log('Receipt public behavior checks passed for both formats.');
