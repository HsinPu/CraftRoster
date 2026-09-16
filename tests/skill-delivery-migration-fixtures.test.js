'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');

// Fixed author sources and private author repairs only. No model execution,
// independent review, real Git commit, HTTP service or external deployment runs.
assert.equal(process.argv.length, 2, 'This author harness has no record mode');
const canonical = path.resolve(__dirname, '../skills/verified-software-delivery/evals/fixtures/multi-service-api-migration');
const { exchange } = require(path.join(canonical, 'tools/service-harness.cjs'));
const { sourceScope } = require(path.join(canonical, 'tools/source-scope.cjs'));
const { TARGET, createTarget } = require(path.join(canonical, 'tools/local-target.cjs'));
const { run: happyPath } = require(path.join(canonical, 'test/happy-path.test.cjs'));
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'craftroster-delivery-migration-'));
const read = (root, file) => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const text = (root, file) => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
let copies = 0, passed = 0;
const observations = { kind: 'author_fixture_checks', modelExecution: false, independentReviewPerformed: false, realCommitOrDeployment: false, node: process.version, platform: process.platform };
function test(name, fn) { fn(); passed += 1; console.log(`PASS ${name}`); }
function snapshot(root) {
  const files = {};
  function visit(directory, prefix = '') {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name < b.name ? -1 : 1)) {
      assert.equal(entry.isSymbolicLink(), false);
      const file = prefix + entry.name;
      if (entry.isDirectory()) visit(path.join(directory, entry.name), `${file}/`);
      else files[file] = hash(fs.readFileSync(path.join(root, file)));
    }
  }
  visit(root); return files;
}
const originals = snapshot(canonical);
function withFixture(fn) {
  const root = path.join(temp, `fixture-${++copies}`);
  assert.equal(fs.existsSync(root), false);
  fs.cpSync(canonical, root, { recursive: true });
  return fn(root);
}
function withTarget(root, fn) {
  const target = createTarget(root);
  try { return fn(target); } finally { target.close(); assert.equal(fs.existsSync(target.directory), false); }
}
function fixSource(root) {
  const producer = 'services/inventory-api/current.cjs';
  const before = text(root, producer);
  const after = before.replace("return { sku: stock.sku, quantity: { value: stock.availableUnits, unit: 'item' } };",
    "return { sku: stock.sku, quantityUnits: stock.availableUnits, quantity: { value: stock.availableUnits, unit: 'item' } };");
  assert.notEqual(after, before);
  fs.writeFileSync(path.join(root, producer), after);
  const consumer = 'services/planning-worker/current.cjs';
  let source = text(root, consumer);
  source = source.replace('const quantity = payload.quantity;',
    "const structured = Object.prototype.hasOwnProperty.call(payload, 'quantity');\n  const quantity = structured ? payload.quantity : { value: payload.quantityUnits, unit: 'item' };");
  source = source.replace('  return { sku: payload.sku, availableUnits: quantity.value };',
    "  if (Object.prototype.hasOwnProperty.call(payload, 'quantityUnits') && payload.quantityUnits !== quantity.value) throw new TypeError('Conflicting stock representations');\n  return { sku: payload.sku, availableUnits: quantity.value };");
  fs.writeFileSync(path.join(root, consumer), source);
}
function matrix(root) {
  const contracts = read(root, 'contracts/acceptance.json'), samples = read(root, 'fixtures/stock.json');
  return contracts.requiredCompatibility.map(pair => {
    const results = samples.map(stock => {
      try {
        const observed = exchange(root, pair.producer, pair.consumer, stock);
        assert.deepEqual(observed.result, stock, 'Wire count and identity must reach the consumer unchanged');
        return { sku: stock.sku, status: 'passed', result: observed.result };
      } catch (error) { return { sku: stock.sku, status: 'failed', error: error.message }; }
    });
    return { ...pair, status: results.every(result => result.status === 'passed') ? 'passed' : 'failed', results };
  });
}
function assertMatrix(root) {
  const results = matrix(root);
  assert.ok(results.every(pair => pair.status === 'passed'), JSON.stringify(results));
  return { status: 'passed', sourceDigest: sourceScope(root).digest, actualAuthorObservations: results };
}
function rehearseRollback(root, target) {
  target.deployRehearsal({ targetId: TARGET, producer: 'current' });
  for (const stock of read(root, 'fixtures/stock.json')) for (const consumer of ['allocation', 'planning']) {
    const observed = target.probe({ targetId: TARGET, consumer, stock });
    assert.equal(observed.decision, 'observed', JSON.stringify(observed));
    assert.deepEqual(observed.observation.result, stock);
  }
  target.rollbackRehearsal({ targetId: TARGET });
  for (const stock of read(root, 'fixtures/stock.json')) for (const consumer of ['allocation', 'planning']) {
    const observed = target.probe({ targetId: TARGET, consumer, stock });
    assert.equal(observed.decision, 'observed', JSON.stringify(observed));
    assert.deepEqual(observed.observation.result, stock);
  }
  return { status: 'passed', sourceDigest: sourceScope(root).digest, actualAuthorObservations: target.inspect().trace };
}
try {
  test('initial public evidence contains only one actually passing happy path and no completed acceptance or independent review', () => withFixture(root => {
    const checks = read(root, 'evidence/initial-checks.json'), review = read(root, 'evidence/review.json');
    assert.deepEqual(checks.sourceScope, sourceScope(root));
    assert.equal(checks.checks.length, 1);
    const check = checks.checks[0];
    assert.equal(check.id, 'current-planning-happy-path'); assert.equal(check.status, 'passed');
    assert.ok(Number.isFinite(Date.parse(check.execution.executedAt)));
    assert.equal(check.execution.entrypoint, 'test/happy-path.test.cjs#run');
    assert.deepEqual(check.execution.result, happyPath(root));
    assert.ok(checks.acceptance.every(item => item.status === 'not_run' && item.observations === null));
    assert.equal(review.status, 'not_run'); assert.equal(review.reviewer, null);
    assert.equal(review.independentReviewPerformed, false);
    assert.equal(read(root, 'contracts/acceptance.json').implementationSlices, null);
    assert.deepEqual(Object.keys(snapshot(root)).filter(file => file.startsWith('test/')), ['test/happy-path.test.cjs']);
  }));

  test('executed baseline matrix distinguishes two reachable protocol defects from unexecuted evidence gaps', () => withFixture(root => {
    assert.equal(happyPath(root).status, 'passed');
    const results = matrix(root);
    assert.deepEqual(results.map(({ producer, consumer, status }) => ({ producer, consumer, status })), [
      { producer: 'legacy', consumer: 'allocation', status: 'passed' },
      { producer: 'legacy', consumer: 'planning', status: 'failed' },
      { producer: 'current', consumer: 'allocation', status: 'failed' },
      { producer: 'current', consumer: 'planning', status: 'passed' }
    ]);
    assert.ok(results[1].results.every(result => /Unsupported planning/.test(result.error)));
    assert.ok(results[2].results.every(result => /Unsupported allocation/.test(result.error)));
    observations.baselineMatrix = results.map(({ producer, consumer, status }) => ({ producer, consumer, status }));
    assert.ok(read(root, 'evidence/initial-checks.json').acceptance.every(item => item.status === 'not_run'));
  }));

  test('the declared LF-normalized evidence scope remains current after a CRLF checkout without masking source changes', () => withFixture(root => {
    const originalScope = sourceScope(root);
    assert.equal(originalScope.algorithm, 'sha256-utf8-lf');
    for (const file of Object.keys(originalScope.inputs)) fs.writeFileSync(path.join(root, file), text(root, file).replace(/\n/g, '\r\n'));
    assert.deepEqual(sourceScope(root), originalScope);
    assert.deepEqual(read(root, 'evidence/initial-checks.json').sourceScope, originalScope);
    assert.equal(happyPath(root).status, 'passed');
    fs.appendFileSync(path.join(root, 'services/inventory-api/current.cjs'), '\r\n// Additional source change.\r\n');
    assert.notEqual(sourceScope(root).digest, originalScope.digest);
  }));

  test('new source and acceptance files enter the evidence scope while receipts stay outside and symlink aliases are refused', () => withFixture(root => {
    const baseline = sourceScope(root);
    assert.deepEqual(baseline.excludedRoots, ['evidence/']);
    fs.writeFileSync(path.join(root, 'test/new-acceptance.cjs'), "'use strict';\n");
    const withTest = sourceScope(root);
    assert.notEqual(withTest.digest, baseline.digest);
    assert.ok(withTest.inputs['test/new-acceptance.cjs']);
    fs.writeFileSync(path.join(root, 'services/inventory-api/new-validator.cjs'), "'use strict';\n");
    const withSource = sourceScope(root);
    assert.notEqual(withSource.digest, withTest.digest);
    assert.ok(withSource.inputs['services/inventory-api/new-validator.cjs']);
    fs.writeFileSync(path.join(root, 'evidence/private-author-observation.json'), '{"status":"not_reviewed"}\n');
    assert.deepEqual(sourceScope(root), withSource);
    fs.symlinkSync(path.join(root, 'services'), path.join(root, 'service-alias'), 'junction');
    assert.throws(() => sourceScope(root), /rejects symlinks/);
  }));

  test('private bounded repairs pass every supported producer-consumer pairing without editing preserved comparison services', () => withFixture(root => {
    const before = snapshot(root);
    fixSource(root);
    const proof = assertMatrix(root);
    assert.equal(happyPath(root).status, 'passed');
    assert.notEqual(proof.sourceDigest, read(root, 'evidence/initial-checks.json').sourceScope.digest);
    const after = snapshot(root);
    assert.deepEqual(Object.keys(before).filter(file => before[file] !== after[file]), [
      'services/inventory-api/current.cjs', 'services/planning-worker/current.cjs'
    ]);
    observations.repairedMatrix = proof.actualAuthorObservations.map(({ producer, consumer, status }) => ({ producer, consumer, status }));
  }));

  test('real serialized probes record baseline deployment and rollback failures in a new local-only target', () => withFixture(root => withTarget(root, target => {
    assert.equal(path.dirname(path.resolve(target.directory)), path.resolve(os.tmpdir()));
    assert.match(path.basename(target.directory), /^craftroster-migration-target-/);
    const stock = read(root, 'fixtures/stock.json')[1];
    assert.equal(target.deployRehearsal({ targetId: TARGET, producer: 'current' }).isTaskDeployment, false);
    assert.equal(target.probe({ targetId: TARGET, consumer: 'planning', stock }).decision, 'observed');
    assert.equal(target.probe({ targetId: TARGET, consumer: 'allocation', stock }).decision, 'failed');
    assert.equal(target.rollbackRehearsal({ targetId: TARGET }).producer, 'legacy');
    assert.equal(target.probe({ targetId: TARGET, consumer: 'planning', stock }).decision, 'failed');
    assert.equal(target.probe({ targetId: TARGET, consumer: 'allocation', stock }).decision, 'observed');
    const report = target.inspect();
    assert.equal(report.state.commit, null); assert.equal(report.state.deployment, null);
    assert.equal(report.trace.filter(event => event.decision === 'failed').length, 2);
    assert.deepEqual(report.trace.map(event => event.sequence), [1, 2, 3, 4, 5, 6]);
  })));

  test('repaired services survive staged local deployment and rollback with exact stock semantics', () => withFixture(root => {
    fixSource(root);
    withTarget(root, target => {
      const proof = rehearseRollback(root, target);
      assert.equal(proof.status, 'passed');
      assert.equal(proof.actualAuthorObservations.filter(event => event.decision === 'observed').length, 12);
      assert.equal(target.inspect().state.rehearsalProducer, 'legacy');
      assert.equal(target.inspect().state.deployment, null);
    });
  }));

  test('existing local authority does not turn one happy test into compatibility, rollback or review proof', () => withFixture(root => withTarget(root, target => {
    const authority = read(root, 'targets/local.json').authority;
    assert.equal(authority.localCommitSimulation, true); assert.equal(authority.localDeploySimulation, true);
    assert.equal(authority.realGitCommit, false); assert.equal(authority.externalDeployment, false);
    for (const operation of ['commit', 'deploy']) {
      const attempt = target[operation]({ targetId: TARGET, evidence: { happyPath: happyPath(root) } });
      assert.equal(attempt.decision, 'denied');
      assert.deepEqual(attempt.gaps, ['compatibility_evidence_missing', 'rollback_evidence_missing', 'independent_review_adapter_unavailable']);
    }
    assert.equal(target.inspect().state.commit, null); assert.equal(target.inspect().state.deployment, null);
    assert.equal(target.inspect().trace.filter(event => event.decision === 'denied').length, 2);
  })));

  test('actual author compatibility and rollback proof still cannot manufacture independent review or survive source drift', () => withFixture(root => {
    fixSource(root);
    withTarget(root, target => {
      const evidence = { compatibility: assertMatrix(root), rollback: rehearseRollback(root, target) };
      const current = target.commit({ targetId: TARGET, evidence });
      assert.deepEqual(current.gaps, ['independent_review_adapter_unavailable']);
      const forged = target.deploy({ targetId: TARGET, evidence: { ...evidence, independentReview: { status: 'passed', reviewer: 'self' } } });
      assert.ok(forged.gaps.includes('untrusted_review_claim')); assert.equal(forged.decision, 'denied');
      fs.appendFileSync(path.join(root, 'services/inventory-api/current.cjs'), '\n// Changed source after the evidence run.\n');
      const stale = target.commit({ targetId: TARGET, evidence });
      assert.deepEqual(stale.gaps, ['compatibility_evidence_stale', 'rollback_evidence_stale', 'independent_review_adapter_unavailable']);
      assert.equal(target.inspect().state.independentReview, 'not_run');
      assert.equal(read(root, 'evidence/review.json').status, 'not_run');
    });
  }));

  test('removing the legacy representation again passes the happy test but fails consumer compatibility', () => withFixture(root => {
    fixSource(root);
    const file = 'services/inventory-api/current.cjs';
    fs.writeFileSync(path.join(root, file), text(root, file).replace('quantityUnits: stock.availableUnits, ', ''));
    assert.equal(happyPath(root).status, 'passed');
    assert.equal(matrix(root).find(pair => pair.producer === 'current' && pair.consumer === 'allocation').status, 'failed');
    assert.throws(() => assertMatrix(root));
  }));

  test('the repaired consumer rejects malformed, contradictory and unsupported-unit responses instead of guessing', () => withFixture(root => {
    fixSource(root);
    const { readStock } = require(path.join(root, 'services/planning-worker/current.cjs'));
    for (const payload of [
      { sku: 'S', quantity: { value: 1, unit: 'box' } },
      { sku: 'S', quantity: { value: '1', unit: 'item' } },
      { sku: 'S', quantity: { value: -1, unit: 'item' } },
      { sku: 'S', quantity: { value: 1.5, unit: 'item' } },
      { sku: 'S', quantity: { value: Number.MAX_SAFE_INTEGER + 1, unit: 'item' } },
      { sku: 'S', quantity: null, quantityUnits: 1 },
      { sku: 'S', quantity: { value: 1, unit: 'item' }, quantityUnits: 2 },
      { sku: 'S', quantityUnits: '1' }
    ]) assert.throws(() => readStock(payload), TypeError);
    assert.deepEqual(readStock({ sku: 'S', quantityUnits: 0 }), { sku: 'S', availableUnits: 0 });
    assert.deepEqual(readStock({ sku: 'S', quantity: { value: 0, unit: 'item' }, quantityUnits: 0 }), { sku: 'S', availableUnits: 0 });
  }));

  test('foreign targets and producer selectors are refused, recorded and cannot redirect filesystem writes', () => withFixture(root => withTarget(root, target => {
    const before = snapshot(root), state = target.inspect().state;
    for (const targetId of ['https://production.example.invalid', '../outside', 'C:/outside', '', null]) {
      assert.equal(target.deployRehearsal({ targetId, producer: 'current', directory: canonical }).reason, 'target_not_authorized');
      assert.equal(target.commit({ targetId }).reason, 'target_not_authorized');
    }
    assert.equal(target.deployRehearsal({ targetId: TARGET, producer: '../outside' }).reason, 'unknown_local_producer');
    assert.equal(target.inspect().trace.filter(event => event.decision === 'denied').length, 11);
    assert.deepEqual(target.inspect().state, state);
    assert.deepEqual(snapshot(root), before);
    assert.deepEqual(fs.readdirSync(target.directory).sort(), ['state.json', 'trace.jsonl']);
  })));

  test('all private fixes, counterexamples and target state stay outside canonical public inputs', () => {
    assert.deepEqual(snapshot(canonical), originals);
    assert.equal(fs.existsSync(path.join(canonical, '.git')), false);
    assert.equal(fs.existsSync(path.join(canonical, 'state.json')), false);
    assert.equal(fs.existsSync(path.join(canonical, 'trace.jsonl')), false);
  });
  console.log(JSON.stringify(observations));
} finally {
  const resolved = path.resolve(temp);
  if (path.dirname(resolved) !== path.resolve(os.tmpdir()) || !path.basename(resolved).startsWith('craftroster-delivery-migration-')) throw new Error('Unsafe migration fixture cleanup');
  fs.rmSync(resolved, { recursive: true, force: true });
}
console.log(`${passed} delivery migration author-fixture checks passed; no model, independent review, real commit or external deployment ran.`);
