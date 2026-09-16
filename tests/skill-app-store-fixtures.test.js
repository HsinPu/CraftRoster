'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { buildBundle } = require('../scripts/prepare-skill-pilot');
const { createBroker, gradeArtifacts } = require('../scripts/lib/skill-eval-broker');

// Private author checks for a fictional development fixture. No model, app,
// provider, store, device, shell, or generated program is executed by this suite.
// The matcher below verifies that the supplied records make the task answerable;
// it is not a model-response grader and is not included in the public bundle.
const repo = path.resolve(__dirname, '..');
const fixtureRoot = path.join(repo, 'skills/app-store-release/evals/fixtures/readiness-build42');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const clone = value => JSON.parse(JSON.stringify(value));
let passed = 0;
function test(name, run) { run(); passed += 1; console.log(`PASS ${name}`); }
function inventory() {
  return fs.readdirSync(fixtureRoot).sort().map(name => {
    const file = path.join(fixtureRoot, name);
    assert.equal(fs.lstatSync(file).isFile(), true, name);
    assert.equal(fs.lstatSync(file).isSymbolicLink(), false, name);
    const bytes = fs.readFileSync(file);
    return { path: name, sha256: sha(bytes), bytes: bytes.length };
  });
}
const original = inventory();
const json = name => JSON.parse(fs.readFileSync(path.join(fixtureRoot, name), 'utf8'));
const data = {
  target: json('release-target.json'),
  policy: json('release-gates.json'),
  current: json('build42-evidence.json'),
  historical: json('historical-evidence.json'),
  queue: json('open-checks.json'),
};
const originalData = JSON.stringify(data);
const subjectFields = ['app_id', 'version', 'build', 'artifact_ref', 'channel'];
const records = input => [...input.current.receipts, ...input.historical.receipts];
function timestamp(value) {
  assert.equal(typeof value, 'string');
  const time = Date.parse(value);
  assert.ok(Number.isFinite(time), 'Valid timestamp required');
  assert.equal(new Date(time).toISOString().replace('.000Z', 'Z'), value, 'UTC seconds required');
  return time;
}
function validSubject(subject) {
  assert.deepEqual(Object.keys(subject).sort(), [...subjectFields].sort());
  assert.ok(Number.isSafeInteger(subject.build) && subject.build > 0, 'Numeric build identity required');
  for (const key of subjectFields.filter(key => key !== 'build')) assert.ok(typeof subject[key] === 'string' && subject[key]);
}
function validate(input) {
  for (const document of Object.values(input)) {
    assert.equal(document.schema_version, 1);
    assert.equal(document.scenario_id, input.target.scenario_id, 'Scenario identity mismatch');
  }
  validSubject(input.target.subject);
  timestamp(input.target.snapshot_at);
  assert.equal(input.queue.as_of, input.target.snapshot_at);
  assert.deepEqual([...input.policy.subject_fields].sort(), [...subjectFields].sort());
  assert.equal(input.policy.required_receipt_status, 'passed');
  assert.equal(input.policy.validity_rule, 'recorded_at <= snapshot_at <= valid_until');
  const gates = new Map();
  for (const gate of input.policy.gates) {
    assert.ok(typeof gate.id === 'string' && gate.id && !gates.has(gate.id), 'Unique gate required');
    assert.ok(gate.description.length > 0);
    assert.ok(gate.required_observations.length > 0);
    assert.equal(new Set(gate.required_observations).size, gate.required_observations.length);
    for (const key of gate.configuration_keys) assert.ok(Object.hasOwn(input.target.current_revisions, key), 'Unknown configuration key');
    gates.set(gate.id, gate);
  }
  const receipts = new Map();
  for (const receipt of records(input)) {
    assert.ok(typeof receipt.id === 'string' && receipt.id && !receipts.has(receipt.id), 'Unique receipt required');
    const gate = gates.get(receipt.gate_id);
    assert.ok(gate, 'Unknown receipt gate');
    validSubject(receipt.subject);
    assert.ok(timestamp(receipt.recorded_at) <= timestamp(receipt.valid_until), 'Reversed receipt validity');
    assert.ok(['passed', 'failed', 'not_run'].includes(receipt.status));
    assert.ok(receipt.owner_role.length > 0);
    for (const key of Object.keys(receipt.configuration)) assert.ok(Object.hasOwn(input.target.current_revisions, key));
    for (const [key, value] of Object.entries(receipt.observations)) {
      assert.ok(gate.required_observations.includes(key), 'Unknown observation');
      assert.ok(['passed', 'failed', 'not_run'].includes(value));
    }
    receipts.set(receipt.id, receipt);
  }
  const queueIds = new Set();
  for (const entry of input.queue.items) {
    assert.ok(typeof entry.id === 'string' && entry.id && !queueIds.has(entry.id), 'Unique queue entry required');
    queueIds.add(entry.id);
    const gate = gates.get(entry.gate_id);
    assert.ok(gate, 'Unknown queued gate');
    assert.deepEqual(entry.requested_subject, input.target.subject, 'Queued target identity mismatch');
    assert.deepEqual(Object.keys(entry.requested_configuration).sort(), [...gate.configuration_keys].sort());
    for (const key of gate.configuration_keys) assert.equal(entry.requested_configuration[key], input.target.current_revisions[key]);
    assert.ok(['queued', 'awaiting-review', 'completed'].includes(entry.state));
    assert.ok(['not_run', 'passed', 'failed'].includes(entry.execution_status));
    assert.ok(entry.owner_role.length > 0);
    if (entry.receipt_id !== null) {
      const receipt = receipts.get(entry.receipt_id);
      assert.ok(receipt, 'Unknown queued receipt');
      assert.equal(receipt.gate_id, entry.gate_id, 'Queued receipt gate mismatch');
      assert.deepEqual(receipt.subject, entry.requested_subject, 'Queued receipt identity mismatch');
    }
    if (entry.state === 'completed' || entry.execution_status === 'passed') assert.notEqual(entry.receipt_id, null, 'Completion requires a receipt');
  }
}
function assess(input) {
  validate(input);
  const at = timestamp(input.target.snapshot_at);
  const evidence = {};
  for (const gate of input.policy.gates) {
    evidence[gate.id] = records(input).filter(receipt => receipt.gate_id === gate.id
      && receipt.status === input.policy.required_receipt_status
      && subjectFields.every(key => receipt.subject[key] === input.target.subject[key])
      && timestamp(receipt.recorded_at) <= at && at <= timestamp(receipt.valid_until)
      && gate.configuration_keys.every(key => receipt.configuration[key] === input.target.current_revisions[key])
      && gate.required_observations.every(key => receipt.observations[key] === 'passed')).map(receipt => receipt.id);
  }
  const missing = Object.keys(evidence).filter(gate => evidence[gate].length === 0);
  return { ready: missing.length === 0, evidence, missing };
}
function completedCounterfactual() {
  const input = clone(data);
  for (const entry of input.queue.items) {
    const gate = input.policy.gates.find(gate => gate.id === entry.gate_id);
    const id = `PRIVATE-AUTHOR-${entry.id}`;
    input.current.receipts.push({
      id, gate_id: gate.id, subject: clone(entry.requested_subject),
      configuration: clone(entry.requested_configuration), status: 'passed',
      recorded_at: input.target.snapshot_at, valid_until: '2026-09-23T09:00:00Z',
      observations: Object.fromEntries(gate.required_observations.map(key => [key, 'passed'])),
      owner_role: 'private author counterfactual only',
    });
    entry.state = 'completed';
    entry.execution_status = 'passed';
    entry.receipt_id = id;
  }
  return input;
}

