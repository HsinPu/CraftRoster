'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { buildBundle } = require('../scripts/prepare-skill-pilot');
const { createBroker, gradeArtifacts } = require('../scripts/lib/skill-eval-broker');

// Offline author material checks only. This default suite does not spawn Python,
// install anything, execute fixture/generated code, contact a model, or assert
// that the missing implementation works. A Python baseline run is separate.
const repo = path.resolve(__dirname, '..');
const root = path.join(repo, 'skills/python-development/evals/fixtures/config-summary');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const compare = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
function inventory() {
  const files = [];
  function visit(directory, prefix = '') {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      assert.equal(entry.isSymbolicLink(), false);
      const name = prefix + entry.name;
      if (entry.isDirectory()) visit(path.join(directory, entry.name), `${name}/`);
      else {
        assert.equal(entry.isFile(), true);
        const bytes = fs.readFileSync(path.join(root, name));
        files.push({ path: name, sha256: sha(bytes), bytes: bytes.length });
      }
    }
  }
  visit(root);
  return files.sort((a, b) => compare(a.path, b.path));
}
const original = inventory();
const valid = JSON.parse(read('examples/valid.json'));
const invalid = JSON.parse(read('examples/invalid-cases.json'));
let passed = 0;
function test(name, run) { run(); passed += 1; console.log(`PASS ${name}`); }

// Private consistency check for authored sample data. Keep the original JSON
// token for workers: JavaScript JSON.parse otherwise collapses 2.0 into 2.
// Each invalid case occupies one line in this deliberately small data file.
const invalidLines = read('examples/invalid-cases.json').split(/\r?\n/).map(line => line.trim().replace(/,$/, '')).filter(line => line.startsWith('{'));
const workerTokens = new Map(invalidLines.map(line => [JSON.parse(line).id, line.match(/"workers"\s*:\s*([^,}]+)/)?.[1].trim()]));
function sampleViolations(config, workerToken) {
  if (config === null || Array.isArray(config) || typeof config !== 'object') return ['root'];
  const failures = [];
  if (typeof config.service_name !== 'string' || !/^[A-Za-z][A-Za-z0-9_-]{0,39}$/.test(config.service_name.trim())) failures.push('service_name');
  if (typeof config.workers !== 'number' || !Number.isInteger(config.workers) || config.workers < 1 || config.workers > 32
    || (workerToken !== undefined && !/^[1-9][0-9]*$/.test(workerToken))) failures.push('workers');
  return failures;
}

test('all eight declared materials are small regular UTF-8 files with no generated output', () => {
  assert.deepEqual(original.map(file => file.path), [
    'CONTRACT.md', 'examples/invalid-cases.json', 'examples/malformed.json', 'examples/valid.json',
    'pyproject.toml', 'src/config_tools/__init__.py', 'src/config_tools/labels.py', 'tests/test_labels.py',
  ]);
  for (const file of original) {
    assert.ok(file.bytes > 0 && file.bytes < 16384, file.path);
    const bytes = fs.readFileSync(path.join(root, file.path));
    assert.ok(Buffer.from(bytes.toString('utf8')).equals(bytes), file.path);
    assert.equal(/(?:^|\/)(?:__pycache__|\.venv|node_modules)(?:\/|$)|\.pyc$/.test(file.path), false);
  }
});

test('project declares Python 3.12 or newer with no dependency or build installation requirement', () => {
  const metadata = read('pyproject.toml');
  assert.match(metadata, /^\[project\]$/m);
  assert.match(metadata, /^requires-python\s*=\s*">=3\.12"$/m);
  assert.match(metadata, /^dependencies\s*=\s*\[\]$/m);
  assert.doesNotMatch(metadata, /\[(?:build-system|project\.scripts|project\.optional-dependencies)\]/);
  const baselineTest = read('tests/test_labels.py');
  assert.match(baselineTest, /class DisplayLabelTests\(unittest\.TestCase\)/);
  assert.match(baselineTest, /from config_tools\.labels import display_label/);
  assert.match(baselineTest, /parents\[1\] \/ "src"/);
  assert.equal((baselineTest.match(/    def test_/g) || []).length, 2);
});

test('the requested summary implementation and its focused tests are absent, while existing unrelated code is present', () => {
  assert.equal(fs.existsSync(path.join(root, 'src/config_tools/summary.py')), false);
  assert.equal(fs.existsSync(path.join(root, 'tests/test_summary.py')), false);
  assert.match(read('src/config_tools/labels.py'), /def display_label\(value: str\) -> str:/);
  assert.doesNotMatch(read('src/config_tools/labels.py'), /json|workers|service_name/);
  assert.doesNotMatch(read('tests/test_labels.py'), /summary|workers|service_name/);
});

test('the runnable valid sample exercises normalization and an ignored extra field without hiding credentials', () => {
  assert.deepEqual(sampleViolations(valid, '4'), []);
  assert.notEqual(valid.service_name, valid.service_name.trim());
  assert.equal(valid.service_name.trim(), 'Notes_API');
  assert.equal(valid.workers, 4);
  assert.equal(typeof valid.comment, 'string');
  assert.deepEqual(Object.keys(valid).sort(), ['comment', 'service_name', 'workers']);
});

