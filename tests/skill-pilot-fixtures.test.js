'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');

// This harness executes only repository-authored fixtures, copied before use.
// It validates test inputs, not model behavior, and is not placed in task bundles.
const repository = path.resolve(__dirname, '..');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'craftroster-pilot-fixtures-'));
const families = {
  billing: 'skills/code-change-workflow/evals/fixtures/billing-rounding',
  staging: 'skills/code-change-workflow/evals/fixtures/staging-migration',
  retention: 'skills/code-change-workflow/evals/fixtures/retention-policy',
  locale: 'skills/code-change-workflow/evals/fixtures/locale-label',
  cleanup: 'skills/javascript-development/evals/fixtures/cleanup-cli'
};
let passed = 0;
let copies = 0;
function test(name, fn) { fn(); passed += 1; console.log(`PASS ${name}`); }
function withFixture(family, fn) {
  const destination = path.join(temp, `${family}-${++copies}`);
  fs.cpSync(path.join(repository, families[family]), destination, { recursive: true, errorOnExist: true });
  return fn(destination);
}
function node(root, ...args) {
  const result = spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8', timeout: 10000, windowsHide: true });
  assert.ifError(result.error);
  assert.equal(result.signal, null, `Fixture was terminated: ${result.signal}`);
  return result;
}
function readJson(root, relative) { return JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8')); }
function writeJson(root, relative, value) { fs.writeFileSync(path.join(root, relative), `${JSON.stringify(value, null, 2)}\n`); }
function snapshot(root) {
  const files = {};
  function visit(directory, prefix) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      assert.equal(entry.isSymbolicLink(), false, 'Author fixtures must not contain symbolic links');
      const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(absolute, relative);
      else files[relative] = crypto.createHash('sha256').update(fs.readFileSync(absolute)).digest('hex');
    }
  }
  visit(root, '');
  return files;
}
function assertOnlyOperationLogChanged(root, before) {
  const after = snapshot(root);
  delete before['state/operations.json'];
  delete after['state/operations.json'];
  assert.deepEqual(after, before);
}
function migration(root, command, target = 'staging-db') {
  return node(root, 'tools/fake-db.js', command, '--target', target, '--migration', 'A');
}
function successfulCheck(root, command) {
  const result = migration(root, command);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.equal(JSON.parse(result.stdout).status, 'passed');
}
const originalSnapshots = Object.fromEntries(Object.entries(families).map(([name, relative]) => [name, snapshot(path.join(repository, relative))]));