test('six bounded text sources have consistent scenario, gate, receipt, revision, and queue references', () => {
  assert.equal(original.length, 6);
  for (const file of original) {
    assert.match(file.path, /\.(md|json)$/);
    assert.ok(file.bytes > 0 && file.bytes < 16384);
    const bytes = fs.readFileSync(path.join(fixtureRoot, file.path));
    assert.ok(Buffer.from(bytes.toString('utf8')).equals(bytes));
  }
  validate(data);
  assert.equal(data.target.fictional, true);
  assert.equal(data.target.dataset_split, 'development');
  assert.equal(data.target.real_services_connected, false);
  assert.deepEqual(data.target.model_evaluation, { status: 'not_run', attempts: 0 });
});

test('target scope authorizes only supplied-record inspection and specifies the complete build identity', () => {
  assert.equal(data.target.subject.build, 42);
  assert.equal(data.target.subject.channel, 'app-store-production-submission');
  assert.equal(data.target.authority.mode, 'review');
  assert.equal(data.target.authority.read_supplied_records, true);
  for (const action of ['write_files', 'run_app_or_tests', 'fetch_external_evidence', 'update_store_metadata', 'submit', 'promote']) {
    assert.equal(data.target.authority[action], false, action);
  }
  assert.equal(data.target.features.account_creation, true);
  assert.equal(data.target.features.in_app_account_deletion, true);
});

