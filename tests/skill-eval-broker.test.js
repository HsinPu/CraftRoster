'use strict';
const assert = require('node:assert/strict');
const crypto = require('crypto');
const fs = require('node:fs');
const { createBroker, gradeArtifacts, runScriptedProbe, LOADED_PROVENANCE } = require('../scripts/lib/skill-eval-broker');
const digest = value => crypto.createHash('sha256').update(value).digest('hex');
const fixtures = () => [
  { path: 'task.txt', bytes: Buffer.from('Change the visible label, preserving the handler.') },
  { path: 'skill-catalog.json', bytes: Buffer.from('{"skills":[]}') },
  { path: 'skills/alpha/SKILL.md', bytes: Buffer.from('Instructions') },
  { path: 'workspace/locales/en.json', bytes: Buffer.from('{"label":"Sign in"}') },
  { path: 'workspace/src/handler.js', bytes: Buffer.from('handler sentinel') },
];
const policy = { writable_paths: ['workspace/locales/en.json'] };
const invoke = (broker, tool, args = {}) => broker.call(JSON.stringify({ tool, arguments: args }));
let passed = 0;
function test(name, fn) { fn(); passed++; console.log(`PASS ${name}`); }

test('loaded provenance is frozen and broker requests still perform no host file reads', () => {
  assert.equal(LOADED_PROVENANCE.source_sha256, digest(fs.readFileSync(require.resolve('../scripts/lib/skill-eval-broker'))));
  assert.equal(LOADED_PROVENANCE.private_grader_sha256, digest(gradeArtifacts.toString()));
  assert.equal(Object.isFrozen(LOADED_PROVENANCE), true);
  assert.throws(() => { LOADED_PROVENANCE.source_sha256 = 'changed'; }, TypeError);
  const originalRead = fs.readFileSync;
  fs.readFileSync = () => { throw new Error('Unexpected host filesystem lookup'); };
  try {
    const broker = createBroker(fixtures(), policy);
    assert.equal(invoke(broker, 'read_file', { path: 'task.txt' }).ok, true);
    assert.equal(invoke(broker, 'write_file', { path: 'workspace/locales/en.json', content: '{"label":"Continue"}' }).ok, true);
    assert.equal(broker.inspect().trace.length, 2);
    assert.equal(gradeArtifacts(broker, [{ id: 'intact', type: 'file_unchanged', path: 'task.txt' }]).status, 'passed');
  } finally { fs.readFileSync = originalRead; }
});

test('only explicit public files are visible, with no implicit host filesystem lookup', () => {
  const broker = createBroker(fixtures());
  assert.deepEqual(invoke(broker, 'list_files', { prefix: 'workspace/' }).files,
    ['workspace/locales/en.json', 'workspace/src/handler.js']);
  for (const path of ['private/record.json', 'workspace/private/record.json', 'skills/alpha/evals/evals.json', 'workspace/.git/config']) {
    assert.equal(invoke(broker, 'read_file', { path }).ok, false);
  }
  assert(!JSON.stringify(broker.inspect()).includes('handler sentinel'));
});

test('traversal, absolute paths, Windows aliases, controls and encoded lookalikes cannot escape', () => {
  const broker = createBroker(fixtures(), { writable_roots: ['workspace/'] });
  for (const path of ['../private', '/private', 'C:/private', 'workspace/../../private', 'workspace\\private',
    'workspace/secret:stream', 'workspace/NUL.txt', 'workspace/trailing.', 'workspace/double//name',
    'workspace/./name', 'workspace/name\u0000', 'workspace/a?b', 'workspace/%2e%2e/private', 'workspace/cafe\u0301.txt']) {
    const read = invoke(broker, 'read_file', { path });
    assert.equal(read.ok, false, path);
  }
  const before = broker.inspect().final_manifest;
  for (const path of ['workspace/../../private', 'workspace\\private', 'workspace/aux.json']) {
    assert.equal(invoke(broker, 'write_file', { path, content: 'bad' }).ok, false);
  }
  assert.deepEqual(broker.inspect().final_manifest, before);
});

