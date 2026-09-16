'use strict';
const assert = require('node:assert/strict');
const { generate } = require('../generate-clients.cjs');
function runOrdinaryChecks(variant) {
  if (!['base', 'head'].includes(variant)) throw new Error('Unknown source view');
  generate(variant);
  const { decodeOrder } = require(`../../${variant}/generated/orders-client.cjs`);
  const { orderView } = require(`../../${variant}/web/order-view.cjs`);
  assert.deepEqual(decodeOrder({ id: 'order-1', status: 'placed', extra: true }), { id: 'order-1', status: 'placed' });
  assert.equal(orderView({ id: 'order-1', status: 'placed' }).estimate, 'Estimate unavailable');
  assert.throws(() => decodeOrder({ id: 1, status: 'placed' }), /Invalid/);
  assert.throws(() => decodeOrder({ id: 'order-1', status: 'unknown' }), /Invalid/);
  return { variant, checks: 4, runtime: 'Node; no Swift compiler, browser, or iOS binary execution' };
}
if (require.main === module) console.log(JSON.stringify(runOrdinaryChecks(process.argv[2])));
module.exports = { runOrdinaryChecks };