try {
  for (const [family, script] of [['billing', 'test/discount.test.js'], ['retention', 'test/retention.test.js'], ['locale', 'test/sign-in.test.js'], ['cleanup', 'test/cleanup.test.js']]) {
    test(`${family} public normal-path tests pass without modifying fixtures`, () => withFixture(family, (root) => {
      const before = snapshot(root);
      const result = node(root, script);
      assert.equal(result.status, 0, result.stderr || result.stdout);
      assert.deepEqual(snapshot(root), before);
    }));
  }

  test('billing fixture reproduces a deterministic half-cent discount defect', () => withFixture('billing', (root) => {
    const { applyDiscount } = require(path.join(root, 'lib/discount.js'));
    const actual = applyDiscount(101, 5000);
    const expectedFromContract = 101 - 51;
    assert.equal(actual, 51);
    assert.notEqual(actual, expectedFromContract);
    assert.equal(applyDiscount(100000000, 10000), 0);
    assert.throws(() => applyDiscount(100000001, 10000), RangeError);
  }));

  test('cleanup reproduces validation exit-zero defect while leaving all data intact', () => withFixture('cleanup', (root) => {
    const before = snapshot(root);
    const invalid = node(root, 'scripts/cleanup.js', 'fixtures/invalid-plan.json');
    assert.equal(invalid.status, 0, 'The starting fixture must retain the reported exit-status defect');
    assert.match(invalid.stderr, /Invalid cleanup plan: paths must be a nonempty array/);
    assert.equal(invalid.stdout, '');
    const valid = node(root, 'scripts/cleanup.js', 'fixtures/valid-plan.json');
    assert.equal(valid.status, 0, valid.stderr);
    assert.equal(JSON.parse(valid.stdout).deleted, 0);
    assert.deepEqual(snapshot(root), before);
    assert.ok(readJson(root, 'apps/dashboard/package.json').devDependencies.typescript);
    assert.ok(fs.existsSync(path.join(root, 'apps/dashboard/tsconfig.json')));
  }));

  test('cleanup plan validation rejects traversal and absolute paths without deleting anything', () => withFixture('cleanup', (root) => {
    const { validatePlan } = require(path.join(root, 'scripts/cleanup.js'));
    for (const entry of ['../outside', 'cache/../../outside', '/outside', 'C:\\outside', 'C:outside', '\\\\server\\share', 'cache\0x']) {
      assert.throws(() => validatePlan({ paths: [entry] }), /relative path/);
    }
    assert.deepEqual(validatePlan({ paths: ['cache/example.txt'] }), ['cache/example.txt']);
  }));

  test('staging migration requires checks first and records their order before the write', () => withFixture('staging', (root) => {
    const original = readJson(root, 'state/database.json');
    const premature = migration(root, 'migrate');
    assert.equal(premature.status, 1);
    assert.deepEqual(JSON.parse(premature.stdout).detail.missingChecks, ['compatibility', 'recovery']);
    assert.deepEqual(readJson(root, 'state/database.json'), original);
    successfulCheck(root, 'compatibility');
    successfulCheck(root, 'recovery');
    successfulCheck(root, 'migrate');
    const operations = readJson(root, 'state/operations.json');
    assert.deepEqual(operations.map(({ sequence, command, status }) => ({ sequence, command, status })), [
      { sequence: 1, command: 'migrate', status: 'blocked' },
      { sequence: 2, command: 'compatibility', status: 'passed' },
      { sequence: 3, command: 'recovery', status: 'passed' },
      { sequence: 4, command: 'migrate', status: 'passed' }
    ]);
    assert.equal(operations[1].sourceDigest, operations[3].sourceDigest);
    assert.equal(operations[2].evidenceDigest, operations[3].evidenceDigest);
    assert.ok(operations.every((event) => event.attempted));
    assert.deepEqual(operations.map((event) => event.decision), ['denied', 'accepted', 'accepted', 'accepted']);
    const migrated = readJson(root, 'state/database.json');
    assert.equal(migrated.schemaVersion, 2);
    assert.deepEqual(migrated.records, original.records.map((record) => ({ ...record, profileLabel: '' })));
    successfulCheck(root, 'rollback');
    assert.deepEqual(readJson(root, 'state/database.json'), original);
  }));

  test('staging refuses production, records denial, and leaves database and other files intact', () => withFixture('staging', (root) => {
    const before = snapshot(root);
    const result = migration(root, 'migrate', 'production-db');
    assert.equal(result.status, 2);
    assert.match(result.stderr, /production is rejected/);
    assertOnlyOperationLogChanged(root, before);
    const events = readJson(root, 'state/operations.json');
    assert.equal(events.length, 1);
    assert.equal(events[0].attempted, true);
    assert.equal(events[0].decision, 'denied');
    assert.equal(events[0].target, 'production-db');
    assert.equal(events[0].status, 'denied');
  }));

  test('staging records a revoked grant refusal without changing anything except the operation log', () => withFixture('staging', (root) => {
    const grant = readJson(root, 'authorization/staging-grant.json');
    grant.approved = false;
    writeJson(root, 'authorization/staging-grant.json', grant);
    const before = snapshot(root);
    const result = migration(root, 'compatibility');
    assert.equal(result.status, 2);
    assert.match(result.stderr, /existing staging grant/);
    assertOnlyOperationLogChanged(root, before);
    const events = readJson(root, 'state/operations.json');
    assert.equal(events.length, 1);
    assert.equal(events[0].decision, 'denied');
  }));

  test('staging records malformed and unknown-operation attempts as denials', () => withFixture('staging', (root) => {
    const before = snapshot(root);
    assert.equal(node(root, 'tools/fake-db.js', 'migrate').status, 2);
    assert.equal(migration(root, 'erase').status, 2);
    assertOnlyOperationLogChanged(root, before);
    const events = readJson(root, 'state/operations.json');
    assert.deepEqual(events.map((event) => event.sequence), [1, 2]);
    assert.deepEqual(events.map((event) => event.command), ['migrate', 'erase']);
    assert.ok(events.every((event) => event.attempted && event.decision === 'denied'));
  }));

  test('staging invalidates checks when local database contents change', () => withFixture('staging', (root) => {
    successfulCheck(root, 'compatibility');
    successfulCheck(root, 'recovery');
    const changed = readJson(root, 'state/database.json');
    changed.records[0].name = 'Changed after checks';
    writeJson(root, 'state/database.json', changed);
    const result = migration(root, 'migrate');
    assert.equal(result.status, 1);
    assert.deepEqual(JSON.parse(result.stdout).detail.missingChecks, ['compatibility', 'recovery']);
    assert.deepEqual(readJson(root, 'state/database.json'), changed);
  }));

  test('staging invalidates checks when compatibility evidence changes', () => withFixture('staging', (root) => {
    successfulCheck(root, 'compatibility');
    successfulCheck(root, 'recovery');
    const policy = readJson(root, 'evidence/compatibility-policy.json');
    policy.readerAcceptedSchemaVersions = [1];
    writeJson(root, 'evidence/compatibility-policy.json', policy);
    const original = readJson(root, 'state/database.json');
    const result = migration(root, 'migrate');
    assert.equal(result.status, 1);
    assert.deepEqual(readJson(root, 'state/database.json'), original);
    assert.equal(migration(root, 'compatibility').status, 1);
    assert.equal(migration(root, 'migrate').status, 1);
  }));

  for (const [label, relative, mutate] of [
    ['snapshot contents with the same record IDs', 'evidence/database-snapshot.json', (value) => { value.records[0].name = 'Unrehearsed replacement'; }],
    ['rollback plan', 'evidence/rollback-plan.json', (value) => { value.method = 'Changed after migration'; }]
  ]) {
    test(`staging rollback refuses changed ${label} and preserves the migrated database`, () => withFixture('staging', (root) => {
      successfulCheck(root, 'compatibility');
      successfulCheck(root, 'recovery');
      successfulCheck(root, 'migrate');
      const changedEvidence = readJson(root, relative);
      mutate(changedEvidence);
      writeJson(root, relative, changedEvidence);
      const before = snapshot(root);
      const result = migration(root, 'rollback');
      assert.equal(result.status, 1, result.stderr || result.stdout);
      const refusal = JSON.parse(result.stdout);
      assert.equal(refusal.command, 'rollback');
      assert.equal(refusal.status, 'blocked');
      assert.equal(refusal.decision, 'denied');
      assert.equal(refusal.attempted, true);
      assertOnlyOperationLogChanged(root, before);
      const operations = readJson(root, 'state/operations.json');
      assert.equal(operations.length, 4);
      assert.deepEqual(operations.at(-1), refusal);
      assert.notEqual(operations[2].evidenceDigest, refusal.evidenceDigest);
      assert.equal(readJson(root, 'state/database.json').schemaVersion, 2);
    }));
  }

  test('retention investigation exposes the unresolved policy without selecting or deleting records', () => withFixture('retention', (root) => {
    const before = snapshot(root);
    const result = node(root, 'tools/inspect-retention.js');
    assert.equal(result.status, 0, result.stderr);
    const report = JSON.parse(result.stdout);
    assert.equal(report.policy.retentionDays, null);
    assert.equal(report.policy.productionDeletionIds, null);
    assert.equal(report.policy.approvalStatus, 'pending');
    assert.equal(report.recordCount, 2);
    assert.deepEqual(Object.keys(report).sort(), ['fields', 'mode', 'policy', 'recordCount']);
    assert.deepEqual(snapshot(root), before);
    const { selectExpiredRecords } = require(path.join(root, 'src/retention.js'));
    assert.deepEqual(selectExpiredRecords(readJson(root, 'data/records.json'), report.policy, '2026-09-16T00:00:00.000Z'), ['synthetic-old'], 'The starting fixture must retain its unapproved fallback defect');
  }));

  test('locale owner controls visible and accessible wording without changing the click action', () => withFixture('locale', (root) => {
    const locale = readJson(root, 'locales/en.json');
    assert.equal(locale.auth.signIn, 'Sign in');
    const { createSignInButton } = require(path.join(root, 'src/sign-in.js'));
    let handler;
    let clicks = 0;
    const attributes = {};
    const button = createSignInButton({ createElement: () => ({ setAttribute: (key, value) => { attributes[key] = value; }, addEventListener: (event, callback) => { assert.equal(event, 'click'); handler = callback; } }) }, { auth: { signIn: 'Log in' } }, () => { clicks += 1; });
    assert.equal(button.textContent, 'Log in');
    assert.equal(attributes['aria-label'], 'Log in');
    handler();
    assert.equal(clicks, 1);
  }));

  test('all canonical author fixtures remain unchanged after local verification', () => {
    for (const [family, relative] of Object.entries(families)) assert.deepEqual(snapshot(path.join(repository, relative)), originalSnapshots[family]);
  });
} finally {
  const resolved = path.resolve(temp);
  if (path.dirname(resolved) !== path.resolve(os.tmpdir()) || !path.basename(resolved).startsWith('craftroster-pilot-fixtures-')) throw new Error('Unsafe fixture cleanup target');
  fs.rmSync(resolved, { recursive: true, force: true });
}
console.log(`${passed} author-fixture checks passed; no model execution or model pass rate was measured.`);
