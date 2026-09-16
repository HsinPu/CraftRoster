'use strict';
const assert = require('node:assert/strict');
const path = require('node:path');
const { exchange } = require('../tools/service-harness.cjs');
function run(root = path.resolve(__dirname, '..')) {
  const sample = { sku: 'SYNTHETIC-REGULAR', availableUnits: 6 };
  assert.deepEqual(exchange(root, 'current', 'planning', sample).result, sample);
  return { checks: 1, producer: 'current', consumer: 'planning', status: 'passed' };
}
module.exports = { run };
if (require.main === module) console.log(JSON.stringify(run()));