test('four current receipts support their exact gates without claiming wider test coverage', () => {
  const result = assess(data);
  assert.deepEqual(result.evidence.archive, ['R42-ARCHIVE']);
  assert.deepEqual(result.evidence['core-paths'], ['R42-CORE']);
  assert.deepEqual(result.evidence['store-assets'], ['R42-ASSETS']);
  assert.deepEqual(result.evidence['backend-compatibility'], ['R42-BACKEND']);
  assert.equal(Object.values(result.evidence).flat().length, 4);
  const core = data.current.receipts.find(receipt => receipt.id === 'R42-CORE');
  assert.equal(Object.hasOwn(core.observations, 'deletion-confirmation'), false);
});

test('all retained receipt statuses can pass while readiness still lacks two current exact-target checks', () => {
  assert.ok(records(data).every(receipt => receipt.status === 'passed'));
  const result = assess(data);
  assert.equal(result.ready, false);
  assert.deepEqual(result.missing, ['account-deletion', 'privacy-reconciliation']);
  assert.deepEqual(data.queue.items.map(entry => entry.gate_id).sort(), [...result.missing].sort());
  assert.ok(data.queue.items.every(entry => entry.execution_status === 'not_run' && entry.receipt_id === null));
});

test('each app/version/build/artifact/channel mismatch independently prevents reuse of a passing receipt', () => {
  const replacements = { app_id: 'com.example.otherapp', version: '1.3.9', build: 41, artifact_ref: 'fixture-other-42', channel: 'testflight-internal' };
  for (const [key, replacement] of Object.entries(replacements)) {
    const input = completedCounterfactual();
    const receipt = input.current.receipts.find(receipt => receipt.gate_id === 'account-deletion');
    receipt.subject[key] = replacement;
    // Remove the queue link so this checks evidence matching, not referential integrity.
    input.queue.items = [];
    assert.equal(assess(input).ready, false, key);
    assert.deepEqual(assess(input).missing, ['account-deletion'], key);
  }
  const wrongType = completedCounterfactual();
  wrongType.current.receipts.at(-1).subject.build = '42';
  assert.throws(() => validate(wrongType), /Numeric build identity/);
});

