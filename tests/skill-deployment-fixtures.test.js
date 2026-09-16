'use strict';

// Author-side evidence checks only. No deployment, command runner, credentials,
// network or evaluated model is used; the scenario's passed records are fictional.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { buildBundle } = require('../scripts/prepare-skill-pilot');
const { createBroker } = require('../scripts/lib/skill-eval-broker');
const root = path.resolve(__dirname, '..');
const fixture = path.join(root, 'skills/deployment-operations/evals/fixtures/staging-readiness');
const read = file => fs.readFileSync(path.join(fixture, file), 'utf8');
const json = file => JSON.parse(read(file));
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const normalizedHash = text => hash(text.replace(/\r\n/g, '\n'));
const clone = value => JSON.parse(JSON.stringify(value));
const release = json('release.json'), evidence = json('evidence/checks.json');
const expectedScope = kind => ({
  ...(kind === 'build' || kind === 'staging-smoke' ? { buildId: release.artifact.buildId, artifactSha256: release.artifact.artifactSha256 } : {}),
  ...(kind !== 'build' ? { targetId: release.target.targetId, configRevision: release.target.configRevision, configSha256: release.target.configSha256 } : {})
});
// This private interpretation validates the authored scenario; it does not grade
// a model response or claim that the scenario's checks ran on a real service.
function scopedStatus(records, kind) {
  const expected = expectedScope(kind), candidates = records.filter(record => record.kind === kind);
  const matching = candidates.filter(record => Object.entries(expected).every(([key, value]) => record[key] === value));
  assert(matching.length <= 1, 'Current evidence must not be ambiguous');
  return matching[0]?.status || (candidates.length ? 'stale' : 'missing');
}
const dataFiles = ['CONTRACT.md','artifacts/A.json','config/staging-B.json','history/staging-B-r1.json','release.json','evidence/checks.json'];
const initialHashes = Object.fromEntries(dataFiles.map(file => [file, hash(read(file))]));
let passed = 0, preparedBundle;
function test(name, fn) { fn(); passed++; console.log('PASS ' + name); }

test('artifact and both config revisions have reproducible identities, including CRLF checkouts', () => {
  assert.equal(release.fixtureOnly, true); assert.equal(evidence.fixtureOnly, true);
  assert.equal(release.digestAlgorithm, 'sha256-utf8-lf');
  assert.deepEqual(release.modelEvaluation, { status: 'not_run', attempts: 0 });
  assert.deepEqual(release.connectedServices, []);
  assert.equal(json(release.artifact.path).buildId, 'A');
  assert.equal(normalizedHash(read(release.artifact.path)), release.artifact.artifactSha256);
  assert.equal(normalizedHash(read(release.target.path)), release.target.configSha256);
  assert.equal(normalizedHash(read(release.target.path).replace(/\r?\n/g, '\r\n')), release.target.configSha256);
  const old = evidence.records.find(record => record.id === 'config-B-r1');
  assert.equal(normalizedHash(read('history/staging-B-r1.json')), old.configSha256);
  assert.notEqual(old.configSha256, release.target.configSha256);
  assert.notEqual(json('history/staging-B-r1.json').featureFlags.asyncReceipt, json(release.target.path).featureFlags.asyncReceipt);
  assert.equal(json(release.target.path).connected, false);
  assert.equal(new URL(json(release.target.path).publicEndpoint).hostname.endsWith('.invalid'), true);
  assert(json(release.target.path).secretReferences.every(value => value.startsWith('fixture-ref://')));
});

test('current build/recovery evidence remains distinct from stale config and unrun health evidence', () => {
  assert.deepEqual(release.requiredBeforeRollout.map(kind => [kind, scopedStatus(evidence.records, kind)]), [
    ['build','passed'], ['config-validation','stale'], ['recovery-plan','passed']
  ]);
  assert.deepEqual(release.requiredBeforeHealthy.map(kind => [kind, scopedStatus(evidence.records, kind)]), [['staging-smoke','not_run']]);
  const smoke = evidence.records.find(record => record.id === 'smoke-A-B-r2');
  assert.equal(smoke.execution, null); assert.equal(smoke.observedBuildId, null); assert.equal(smoke.recordedAt, null);
  const recovery = evidence.records.find(record => record.kind === 'recovery-plan');
  assert.equal(recovery.recovery.targetId, release.target.targetId); assert.equal(recovery.recovery.changesDatabase, false);
});