test('public input copying prevents mutation through caller buffers or snapshots', () => {
  const inputs = fixtures(), broker = createBroker(inputs);
  inputs[0].bytes.fill(0);
  const snapshot = broker.snapshot(); snapshot.find(file => file.path === 'task.txt').bytes.fill(0);
  assert(invoke(broker, 'read_file', { path: 'task.txt' }).content.startsWith('Change'));
  const info = broker.inspect(); info.trace.length = 0; info.policy.writable_paths.push('task.txt');
  assert.equal(invoke(broker, 'write_file', { path: 'task.txt', content: 'changed' }).reason, 'write_not_granted');
});

test('untrusted JSON may not obtain shell, network, symlink or inspector capabilities', () => {
  const broker = createBroker(fixtures(), policy);
  for (const tool of ['shell', 'exec', 'fetch', 'symlink', 'snapshot', 'inspect', '__proto__', 'constructor']) {
    assert.equal(invoke(broker, tool, { command: 'ignored' }).reason, 'unknown_tool');
  }
  let getterRan = false;
  const result = broker.call({ get tool() { getterRan = true; return 'shell'; } });
  assert.equal(result.reason, 'invalid_request');
  assert.equal(getterRan, false);
});

test('malformed transport and surplus arguments fail without changing artifacts', () => {
  const broker = createBroker(fixtures(), policy), before = broker.inspect().final_manifest;
  for (const request of ['{', 'null', '[]', '"read_file"', '{"tool":"read_file","arguments":null}',
    '{"tool":"write_file","arguments":{"path":"workspace/locales/en.json","content":"bad","extra":1}}',
    '{"tool":"read_file","arguments":{"path":"task.txt"},"private":true}']) assert.equal(broker.call(request).ok, false);
  assert.deepEqual(broker.inspect().final_manifest, before);
});

test('writes and deletion require exact case-scoped grants and preserve all other files', () => {
  const broker = createBroker(fixtures(), policy);
  assert.equal(invoke(broker, 'write_file', { path: 'workspace/locales/en.json', content: '{"label":"Log in"}' }).ok, true);
  for (const path of ['skills/alpha/SKILL.md', 'task.txt', 'workspace/src/handler.js', 'workspace/locales/en.json.extra']) {
    assert.equal(invoke(broker, 'write_file', { path, content: 'changed' }).ok, false);
    assert.equal(invoke(broker, 'delete_file', { path }).ok, false);
  }
  assert.equal(gradeArtifacts(broker, [{ id: 'handler', type: 'file_unchanged', path: 'workspace/src/handler.js' }]).status, 'passed');
  assert.equal(invoke(broker, 'delete_file', { path: 'workspace/locales/en.json' }).ok, true);
  assert.equal(invoke(broker, 'read_file', { path: 'workspace/locales/en.json' }).reason, 'missing_file');
});

test('directory grants have separator boundaries and cannot authorize runtime or control directories', () => {
  const broker = createBroker(fixtures(), { writable_roots: ['workspace/output/'] });
  assert.equal(invoke(broker, 'write_file', { path: 'workspace/output/result.txt', content: 'ok' }).ok, true);
  for (const path of ['workspace/output-escape/result.txt', 'workspace/output/.codex/config', 'workspace/output/.git/HEAD']) {
    assert.equal(invoke(broker, 'write_file', { path, content: 'bad' }).ok, false);
  }
  assert.throws(() => createBroker(fixtures(), { writable_roots: ['skills/'] }), /Write grants/);
  assert.throws(() => createBroker(fixtures(), { writable_paths: ['task.txt'] }), /Write grants/);
});

test('file, ancestor and directory case collisions are rejected before mutation', () => {
  const broker = createBroker(fixtures(), { writable_roots: ['workspace/'] });
  for (const path of ['workspace/locales/EN.json', 'workspace/locales', 'workspace/locales/en.json/child', 'workspace/Locales/new.json']) {
    assert.equal(invoke(broker, 'write_file', { path, content: 'bad' }).reason, 'path_collision');
  }
  for (const path of ['workspace/Locales/other.json', 'workspace/src', 'private/record.json', 'skills/alpha/evals/oracle.json']) {
    assert.throws(() => createBroker([...fixtures(), { path, bytes: Buffer.from('bad') }]), /Invalid or colliding/);
  }
});

