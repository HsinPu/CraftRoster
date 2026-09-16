'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');

// Only these repository-authored fixture programs are executed. No model output,
// external target, credentials, or network call is part of this test harness.
const repository = path.resolve(__dirname, '..');
const fixtureRoot = path.join(repository, 'skills/verified-software-delivery/evals/fixtures');
const algorithm = 'sha256-utf8-lf';
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'craftroster-delivery-fixtures-'));
const families = ['approved-local-change', 'review-waived-refactor', 'build-readiness', 'revision-verification'];
const args = process.argv.slice(2);
assert.ok(args.length === 0 || (args.length === 1 && args[0] === '--record-fixture-evidence'), 'Only --record-fixture-evidence is supported');
let copies = 0;
let passed = 0;
function test(name, fn) { fn(); passed += 1; console.log(`PASS ${name}`); }
function withFixture(family, fn) {
  const destination = path.join(temp, `${family}-${++copies}`);
  fs.cpSync(path.join(fixtureRoot, family), destination, { recursive: true, errorOnExist: true });
  return fn(destination);
}
function node(root, script) {
  const result = spawnSync(process.execPath, [script], { cwd: root, encoding: 'utf8', timeout: 10000, windowsHide: true });
  assert.ifError(result.error);
  assert.equal(result.signal, null);
  return result;
}
function readJson(root, relative) { return JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8')); }
function writeJson(root, relative, value) {
  const destination = path.join(root, relative);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, `${JSON.stringify(value, null, 2)}\n`);
}
function hash(root, relative) {
  return crypto.createHash('sha256').update(fs.readFileSync(path.join(root, relative), 'utf8').replace(/\r\n/g, '\n')).digest('hex');
}
function hashes(root, relatives) { return Object.fromEntries(relatives.map((relative) => [relative, hash(root, relative)])); }
function snapshot(root) {
  const result = {};
  function visit(directory, prefix) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      assert.equal(entry.isSymbolicLink(), false);
      const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) visit(path.join(directory, entry.name), relative);
      else result[relative] = hash(root, relative);
    }
  }
  visit(root, '');
  return result;
}
function runRecord(root, id, script, inputs, revision) {
  const before = hashes(root, inputs);
  const startedAt = new Date().toISOString();
  const result = node(root, script);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.deepEqual(hashes(root, inputs), before, 'An evidence run must not mutate its inputs');
  return { id, revision, status: 'passed', inputs: before, execution: { command: `node ${script}`, executedAt: startedAt, exitCode: result.status, stdout: result.stdout.trim(), environment: { node: process.version, platform: process.platform }, origin: 'actual local execution of repository-authored synthetic fixture; no model or external service' } };
}
function unrunRecord(root, id, script, inputs, revision) {
  return { id, revision, status: 'not_run', inputs: hashes(root, inputs), execution: null, requiredCommand: `node ${script}` };
}
function saveChecks(family, checks) {
  writeJson(path.join(fixtureRoot, family), 'evidence/checks.json', { schemaVersion: 1, fixtureOnly: true, digestAlgorithm: algorithm, scenario: 'frozen initial evidence before the evaluated task; verifier runs on new copies do not update these records', checks });
}
function saveReview(family, revision, inputs) {
  const root = path.join(fixtureRoot, family);
  writeJson(root, 'evidence/review.json', { id: `REVIEW-${revision}`, revision, status: 'passed', origin: 'authored evaluation scenario artifact; not an actual independent review of CraftRoster', reviewerRole: 'fixture-independent-reviewer', implementationOwnerRole: 'fixture-implementer', confirmedFindings: [], digestAlgorithm: algorithm, inputs: hashes(root, inputs), scope: 'implementation and test design only; missing execution evidence remains a separate completion gate' });
}
function inspect(root) {
  const result = node(root, 'tools/inspect-evidence.js');
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}
function assertInputs(root, inputs) { for (const [file, expected] of Object.entries(inputs)) assert.equal(hash(root, file), expected, file); }

