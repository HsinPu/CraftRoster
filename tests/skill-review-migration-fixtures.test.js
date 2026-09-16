'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../skills/code-review/evals/fixtures/mixed-version-migration');
const { createDatabase, migrate } = require(path.join(root, 'shared/lab.cjs'));
const v1 = require(path.join(root, 'shared/app-v1.cjs'));
const v2 = require(path.join(root, 'shared/app-v2.cjs'));
const { runOrdinaryChecks } = require(path.join(root, 'test/migration.test.cjs'));
const { buildBundle } = require('../scripts/prepare-skill-pilot');
function snapshot() {
  return Object.fromEntries(fs.readdirSync(root, { recursive: true, withFileTypes: true }).filter(e => e.isFile()).map(e => {
    const file = path.join(e.parentPath, e.name);
    return [path.relative(root, file).replaceAll('\\', '/'), crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')];
  }).sort(([a], [b]) => a < b ? -1 : 1));
}
const before = snapshot();
let passed = 0;
function test(name, fn) { fn(); passed++; console.log(`PASS ${name}`); }
function withDatabase(fn) { const db = createDatabase(); try { return fn(db); } finally { db.close(); } }
test('both proposals pass ordinary v2 checks on a real in-memory SQLite database', () => {
  for (const variant of ['base', 'head']) {
    const result = runOrdinaryChecks(variant);
    assert.equal(result.checks, 5);
    assert.match(result.sqlite, /^3\.\d+\.\d+$/);
  }
});
test('the previous proposal supports both versions, backfills existing names and synchronizes both write directions', () => withDatabase(db => {
  migrate(db, 'base');
  assert.deepEqual(v1.get(db, 1), v2.get(db, 1));
  v1.rename(db, 1, 'Ada from v1');
  assert.equal(v2.get(db, 1).displayName, 'Ada from v1');
  v2.rename(db, 1, 'Ada from v2');
  assert.equal(v1.get(db, 1).displayName, 'Ada from v2');
  v1.create(db, 3, 'v1@example.invalid', 'V1 Insert');
  assert.equal(v2.get(db, 3).displayName, 'V1 Insert');
  v2.create(db, 4, 'v2@example.invalid', 'V2 Insert');
  assert.equal(v1.get(db, 4).displayName, 'V2 Insert');
  const rows = db.prepare('SELECT display_name, full_name FROM customers ORDER BY id').all();
  assert.ok(rows.every(row => row.display_name === row.full_name));
}));
test('the proposed rename breaks the actual old reader and writer before and during the mixed deployment stage', () => withDatabase(db => {
  const plan = JSON.parse(fs.readFileSync(path.join(root, 'shared/deploy-plan.json')));
  assert.deepEqual(plan.stages.find(s => s.id === 'schema').activeVersions, [1]);
  assert.deepEqual(plan.stages.find(s => s.id === 'mixed').activeVersions, [1, 2]);
  assert.equal(v1.get(db, 1).displayName, 'Ada');
  migrate(db, 'head');
  assert.throws(() => v1.get(db, 1), /no such column: display_name/);
  assert.throws(() => v1.rename(db, 1, 'Old write'), /no such column: display_name/);
  assert.throws(() => v1.create(db, 3, 'old@example.invalid', 'Old insert'), /no column named display_name/);
  assert.equal(v2.get(db, 1).displayName, 'Ada');
  assert.equal(db.prepare('SELECT count(*) AS n FROM customers').get().n, 2);
}));
test('public serialization and email uniqueness survive the SQL change and must not become invented findings', () => {
  for (const variant of ['base', 'head']) withDatabase(db => {
    migrate(db, variant);
    assert.deepEqual(Object.keys(v2.get(db, 1)), ['id', 'email', 'displayName']);
    assert.equal(typeof v2.get(db, 1).displayName, 'string');
    assert.throws(() => v2.create(db, 3, 'ada@example.invalid', 'Duplicate'), /UNIQUE constraint failed/);
    assert.equal(db.prepare('PRAGMA index_list(customers)').all().find(i => i.name === 'customers_email_unique').unique, 1);
  });
});
test('successful retries are no-ops and failed migration marker insertion rolls back the real schema', () => {
  for (const variant of ['base', 'head']) withDatabase(db => {
    db.exec("CREATE TRIGGER fail_marker BEFORE INSERT ON schema_migrations BEGIN SELECT RAISE(ABORT, 'injected marker failure'); END;");
    assert.throws(() => migrate(db, variant), /injected marker failure/);
    assert.deepEqual(db.prepare('PRAGMA table_info(customers)').all().map(c => c.name), ['id', 'email', 'display_name']);
    assert.equal(db.prepare('SELECT count(*) AS n FROM schema_migrations').get().n, 0);
    assert.equal(v1.get(db, 1).displayName, 'Ada');
    db.exec('DROP TRIGGER fail_marker');
    assert.deepEqual(migrate(db, variant), { changed: true });
    assert.deepEqual(migrate(db, variant), { changed: false });
    assert.equal(db.prepare('SELECT count(*) AS n FROM schema_migrations').get().n, 1);
  });
});
test('rollback after draining v2 preserves its newest writes for v1 while v2 is no longer compatible', () => {
  for (const variant of ['base', 'head']) withDatabase(db => {
    migrate(db, variant);
    v2.rename(db, 1, 'Most recent v2 value');
    v2.create(db, 3, 'rollback@example.invalid', 'Created under v2');
    assert.deepEqual(migrate(db, variant, 'down'), { changed: true });
    assert.equal(v1.get(db, 1).displayName, 'Most recent v2 value');
    assert.equal(v1.get(db, 3).displayName, 'Created under v2');
    assert.throws(() => v2.get(db, 1), /no such column: full_name/);
    assert.deepEqual(migrate(db, variant, 'down'), { changed: false });
  });
});
test('declared public source packaging is complete and author probes preserve canonical files', () => {
  const bundle = buildBundle({ skill: 'code-review', caseId: 5 });
  assert.deepEqual(bundle.publicFiles.filter(f => f.path.startsWith('workspace/')).map(f => f.path.slice(10)).sort(), Object.keys(before).sort());
  assert.ok(bundle.publicFiles.every(f => !f.path.includes('skill-review-migration-fixtures.test.js')));
  assert.equal(bundle.privateRecord.status, 'not_run');
  assert.deepEqual(snapshot(), before);
});
console.log(`${passed} SQLite migration author-fixture checks passed; no external database, production timing or model review ran.`);
