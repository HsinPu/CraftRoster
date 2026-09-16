'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../skills/code-review/evals/fixtures/cross-platform-contract');
const { generate } = require(path.join(root, 'shared/generate-clients.cjs'));
const { runOrdinaryChecks } = require(path.join(root, 'shared/test/contract-smoke.cjs'));
const base = require(path.join(root, 'base/generated/orders-client.cjs'));
const head = require(path.join(root, 'head/generated/orders-client.cjs'));
const { orderView } = require(path.join(root, 'head/web/order-view.cjs'));
const { buildBundle } = require('../scripts/prepare-skill-pilot');
const { createBroker } = require('../scripts/lib/skill-eval-broker');
const parent = fs.realpathSync(os.tmpdir());
const temp = fs.mkdtempSync(path.join(parent, 'craftroster-review-platform-'));
const read = p => JSON.parse(fs.readFileSync(path.join(root, p)));
function snapshot() {
  return Object.fromEntries(fs.readdirSync(root, { recursive: true, withFileTypes: true }).filter(e => e.isFile()).map(e => {
    const file = path.join(e.parentPath, e.name);
    return [path.relative(root, file).replaceAll('\\', '/'), crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')];
  }).sort(([a], [b]) => a < b ? -1 : 1));
}
const original = snapshot();
let passed = 0;
function test(name, fn) { fn(); passed++; console.log(`PASS ${name}`); }
try {
  test('both ordinary suites and both generated language sources reproduce from their schemas without writes', () => {
    for (const version of ['base', 'head']) {
      assert.deepEqual(generate(version), ['orders-client.cjs', 'OrdersClient.swift']);
      assert.equal(runOrdinaryChecks(version).checks, 4);
    }
  });
  test('the wire change is additive and absent or null estimates retain their distinct declared meaning', () => {
    const old = read('base/schema/order.json'), current = read('head/schema/order.json');
    assert.deepEqual(current.required, old.required);
    for (const [name, property] of Object.entries(old.properties)) assert.deepEqual(current.properties[name], property);
    const minimal = { id: 'order-1', status: 'placed' };
    assert.deepEqual(head.decodeOrder(minimal), base.decodeOrder(minimal));
    assert.equal(orderView(minimal).estimate, 'Estimate unavailable');
    assert.equal(orderView({ ...minimal, estimatedDeliveryAtMs: null }).estimate, 'Estimate unavailable');
    assert.deepEqual(base.decodeOrder(read('shared/fixtures/order.json')), { id: 'order-fixture-17', status: 'shipped' });
  });
  test('the concrete Node web path misinterprets a valid millisecond value while decoding preserves it', () => {
    const input = read('shared/fixtures/order.json');
    assert.equal(head.decodeOrder(input).estimatedDeliveryAtMs, input.estimatedDeliveryAtMs);
    const expected = new Date(input.estimatedDeliveryAtMs).toISOString();
    assert.equal(expected, '2026-09-16T10:00:00.000Z');
    const actual = orderView(input);
    assert.notEqual(actual.estimate, expected);
    assert.equal(actual.estimate, new Date(input.estimatedDeliveryAtMs * 1000).toISOString());
    assert.equal(actual.orderId, input.id);
    assert.equal(actual.status, input.status);
  });
  test('a valid schema boundary exceeds the Date range only after the web unit conversion', () => {
    const input = { id: 'order-boundary', status: 'shipped', estimatedDeliveryAtMs: 8640000000000000 };
    assert.doesNotThrow(() => new Date(head.decodeOrder(input).estimatedDeliveryAtMs).toISOString());
    assert.throws(() => orderView(input), RangeError);
    for (const estimatedDeliveryAtMs of [-1, 1.5, '1789552800000', Infinity]) {
      assert.throws(() => head.decodeOrder({ ...input, estimatedDeliveryAtMs }), /Invalid estimate/);
    }
  });
  test('the actual public generation check detects manually altered derived files in an isolated copy', () => {
    const copy = path.join(temp, 'candidate');
    fs.cpSync(root, copy, { recursive: true });
    fs.appendFileSync(path.join(copy, 'head/generated/orders-client.cjs'), '// untracked manual edit\n');
    const copiedGenerator = require(path.join(copy, 'shared/generate-clients.cjs'));
    assert.throws(() => copiedGenerator.generate('head'), /Derived file drift/);
    assert.doesNotThrow(() => copiedGenerator.generate('base'));
  });
  test('source, derived, excluded and unavailable surfaces have concrete inputs without forged binary evidence', () => {
    const context = read('shared/ios/build-context.json');
    assert.equal(context.fictional, true);
    assert.equal(context.labelIsObservedBinaryIdentity, false);
    assert.equal(context.binaryArtifact, null);
    assert.equal(context.binarySha256, null);
    assert.equal(context.runtimeStatus, 'unavailable');
    assert.equal(context.actualBuildExecuted, false);
    assert.equal(context.modelReviewStatus, 'not_run');
    assert.ok(fs.existsSync(path.join(root, 'shared/ios/OrderRow.swift')));
    assert.ok(fs.existsSync(path.join(root, 'shared/legacy-export/export.cjs')));
    assert.ok(Object.keys(original).every(p => !/\.(ipa|app|dylib|exe)$/.test(p)));
  });
  test('the model input contains all public source surfaces but excludes private checks and cannot write them', () => {
    const bundle = buildBundle({ skill: 'code-review', caseId: 13 });
    assert.deepEqual(bundle.publicFiles.filter(f => f.path.startsWith('workspace/')).map(f => f.path.slice(10)).sort(), Object.keys(original).sort());
    assert.ok(bundle.publicFiles.every(f => !f.path.includes('skill-review-platform-fixtures.test.js')));
    assert.equal(bundle.privateRecord.status, 'not_run');
    const broker = createBroker(bundle.publicFiles);
    const before = broker.inspect();
    for (const file of ['head/schema/order.json', 'head/generated/orders-client.cjs', 'shared/ios/build-context.json']) {
      assert.equal(broker.call(JSON.stringify({ tool: 'write_file', arguments: { path: `workspace/${file}`, content: 'changed' } })).reason, 'write_not_granted');
    }
    assert.deepEqual(broker.inspect().final_manifest, before.initial_manifest);
    assert.deepEqual(snapshot(), original);
  });
  console.log(`${passed} platform-scope author-fixture checks passed; iOS binary, compiler, browser and model review remain unverified.`);
} finally {
  assert.equal(path.dirname(path.resolve(temp)), parent);
  assert.ok(path.basename(temp).startsWith('craftroster-review-platform-'));
  fs.rmSync(temp, { recursive: true, force: true });
}