test('passed status alone cannot transfer a different artifact, target, revision or digest into this release', () => {
  for (const kind of ['build','config-validation','recovery-plan','staging-smoke']) {
    const expected = expectedScope(kind), matching = { id: 'counterfactual', kind, ...expected, status: 'passed' };
    assert.equal(scopedStatus([matching], kind), 'passed');
    for (const key of Object.keys(expected)) {
      const other = clone(matching); other[key] = 'different';
      assert.equal(scopedStatus([other], kind), 'stale', kind + ':' + key);
    }
    assert.equal(scopedStatus([], kind), 'missing');
  }
  const priorSmokeOnly = evidence.records.filter(record => record.id !== 'smoke-A-B-r2');
  assert.equal(scopedStatus(priorSmokeOnly, 'staging-smoke'), 'stale');
});

test('fixture attachments are exact and public bundling excludes private assertions and neighboring cases', () => {
  const corpus = JSON.parse(fs.readFileSync(path.join(root, 'skills/deployment-operations/evals/evals.json'), 'utf8'));
  const item = corpus.evals.find(value => value.id === 1), prefix = item.fixture_root + '/';
  assert.deepEqual(item.files.map(file => file.slice(prefix.length)).sort(), [...dataFiles].sort());
  const bundle = buildBundle({ root, skill: 'deployment-operations', caseId: 1 });
  assert.equal(bundle.privateRecord.status, 'not_run'); assert.equal(bundle.privateRecord.split, 'development');
  assert.equal(bundle.privateRecord.mode, 'workspace_fixture');
  assert.equal(bundle.privateRecord.fixture_manifest.length, dataFiles.length);
  const joined = bundle.publicFiles.map(file => file.bytes.toString('utf8')).join('\n');
  assert(!joined.includes(item.expected_output)); assert(item.assertions.every(value => !joined.includes(value)));
  assert(corpus.evals.filter(value => value.id !== 1).every(value => !joined.includes(value.prompt)));
  assert(bundle.publicFiles.every(file => !file.path.includes('/evals/')));
  assert.equal(bundle.privateRecord.activation_observed, false); assert.equal(bundle.privateRecord.model_effective, null);
  preparedBundle = bundle;
});

test('read-only broker grants no file mutation or external deployment and preserves all inputs', () => {
  const broker = createBroker(preparedBundle.publicFiles), initial = broker.inspect().final_manifest;
  const invoke = (tool, args) => broker.call(JSON.stringify({ tool, arguments: args }));
  for (const file of dataFiles) {
    const target = 'workspace/' + file;
    assert.equal(invoke('read_file', { path: target }).ok, true);
    assert.equal(invoke('write_file', { path: target, content: 'changed' }).reason, 'write_not_granted');
    assert.equal(invoke('delete_file', { path: target }).reason, 'write_not_granted');
  }
  assert.equal(invoke('write_file', { path: 'workspace/report.md', content: 'new report' }).reason, 'write_not_granted');
  assert.equal(invoke('deploy', { target: 'B' }).reason, 'unknown_tool');
  assert.equal(invoke('read_file', { path: 'private/record.json' }).ok, false);
  assert.equal(invoke('read_file', { path: 'skills/deployment-operations/evals/evals.json' }).ok, false);
  assert.deepEqual(broker.inspect().final_manifest, initial);
  assert.deepEqual(Object.fromEntries(dataFiles.map(file => [file, hash(read(file))])), initialHashes);
});
console.log(`${passed} deployment fixture author tests passed; no model or service runs.`);