test('binary reads and writes require canonical encoding without silent corruption', () => {
  const broker = createBroker([...fixtures(), { path: 'workspace/data.bin', bytes: Buffer.from([0xff, 0xfe]) }], { writable_roots: ['workspace/'] });
  assert.equal(invoke(broker, 'read_file', { path: 'workspace/data.bin' }).reason, 'binary_requires_base64');
  const read = invoke(broker, 'read_file', { path: 'workspace/data.bin', encoding: 'base64' });
  assert.equal(read.content, '//4=');
  assert.equal(invoke(broker, 'write_file', { path: 'workspace/copy.bin', encoding: 'base64', content: read.content }).ok, true);
  assert.equal(invoke(broker, 'write_file', { path: 'workspace/copy.bin', encoding: 'base64', content: 'not base64!' }).reason, 'noncanonical_content');
  assert.equal(invoke(broker, 'write_file', { path: 'workspace/copy.bin', content: '\ud800' }).reason, 'noncanonical_content');
});

test('file and aggregate limits reject oversized writes atomically', () => {
  const inputs = [{ path: 'workspace/a.txt', bytes: Buffer.from('12345') }];
  const broker = createBroker(inputs, { writable_roots: ['workspace/'], limits: { max_file_bytes: 8, max_total_bytes: 10 } });
  assert.equal(invoke(broker, 'write_file', { path: 'workspace/b.txt', content: '123456' }).reason, 'total_limit');
  assert.equal(invoke(broker, 'write_file', { path: 'workspace/a.txt', content: '123456789' }).reason, 'file_limit');
  assert.equal(invoke(broker, 'read_file', { path: 'workspace/a.txt' }).content, '12345');
  assert.throws(() => createBroker(inputs, { limits: { max_calls: 1001 } }), /ceilings/);
  assert.throws(() => createBroker(inputs, { limits: { max_file_bytes: 4 } }), /resource limits/);
});

test('tool trace retains denied attempts, sequence and hashes without raw document content', () => {
  const broker = createBroker(fixtures(), policy);
  invoke(broker, 'read_file', { path: 'skills/alpha/SKILL.md' });
  invoke(broker, 'write_file', { path: 'task.txt', content: 'PRIVATE-CONTENT-SENTINEL' });
  invoke(broker, 'read_file', { path: 'workspace/missing.txt' });
  const state = broker.inspect();
  assert.deepEqual(state.trace.map(event => event.decision), ['accepted', 'denied', 'denied']);
  assert.deepEqual(state.trace.map(event => event.sequence), [1, 2, 3]);
  assert.deepEqual(state.loaded_skill_entries, ['skills/alpha/SKILL.md']);
  assert.equal(state.activation_observed, false);
  assert(!JSON.stringify(state).includes('PRIVATE-CONTENT-SENTINEL'));
  assert(state.trace.every(event => /^[a-f0-9]{64}$/.test(event.request_sha256)));
});

test('oversized requests are rejected without hashing or encoding their complete content', () => {
  const broker = createBroker([{ path: 'task.txt', bytes: Buffer.from('task') }], { limits: { max_file_bytes: 8 } });
  const huge = 'x'.repeat(5000), originalHash = crypto.createHash, originalLength = Buffer.byteLength;
  let fullHash = false, fullScan = false;
  crypto.createHash = (...args) => {
    const instance = originalHash(...args), originalUpdate = instance.update;
    instance.update = function (value, ...rest) { if (value === huge) fullHash = true; return originalUpdate.call(this, value, ...rest); };
    return instance;
  };
  Buffer.byteLength = (value, ...rest) => { if (value === huge) fullScan = true; return originalLength(value, ...rest); };
  try { assert.equal(broker.call(huge).reason, 'invalid_request'); }
  finally { crypto.createHash = originalHash; Buffer.byteLength = originalLength; }
  assert.equal(fullHash, false); assert.equal(fullScan, false);
  assert.equal(broker.inspect().trace[0].request_sha256, null);
  assert.equal(broker.inspect().trace[0].request_chars, 5000);
});