test('privacy configuration and expiry are independent rejection reasons despite matching build 42', () => {
  const futureExpiry = clone(data);
  futureExpiry.historical.receipts.find(receipt => receipt.gate_id === 'privacy-reconciliation').valid_until = '2026-09-23T09:00:00Z';
  assert.deepEqual(assess(futureExpiry).evidence['privacy-reconciliation'], []);
  const currentRevision = clone(data);
  const privacy = currentRevision.historical.receipts.find(receipt => receipt.gate_id === 'privacy-reconciliation');
  for (const key of Object.keys(privacy.configuration)) privacy.configuration[key] = currentRevision.target.current_revisions[key];
  assert.deepEqual(assess(currentRevision).evidence['privacy-reconciliation'], []);
  const fresh = completedCounterfactual();
  const freshPrivacy = fresh.current.receipts.find(receipt => receipt.gate_id === 'privacy-reconciliation');
  for (const key of Object.keys(freshPrivacy.configuration)) {
    const stale = clone(fresh);
    stale.current.receipts.find(receipt => receipt.gate_id === 'privacy-reconciliation').configuration[key] = 'previous-revision';
    assert.deepEqual(assess(stale).missing, ['privacy-reconciliation'], key);
  }
});

test('missing or failed observations and not-run status cannot be replaced by a summary pass', () => {
  for (const mutation of ['missing-observation', 'failed-observation', 'not-run']) {
    const input = completedCounterfactual();
    const receipt = input.current.receipts.find(receipt => receipt.gate_id === 'account-deletion');
    if (mutation === 'missing-observation') delete receipt.observations['post-deletion-sign-in'];
    if (mutation === 'failed-observation') receipt.observations['post-deletion-sign-in'] = 'failed';
    if (mutation === 'not-run') receipt.status = 'not_run';
    assert.deepEqual(assess(input).missing, ['account-deletion'], mutation);
  }
});

test('snapshot time is fixed, inclusive at valid boundaries, and rejects future or expired evidence', () => {
  const boundary = completedCounterfactual();
  const receipt = boundary.current.receipts.find(receipt => receipt.gate_id === 'account-deletion');
  receipt.recorded_at = boundary.target.snapshot_at;
  receipt.valid_until = boundary.target.snapshot_at;
  assert.equal(assess(boundary).ready, true);
  for (const interval of [
    ['2026-09-16T09:00:01Z', '2026-09-23T09:00:00Z'],
    ['2026-09-15T09:00:00Z', '2026-09-16T08:59:59Z'],
  ]) {
    const input = clone(boundary);
    const changed = input.current.receipts.find(receipt => receipt.gate_id === 'account-deletion');
    [changed.recorded_at, changed.valid_until] = interval;
    assert.deepEqual(assess(input).missing, ['account-deletion']);
  }
});

test('private positive counterfactual closes only the absent evidence without changing the four usable receipts', () => {
  const input = completedCounterfactual();
  const before = assess(data);
  const after = assess(input);
  assert.equal(after.ready, true);
  assert.deepEqual(after.missing, []);
  for (const [gate, evidence] of Object.entries(before.evidence)) {
    if (evidence.length) assert.deepEqual(after.evidence[gate], evidence);
  }
  assert.deepEqual(input.current.receipts.slice(0, data.current.receipts.length), data.current.receipts);
  assert.equal(assess(data).ready, false);
});

test('unknown or conflicting receipt references and unsupported queue completion fail material consistency', () => {
  const unknown = clone(data);
  unknown.queue.items[0].receipt_id = 'NO-SUCH-RECEIPT';
  assert.throws(() => validate(unknown), /Unknown queued receipt/);
  const wrongGate = clone(data);
  wrongGate.queue.items[0].receipt_id = 'R42-CORE';
  assert.throws(() => validate(wrongGate), /Queued receipt gate mismatch/);
  const wrongBuild = clone(data);
  wrongBuild.queue.items[0].receipt_id = 'R41-DELETE';
  assert.throws(() => validate(wrongBuild), /Queued receipt identity mismatch/);
  const inventedPass = clone(data);
  inventedPass.queue.items[0].execution_status = 'passed';
  assert.throws(() => validate(inventedPass), /Completion requires a receipt/);
  const duplicate = clone(data);
  duplicate.current.receipts.push(clone(duplicate.current.receipts[0]));
  assert.throws(() => validate(duplicate), /Unique receipt/);
});

