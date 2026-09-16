'use strict';
const assert = require('node:assert/strict');
const path = require('node:path');

async function run(root, variant) {
  assert.ok(['base', 'head'].includes(variant), 'Expected base or head');
  const { createCheckoutController } = require(path.join(root, variant, 'controller.cjs'));
  let attempts = 0;
  const controller = createCheckoutController(async method => {
    attempts += 1;
    if (attempts === 1) throw new Error('Quote unavailable. Please retry.');
    return { method, totalCents: method === 'standard' ? 1200 : 1800 };
  });
  const first = controller.select('express');
  assert.equal(controller.snapshot().status, 'loading');
  assert.equal(controller.confirm(), null);
  await first;
  assert.equal(controller.snapshot().status, 'error');
  assert.equal(controller.confirm(), null);
  await controller.retry();
  assert.equal(controller.snapshot().status, 'ready');
  assert.deepEqual(controller.confirm(), { method: 'express', totalCents: 1800 });
  controller.dispose();
  return { variant, status: 'passed', scope: 'sequential core controller only; no React DOM or browser execution' };
}

if (require.main === module) {
  run(path.resolve(__dirname, '../..'), process.argv[2]).then(result => {
    console.log(JSON.stringify(result));
  }).catch(error => { console.error(error); process.exitCode = 1; });
}
module.exports = { run };