test('call overflow is counted and an incomplete trace cannot pass an exact trace oracle', () => {
  const broker = createBroker(fixtures(), { limits: { max_calls: 1 } });
  invoke(broker, 'read_file', { path: 'task.txt' });
  assert.equal(invoke(broker, 'read_file', { path: 'task.txt' }).reason, 'call_limit');
  const state = broker.inspect();
  assert.equal(state.calls_attempted, 2); assert.equal(state.calls_not_recorded, 1); assert.equal(state.trace_complete, false);
  const equals = state.trace.map(({ tool, path, decision, reason }) => ({ tool, path, decision, reason }));
  assert.equal(gradeArtifacts(broker, [{ id: 'trace', type: 'tool_decisions', equals }]).status, 'failed');
});

test('private artifact grading rejects missing, changed and malformed outputs', () => {
  const broker = createBroker(fixtures(), policy);
  assert.equal(gradeArtifacts(broker, [{ id: 'missing', type: 'file_unchanged', path: 'workspace/not-present' }]).status, 'failed');
  assert.equal(gradeArtifacts(broker, [{ id: 'hash', type: 'file_sha256', path: 'task.txt', sha256: digest('wrong') }]).status, 'failed');
  invoke(broker, 'write_file', { path: 'workspace/locales/en.json', content: 'malformed' });
  assert.equal(gradeArtifacts(broker, [{ id: 'json', type: 'json_value', path: 'workspace/locales/en.json', keys: ['label'], equals: 'Log in' }]).status, 'failed');
  assert.throws(() => gradeArtifacts(broker, [{ id: 'unknown', type: 'run_shell' }]), /Unsupported/);
  assert.throws(() => gradeArtifacts(broker, [{ id: 'x', type: 'manual' }, { id: 'x', type: 'manual' }]), /Unique/);
});

test('remaining manual checks and empty grading never become a pass', () => {
  const broker = createBroker(fixtures());
  assert.equal(gradeArtifacts(broker, []).status, 'not_run');
  assert.equal(gradeArtifacts(broker, [
    { id: 'unchanged', type: 'file_unchanged', path: 'task.txt' }, { id: 'semantic', type: 'manual' },
  ]).status, 'unverified');
});

test('a successful scripted repair is still not a model run or model success', () => {
  const report = runScriptedProbe({ publicFiles: fixtures(), policy,
    actions: [{ tool: 'write_file', arguments: { path: 'workspace/locales/en.json', content: '{"label":"Log in"}' } }],
    checks: [
      { id: 'label', type: 'json_value', path: 'workspace/locales/en.json', keys: ['label'], equals: 'Log in' },
      { id: 'preserved', type: 'file_unchanged', path: 'workspace/src/handler.js' },
      { id: 'absent', type: 'file_absent', path: 'workspace/unwanted.txt' },
      { id: 'exact', type: 'file_sha256', path: 'workspace/locales/en.json', sha256: digest('{"label":"Log in"}') },
    ] });
  assert.equal(report.artifact_grading.status, 'passed');
  assert.equal(report.status, 'not_run'); assert.equal(report.model_execution, false);
  assert.equal(report.model_effective, null); assert.equal(report.cost, null);
});

test('public and toolset hashes are deterministic and track different treatments', () => {
  const a = createBroker(fixtures(), policy).inspect();
  const b = createBroker(fixtures().reverse(), policy).inspect();
  assert.equal(a.public_bundle_sha256, b.public_bundle_sha256);
  assert.equal(a.toolset_sha256, b.toolset_sha256);
  const c = createBroker(fixtures(), { writable_roots: ['workspace/'] }).inspect();
  assert.equal(a.public_bundle_sha256, c.public_bundle_sha256);
  assert.notEqual(a.toolset_sha256, c.toolset_sha256);
  const preparedManifest = fixtures().sort((a, b) => a.path < b.path ? -1 : 1)
    .map(file => ({ path: file.path, sha256: digest(file.bytes), bytes: file.bytes.length }));
  assert.equal(a.public_bundle_sha256, digest(JSON.stringify(preparedManifest)));
});
console.log(`Skill evaluation broker tests passed: ${passed}`);