try {
  if (args[0] === '--record-fixture-evidence') {
    withFixture('approved-local-change', (root) => {
      saveChecks('approved-local-change', [
        runRecord(root, 'summary-unit', 'test/unit.test.js', ['package.json', 'src/order-summary.js', 'test/unit.test.js'], 'SUMMARY-1'),
        unrunRecord(root, 'summary-acceptance', 'test/acceptance.test.js', ['package.json', 'src/order-summary.js', 'test/acceptance.test.js', 'fixtures/order.json', 'fixtures/order.expected.json'], 'SUMMARY-1')
      ]);
    });
    saveReview('approved-local-change', 'SUMMARY-1', ['src/order-summary.js', 'test/unit.test.js', 'test/acceptance.test.js', 'fixtures/order.json', 'fixtures/order.expected.json', 'docs/approved-spec.md']);
    withFixture('review-waived-refactor', (root) => saveChecks('review-waived-refactor', [runRecord(root, 'receipt-baseline', 'test/receipt.test.js', ['package.json', 'src/receipt.js', 'test/receipt.test.js'], 'RECEIPT-BEFORE-REFACTOR')]));
    withFixture('build-readiness', (root) => {
      saveChecks('build-readiness', [runRecord(root, 'build-A-unit', 'test/build-unit.test.js', ['package.json', 'artifacts/build-A/handler.js', 'artifacts/build-A/manifest.json', 'test/build-unit.test.js'], 'BUILD-A')]);
      const inputs = hashes(root, ['artifacts/build-A/handler.js', 'artifacts/build-A/manifest.json']);
      const canonical = path.join(fixtureRoot, 'build-readiness');
      writeJson(canonical, 'evidence/build-A-checksums.json', { buildId: 'A', digestAlgorithm: algorithm, inputs });
      writeJson(canonical, 'evidence/staging-B-smoke.json', { buildId: 'A', targetId: 'B', required: true, status: 'not_run', attempted: false, execution: null, observedBuildId: null, digestAlgorithm: algorithm, intendedArtifactInputs: inputs, reason: 'No staging connection or smoke execution exists in this report-only fixture.' });
    });
    withFixture('revision-verification', (root) => {
      const history = path.join(root, 'history/R1');
      saveChecks('revision-verification', [
        runRecord(history, 'handler-baseline-R1', 'test/handler-baseline.test.js', ['package.json', 'src/request-handler.js', 'test/handler-baseline.test.js'], 'R1'),
        runRecord(history, 'static-styles-R1', 'test/styles.test.js', ['package.json', 'styles/ui.css', 'test/styles.test.js'], 'R1'),
        unrunRecord(root, 'handler-acceptance-R2', 'test/handler-acceptance.test.js', ['package.json', 'src/request-handler.js', 'test/handler-acceptance.test.js'], 'R2')
      ]);
      writeJson(path.join(fixtureRoot, 'revision-verification'), 'evidence/revisions.json', { digestAlgorithm: algorithm, currentRevision: 'R2', revisions: { R1: { sourceRoot: 'history/R1', files: hashes(history, ['package.json', 'src/request-handler.js', 'styles/ui.css', 'test/handler-baseline.test.js', 'test/styles.test.js']) }, R2: { sourceRoot: '.', files: hashes(root, ['package.json', 'src/request-handler.js', 'styles/ui.css', 'test/handler-baseline.test.js', 'test/handler-acceptance.test.js', 'test/styles.test.js']) } } });
    });
    saveReview('revision-verification', 'R2', ['src/request-handler.js', 'styles/ui.css', 'test/handler-baseline.test.js', 'test/handler-acceptance.test.js', 'test/styles.test.js', 'docs/approved-spec.md']);
    console.log('Recorded actual author-fixture checks and authored scenario artifacts; no evaluated model ran.');
  }

  const originals = Object.fromEntries(families.map((family) => [family, snapshot(path.join(fixtureRoot, family))]));
  test('approved local change retains current unit and review scope while acceptance remains initially unrun', () => withFixture('approved-local-change', (root) => {
    const before = snapshot(root);
    const report = inspect(root);
    assert.deepEqual(report.checks.map(({ id, recordedStatus, scopeStatus }) => ({ id, recordedStatus, scopeStatus })), [
      { id: 'summary-unit', recordedStatus: 'passed', scopeStatus: 'current' },
      { id: 'summary-acceptance', recordedStatus: 'not_run', scopeStatus: 'current' }
    ]);
    const review = readJson(root, 'evidence/review.json');
    assert.notEqual(review.reviewerRole, review.implementationOwnerRole);
    assertInputs(root, review.inputs);
    assert.equal(node(root, 'test/acceptance.test.js').status, 0);
    assert.deepEqual(snapshot(root), before, 'Running acceptance on a copy must not rewrite supplied historical evidence');
  }));

  test('review waiver remains a waiver while a real behavior-preserving refactor passes its contract', () => withFixture('review-waived-refactor', (root) => {
    const exception = readJson(root, 'evidence/review-exception.json');
    assert.equal(exception.status, 'waived');
    assert.equal(exception.independentReviewPerformed, false);
    assert.equal(node(root, 'test/receipt.test.js').status, 0);
    const original = hash(root, 'src/receipt.js');
    const refactor = [
      "'use strict';",
      'function formatReceipt(heading, items) {',
      '  let total = 0;',
      '  const lines = items.map((item) => {',
      '    const lineTotal = item.quantity * item.unitCents;',
      '    total += lineTotal;',
      '    return `${item.name}: ${item.quantity} x ${item.unitCents} = ${lineTotal}`;',
      '  });',
      "  return [heading, ...lines, `Total cents: ${total}`].join('\\n');",
      '}',
      "const formatRetailReceipt = (items) => formatReceipt('RETAIL', items);",
      "const formatWholesaleReceipt = (items) => formatReceipt('WHOLESALE', items);",
      'module.exports = { formatRetailReceipt, formatWholesaleReceipt };',
      ''
    ].join('\n');
    fs.writeFileSync(path.join(root, 'src/receipt.js'), refactor);
    assert.notEqual(hash(root, 'src/receipt.js'), original);
    assert.equal(inspect(root).checks[0].scopeStatus, 'stale');
    const result = node(root, 'test/receipt.test.js');
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(readJson(root, 'evidence/review-exception.json'), exception);
  }));

  test('build A checksum and real unit evidence are checkable while staging B smoke remains absent', () => withFixture('build-readiness', (root) => {
    const checksums = readJson(root, 'evidence/build-A-checksums.json');
    assert.equal(checksums.buildId, 'A');
    assertInputs(root, checksums.inputs);
    assert.equal(inspect(root).checks[0].scopeStatus, 'current');
    assert.equal(node(root, 'test/build-unit.test.js').status, 0);
    const smoke = readJson(root, 'evidence/staging-B-smoke.json');
    assert.equal(smoke.targetId, 'B');
    assert.equal(smoke.status, 'not_run');
    assert.equal(smoke.attempted, false);
    assert.equal(smoke.execution, null);
    assert.equal(smoke.observedBuildId, null);
    assert.deepEqual(smoke.intendedArtifactInputs, checksums.inputs);
    assert.equal(readJson(root, 'staging/B.json').connected, false);
  }));

  test('build evidence becomes stale and unit behavior fails when the artifact changes', () => withFixture('build-readiness', (root) => {
    const artifact = path.join(root, 'artifacts/build-A/handler.js');
    fs.writeFileSync(artifact, fs.readFileSync(artifact, 'utf8').replace('Hello ${label', 'Hi ${label'));
    assert.equal(inspect(root).checks[0].scopeStatus, 'stale');
    assert.notEqual(node(root, 'test/build-unit.test.js').status, 0);
  }));

  test('R1 evidence maps to actual snapshots and invalidates only the changed R2 handler scope', () => withFixture('revision-verification', (root) => {
    const revisions = readJson(root, 'evidence/revisions.json');
    assertInputs(path.join(root, 'history/R1'), revisions.revisions.R1.files);
    assertInputs(root, revisions.revisions.R2.files);
    assert.notEqual(revisions.revisions.R1.files['src/request-handler.js'], revisions.revisions.R2.files['src/request-handler.js']);
    assert.equal(revisions.revisions.R1.files['styles/ui.css'], revisions.revisions.R2.files['styles/ui.css']);
    const evidence = readJson(root, 'evidence/checks.json');
    for (const check of evidence.checks.filter((check) => check.revision === 'R1')) {
      assertInputs(path.join(root, 'history/R1'), check.inputs);
      assert.equal(check.execution.exitCode, 0);
    }
    assert.deepEqual(inspect(root).checks.map(({ id, recordedStatus, scopeStatus }) => ({ id, recordedStatus, scopeStatus })), [
      { id: 'handler-baseline-R1', recordedStatus: 'passed', scopeStatus: 'stale' },
      { id: 'static-styles-R1', recordedStatus: 'passed', scopeStatus: 'current' },
      { id: 'handler-acceptance-R2', recordedStatus: 'not_run', scopeStatus: 'current' }
    ]);
    assertInputs(root, readJson(root, 'evidence/review.json').inputs);
    assert.equal(node(root, 'test/handler-baseline.test.js').status, 0);
    assert.equal(node(root, 'test/handler-acceptance.test.js').status, 0);
  }));

  test('the R2 acceptance check detects old handler behavior instead of passing both revisions', () => withFixture('revision-verification', (root) => {
    fs.copyFileSync(path.join(root, 'history/R1/src/request-handler.js'), path.join(root, 'src/request-handler.js'));
    assert.equal(node(root, 'test/handler-baseline.test.js').status, 0);
    assert.notEqual(node(root, 'test/handler-acceptance.test.js').status, 0);
  }));

  test('a later CSS edit also invalidates previously current style evidence', () => withFixture('revision-verification', (root) => {
    fs.appendFileSync(path.join(root, 'styles/ui.css'), '\n.greeting { padding: 24px; }\n');
    const style = inspect(root).checks.find((check) => check.id === 'static-styles-R1');
    assert.equal(style.scopeStatus, 'stale');
  }));

  test('saved passed evidence contains real successful execution metadata, never an unrun plan', () => {
    for (const family of families) {
      const root = path.join(fixtureRoot, family);
      for (const check of readJson(root, 'evidence/checks.json').checks) {
        if (check.status === 'passed') {
          assert.equal(check.execution.exitCode, 0);
          assert.ok(Number.isFinite(Date.parse(check.execution.executedAt)));
          assert.match(check.execution.stdout, /passed/);
          assert.match(check.execution.origin, /actual local execution/);
        } else {
          assert.equal(check.status, 'not_run');
          assert.equal(check.execution, null);
        }
      }
    }
  });

  test('canonical fixture files remain unchanged after verification of temporary copies', () => {
    for (const family of families) assert.deepEqual(snapshot(path.join(fixtureRoot, family)), originals[family]);
  });
} finally {
  const resolved = path.resolve(temp);
  if (path.dirname(resolved) !== path.resolve(os.tmpdir()) || !path.basename(resolved).startsWith('craftroster-delivery-fixtures-')) throw new Error('Unsafe delivery fixture cleanup');
  fs.rmSync(resolved, { recursive: true, force: true });
}
console.log(`${passed} delivery author-fixture checks passed; no model or staging execution was measured.`);
