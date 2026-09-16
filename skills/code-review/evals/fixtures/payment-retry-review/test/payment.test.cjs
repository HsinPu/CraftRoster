'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { SubmissionStore } = require('../shared/submission-store.cjs');
const { LocalProvider } = require('../shared/local-provider.cjs');
const { checkout } = require('../shared/checkout.cjs');
function runPublicChecks(variant) {
  if (!['base', 'head'].includes(variant)) throw new Error('Expected base or head');
  const service = require(`../${variant}/payment-service.cjs`);
  const parent = fs.realpathSync(os.tmpdir());
  const temp = fs.mkdtempSync(path.join(parent, 'craftroster-payment-public-'));
  let serial = 0;
  const deps = faults => {
    serial++;
    let sequence = 0;
    return { store: new SubmissionStore(path.join(temp, `${serial}-client.json`)), provider: new LocalProvider(path.join(temp, `${serial}-provider.json`), faults), newKey: () => `public-${serial}-${++sequence}` };
  };
  let passed = 0;
  try {
    const ordinary = deps([]);
    const order = { id: 'order-normal', totalCents: 1250 };
    const receipt = checkout(order, service, ordinary);
    assert.equal(receipt.amountCents, 1250);
    assert.deepEqual(checkout(order, service, ordinary), receipt);
    assert.equal(ordinary.provider.charges().length, 1); passed++;
    assert.throws(() => checkout({ ...order, totalCents: 1300 }, service, ordinary), /immutable/); passed++;
    const invalid = deps([]);
    assert.throws(() => checkout({ id: 'order-invalid', totalCents: 0 }, service, invalid), /Invalid/);
    assert.equal(invalid.provider.charges().length, 0); passed++;
    const transient = deps(['timeout-before-accept']);
    if (variant === 'base') assert.throws(() => checkout(order, service, transient), { code: 'PROVIDER_TIMEOUT' });
    const retried = checkout(order, service, transient);
    assert.equal(retried.amountCents, 1250);
    assert.equal(transient.provider.charges().length, 1); passed++;
    return { variant, checks: passed };
  } finally {
    assert.equal(path.dirname(path.resolve(temp)), parent);
    assert.ok(path.basename(temp).startsWith('craftroster-payment-public-'));
    fs.rmSync(temp, { recursive: true, force: true });
  }
}
if (require.main === module) console.log(JSON.stringify(runPublicChecks(process.argv[2])));
module.exports = { runPublicChecks };
