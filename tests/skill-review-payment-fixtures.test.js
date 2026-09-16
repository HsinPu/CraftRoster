'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const fixture = path.resolve(__dirname, '../skills/code-review/evals/fixtures/payment-retry-review');
const { SubmissionStore } = require(path.join(fixture, 'shared/submission-store.cjs'));
const { LocalProvider } = require(path.join(fixture, 'shared/local-provider.cjs'));
const { checkout } = require(path.join(fixture, 'shared/checkout.cjs'));
const { runPublicChecks } = require(path.join(fixture, 'test/payment.test.cjs'));
const services = Object.fromEntries(['base', 'head'].map(v => [v, require(path.join(fixture, v, 'payment-service.cjs'))]));
const { buildBundle } = require('../scripts/prepare-skill-pilot');
const { createBroker } = require('../scripts/lib/skill-eval-broker');
const hash = text => crypto.createHash('sha256').update(text).digest('hex');
const args = process.argv.slice(2);
assert.ok(args.length === 0 || (args.length === 1 && args[0] === '--record-fixture-evidence'));
function inventory(omitEvidence = false) {
  const files = {};
  function visit(directory, relative = '') {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name < b.name ? -1 : 1)) {
      assert.equal(entry.isSymbolicLink(), false);
      const file = relative + entry.name;
      if (omitEvidence && file === 'evidence') continue;
      if (entry.isDirectory()) visit(path.join(directory, entry.name), file + '/');
      else files[file] = hash(fs.readFileSync(path.join(directory, entry.name), 'utf8').replace(/\r\n/g, '\n'));
    }
  }
  visit(fixture);
  return files;
}
// Author-only execution. This never accepts or runs model-authored code.
if (args.length) {
  const checks = ['base', 'head'].map(variant => ({ command: `node test/payment.test.cjs ${variant}`,
    executed_at: new Date().toISOString(), invocation: 'runPublicChecks in the same Node process', ...runPublicChecks(variant) }));
  const evidence = { schema_version: 1, kind: 'author_project_checks', fixture_only: true, model_execution: false,
    model_status: 'not_run', environment: { node: process.version, platform: process.platform },
    digest_algorithm: 'sha256-utf8-lf', inputs: inventory(true), checks,
    limitation: 'Only these four normal project checks per version ran; this is not a complete acceptance result or model review.' };
  fs.mkdirSync(path.join(fixture, 'evidence'), { recursive: true });
  fs.writeFileSync(path.join(fixture, 'evidence/author-checks.json'), JSON.stringify(evidence, null, 2) + '\n');
}
const original = inventory();
const parent = fs.realpathSync(os.tmpdir());
const temp = fs.mkdtempSync(path.join(parent, 'craftroster-review-payment-'));
let sequence = 0, passed = 0;
const order = { id: 'order-ambiguous', totalCents: 2400 };
function test(name, fn) { fn(); passed++; console.log(`PASS ${name}`); }
function environment(faults) {
  const prefix = `case-${++sequence}`;
  const storeFile = path.join(temp, `${prefix}-client.json`), providerFile = path.join(temp, `${prefix}-provider.json`);
  let generated = 0;
  return { storeFile, providerFile, store: new SubmissionStore(storeFile), provider: new LocalProvider(providerFile, faults),
    newKey: () => `${prefix}-attempt-${++generated}`, generated: () => generated };
}
function reopen(env) {
  return { ...env, store: new SubmissionStore(env.storeFile), provider: new LocalProvider(env.providerFile) };
}
try {
  test('ordinary project checks pass in both versions and match the scoped author receipt', () => {
    const receipt = JSON.parse(fs.readFileSync(path.join(fixture, 'evidence/author-checks.json')));
    assert.equal(receipt.model_execution, false);
    assert.equal(receipt.model_status, 'not_run');
    assert.deepEqual(receipt.inputs, inventory(true));
    for (const version of ['base', 'head']) {
      assert.deepEqual(runPublicChecks(version), { variant: version, checks: 4 });
      assert.equal(receipt.checks.find(c => c.variant === version).checks, 4);
    }
  });
  test('the persisted provider ledger returns one receipt for a reused key after a lost response and rejects changed payloads', () => {
    const env = environment(['timeout-after-accept']);
    const request = { orderId: order.id, amountCents: order.totalCents, idempotencyKey: 'stable-provider-key' };
    assert.throws(() => env.provider.submitPayment(request), { code: 'PROVIDER_TIMEOUT' });
    const provider = new LocalProvider(env.providerFile);
    const receipt = provider.submitPayment(request);
    assert.equal(provider.charges().length, 1);
    assert.equal(receipt.paymentId, provider.charges()[0].receipt.paymentId);
    assert.throws(() => provider.submitPayment({ ...request, amountCents: 2500 }), /payload conflict/);
    assert.equal(provider.charges().length, 1);
  });
  test('timeout after acceptance distinguishes the baseline recovery from the new automatic retry', () => {
    const before = environment(['timeout-after-accept']);
    assert.throws(() => checkout(order, services.base, before), { code: 'PROVIDER_TIMEOUT' });
    const pendingKey = before.store.get(order.id).idempotencyKey;
    checkout(order, services.base, reopen(before));
    assert.equal(before.provider.charges().length, 1);
    assert.equal(before.store.get(order.id).idempotencyKey, pendingKey);
    const after = environment(['timeout-after-accept']);
    const receipt = checkout(order, services.head, after);
    const charges = after.provider.charges();
    assert.equal(charges.length, 2);
    assert.equal(charges.reduce((sum, c) => sum + c.amountCents, 0), 4800);
    assert.equal(new Set(charges.map(c => c.idempotencyKey)).size, 2);
    assert.ok(charges.every(c => c.orderId === order.id));
    assert.deepEqual(receipt, charges[1].receipt);
    assert.equal(after.store.get(order.id).status, 'completed');
  });
  test('retry exhaustion leaves a pending record and reopening it reproduces another duplicate', () => {
    const env = environment(['timeout-after-accept', 'timeout-after-accept']);
    assert.throws(() => checkout(order, services.head, env), { code: 'PROVIDER_TIMEOUT' });
    assert.equal(env.generated(), 2);
    assert.equal(env.store.get(order.id).status, 'pending');
    assert.equal(env.provider.charges().length, 2);
    checkout(order, services.head, reopen(env));
    assert.equal(env.provider.charges().length, 3);
  });
  test('declines do not retry and distinct orders are not incorrectly deduplicated by amount', () => {
    const declined = environment(['declined']);
    assert.throws(() => checkout(order, services.head, declined), { code: 'PROVIDER_DECLINED' });
    assert.equal(declined.generated(), 1);
    assert.equal(declined.provider.charges().length, 0);
    const separate = environment([]);
    checkout(order, services.head, separate);
    checkout({ ...order, id: 'order-another' }, services.head, separate);
    assert.equal(separate.provider.charges().length, 2);
    checkout(order, services.head, reopen(separate));
    assert.equal(separate.provider.charges().length, 2);
  });
  test('the public package excludes the author oracle and its review broker rejects modifications', () => {
    const bundle = buildBundle({ skill: 'code-review', caseId: 12 });
    const publicPaths = bundle.publicFiles.filter(f => f.path.startsWith('workspace/')).map(f => f.path.slice(10)).sort();
    assert.deepEqual(publicPaths, Object.keys(original).sort());
    assert.ok(bundle.publicFiles.every(f => !f.path.includes('skill-review-payment-fixtures.test.js')));
    assert.equal(bundle.privateRecord.status, 'not_run');
    const broker = createBroker(bundle.publicFiles);
    const before = broker.inspect();
    for (const file of ['head/payment-service.cjs', 'shared/local-provider.cjs', 'docs/acceptance.md']) {
      const result = broker.call(JSON.stringify({ tool: 'write_file', arguments: { path: `workspace/${file}`, content: 'changed' } }));
      assert.equal(result.reason, 'write_not_granted');
    }
    assert.deepEqual(broker.inspect().final_manifest, before.initial_manifest);
  });
  test('author checks do not change the canonical source fixture', () => assert.deepEqual(inventory(), original));
  console.log(`${passed} payment author-fixture checks passed; no money, network, model review or full acceptance result.`);
} finally {
  assert.equal(path.dirname(path.resolve(temp)), parent);
  assert.ok(path.basename(temp).startsWith('craftroster-review-payment-'));
  fs.rmSync(temp, { recursive: true, force: true });
}