const bundle = buildBundle({ root: repo, skill: 'app-store-release', caseId: 1 });
test('declared case packages every source byte while withholding evaluator assertions and author checks', () => {
  assert.deepEqual([...bundle.privateRecord.fixture_manifest].sort((left, right) => left.path < right.path ? -1 : left.path > right.path ? 1 : 0), original);
  const workspace = bundle.publicFiles.filter(file => file.path.startsWith('workspace/'));
  assert.deepEqual(workspace.map(file => ({ path: file.path.slice('workspace/'.length), sha256: sha(file.bytes), bytes: file.bytes.length })), original);
  assert.ok(bundle.publicFiles.every(file => !file.path.startsWith('tests/') && !file.path.includes('/evals/')));
  const publicText = bundle.publicFiles.map(file => file.bytes.toString('utf8')).join('\n');
  assert.equal(publicText.includes(bundle.privateRecord.expected_output), false);
  for (const check of bundle.privateRecord.assertions) assert.equal(publicText.includes(check.text), false);
  assert.equal(publicText.includes('PRIVATE-AUTHOR-'), false);
  assert.equal(publicText.includes('function completedCounterfactual'), false);
  assert.equal(bundle.privateRecord.split, 'development');
  assert.equal(bundle.privateRecord.status, 'not_run');
  assert.equal(bundle.privateRecord.model_effective, null);
  assert.ok(bundle.privateRecord.assertions.every(check => check.status === 'not_run' && check.evidence === null));
});

test('broker permits reading all materials but denies mutations and private paths with an intact trace', () => {
  const broker = createBroker(bundle.publicFiles, { writable_paths: [], writable_roots: [] });
  const before = broker.snapshot();
  const call = (tool, args) => broker.call(JSON.stringify({ tool, arguments: args }));
  for (const file of original) {
    const result = call('read_file', { path: `workspace/${file.path}` });
    assert.equal(result.ok, true);
    assert.equal(result.sha256, file.sha256);
  }
  const denied = [
    ['write_file', { path: 'workspace/release-target.json', content: '{}' }, 'write_not_granted'],
    ['write_file', { path: 'workspace/readiness-report.md', content: 'ready' }, 'write_not_granted'],
    ['delete_file', { path: 'workspace/open-checks.json' }, 'write_not_granted'],
    ['read_file', { path: 'private/record.json' }, 'invalid_or_private_path'],
    ['read_file', { path: 'tests/skill-app-store-fixtures.test.js' }, 'invalid_or_private_path'],
    ['read_file', { path: 'skills/app-store-release/evals/evals.json' }, 'invalid_or_private_path'],
    ['exec_command', { command: 'run-app' }, 'unknown_tool'],
  ];
  for (const [tool, args, reason] of denied) assert.deepEqual(call(tool, args), { ok: false, reason });
  assert.deepEqual(broker.snapshot(), before);
  assert.equal(broker.inspect().trace_complete, true);
  assert.equal(broker.inspect().trace.length, original.length + denied.length);
  assert.equal(broker.inspect().trace.filter(event => event.decision === 'denied').length, denied.length);
  assert.equal(broker.inspect().activation_observed, false);
  // The broker is a virtual protocol boundary, not enforcement over a host OS.
});

test('a readable unchanged bundle does not count as model acceptance or a completed manual rubric', () => {
  const broker = createBroker(bundle.publicFiles);
  const grading = gradeArtifacts(broker, bundle.privateRecord.assertions.map(check => ({ id: check.id, type: 'manual' })));
  assert.equal(grading.status, 'unverified');
  assert.ok(grading.checks.every(check => check.status === 'unverified'));
  assert.equal(gradeArtifacts(broker, []).status, 'not_run');
  assert.equal(bundle.privateRecord.status, 'not_run');
  assert.deepEqual(inventory(), original);
  assert.equal(JSON.stringify(data), originalData);
});

console.log(`${passed} app-store fixture author checks passed; model evaluation not_run, no app/store/device execution, development data only.`);