test('each invalid sample violates the declared boundary, including distinct boolean and floating-point tokens', () => {
  assert.equal(workerTokens.size, invalid.length);
  assert.equal(new Set(invalid.map(item => item.id)).size, invalid.length);
  for (const item of invalid) assert.ok(sampleViolations(item.config, workerTokens.get(item.id)).length > 0, item.id);
  assert.equal(workerTokens.get('floating-token-workers'), '2.0');
  assert.equal(workerTokens.get('boolean-workers'), 'true');
  assert.equal(workerTokens.get('string-workers'), '"4"');
  assert.equal(invalid.find(item => item.id === 'null-root').config, null);
  assert.ok(Array.isArray(invalid.find(item => item.id === 'array-root').config));
  assert.throws(() => JSON.parse(read('examples/malformed.json')), SyntaxError);
});

test('private boundary mutations distinguish valid limits from coercion, long names, and out-of-range workers', () => {
  for (const workers of [1, 32]) assert.deepEqual(sampleViolations({ service_name: 'a'.repeat(40), workers }, String(workers)), []);
  for (const workers of [0, 33, -1, true, '4', null, 1.5]) assert.deepEqual(sampleViolations({ service_name: 'notes-api', workers }), ['workers']);
  for (const service_name of ['', ' ', 'a'.repeat(41), '3notes', 'notes api', '記事', 'notes\napi', null, 12]) {
    assert.deepEqual(sampleViolations({ service_name, workers: 1 }, '1'), ['service_name']);
  }
  const unknown = { ...valid, unused: { nested: 'PRIVATE-AUTHOR-EXTRA' } };
  assert.deepEqual(sampleViolations(unknown, '4'), []);
});

const bundle = buildBundle({ root: repo, skill: 'python-development', caseId: 1 });
test('case 1 declares all source bytes including malformed JSON and preserves four private assertions', () => {
  assert.deepEqual([...bundle.privateRecord.fixture_manifest].sort((a, b) => compare(a.path, b.path)), original);
  const files = bundle.publicFiles.filter(file => file.path.startsWith('workspace/'));
  assert.deepEqual(files.map(file => ({ path: file.path.slice('workspace/'.length), sha256: sha(file.bytes), bytes: file.bytes.length })), original);
  assert.equal(bundle.privateRecord.assertions.length, 4);
  assert.equal(bundle.publicFiles.find(file => file.path === 'workspace/examples/malformed.json').bytes.toString('utf8'), read('examples/malformed.json'));
});

test('public task bundle excludes private grader logic, assertions, and fixture-oracle sentinels', () => {
  assert.ok(bundle.publicFiles.every(file => !file.path.startsWith('tests/') && !file.path.includes('/evals/')));
  const text = bundle.publicFiles.map(file => file.bytes.toString('utf8')).join('\n');
  assert.equal(text.includes(bundle.privateRecord.expected_output), false);
  assert.equal(text.includes('PRIVATE-AUTHOR-EXTRA'), false);
  assert.equal(text.includes('function sampleViolations'), false);
  for (const check of bundle.privateRecord.assertions) assert.equal(text.includes(check.text), false);
});

test('proposed file grants permit new deliverables while preserving baseline code, metadata, and examples', () => {
  const granted = ['workspace/src/config_tools/summary.py', 'workspace/tests/test_summary.py'];
  const broker = createBroker(bundle.publicFiles, { writable_paths: granted });
  const call = (tool, args) => broker.call(JSON.stringify({ tool, arguments: args }));
  for (const file of original) assert.equal(call('read_file', { path: `workspace/${file.path}` }).ok, true);
  for (const file of granted) assert.equal(call('write_file', { path: file, content: '# Author transport data only; not an implementation.\n' }).ok, true);
  for (const file of ['src/config_tools/labels.py', 'tests/test_labels.py', 'pyproject.toml', 'examples/valid.json']) {
    assert.deepEqual(call('write_file', { path: `workspace/${file}`, content: '' }), { ok: false, reason: 'write_not_granted' });
  }
  assert.deepEqual(call('read_file', { path: 'private/record.json' }), { ok: false, reason: 'invalid_or_private_path' });
  assert.deepEqual(call('exec_command', { command: 'python' }), { ok: false, reason: 'unknown_tool' });
  const finalFiles = new Map(broker.snapshot().map(file => [file.path, file.bytes]));
  for (const file of original) assert.equal(sha(finalFiles.get(`workspace/${file.path}`)), file.sha256);
  assert.equal(broker.inspect().trace_complete, true);
  assert.equal(broker.inspect().activation_observed, false);
  // These virtual grants are a possible evaluator policy, not a host OS sandbox.
});

test('material checks leave canonical sources unchanged and do not count as Python or model acceptance', () => {
  const broker = createBroker(bundle.publicFiles);
  assert.equal(gradeArtifacts(broker, bundle.privateRecord.assertions.map(check => ({ id: check.id, type: 'manual' }))).status, 'unverified');
  assert.equal(gradeArtifacts(broker, []).status, 'not_run');
  assert.equal(bundle.privateRecord.status, 'not_run');
  assert.equal(bundle.privateRecord.split, 'development');
  assert.equal(bundle.privateRecord.model_effective, null);
  assert.ok(bundle.privateRecord.assertions.every(check => check.status === 'not_run' && check.evidence === null));
  assert.deepEqual(inventory(), original);
});

console.log(`${passed} Python fixture material checks passed; Python execution not_run by this Node suite; model evaluation not_run; development data only.`);
