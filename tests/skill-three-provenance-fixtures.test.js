'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { buildBundle } = require('../scripts/prepare-skill-pilot');
const { createBroker } = require('../scripts/lib/skill-eval-broker');
const root = path.resolve(__dirname, '..');
const fixture = path.join(root, 'skills/threejs-development/evals/fixtures/pinned-provenance');
const read = name => JSON.parse(fs.readFileSync(path.join(fixture, name)));
const policy = read('existing-policy.json');
const evidence = read('upstream-evidence.json');
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const before = fs.readdirSync(fixture).sort().map(file => [file, digest(fs.readFileSync(path.join(fixture, file)))]);
let passed = 0;
function test(name, fn) { fn(); passed++; console.log(`PASS ${name}`); }
test('the public policy matches all current pinned reference paths and provenance sources', () => {
  assert.equal(policy.local_source_digest_algorithm, 'sha256-utf8-lf');
  for (const entry of policy.sources) assert.equal(digest(fs.readFileSync(path.join(root, entry.path), 'utf8').replace(/\r\n/g, '\n')), entry.sha256);
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'scripts/data/skill-reference-sources.json')));
  const source = manifest.repositories.find(item => item.repo === policy.repository);
  assert.equal(policy.revision, source.commit);
  assert.equal(policy.tree, source.tree);
  assert.deepEqual(policy.root_license_evidence, source.licenseEvidence);
  assert.deepEqual(policy.reference_paths, Object.entries(source.skills).map(([local_skill, [item]]) => ({ local_skill, path: item.path, git_blob: item.blob })));
  assert.equal(policy.reference_paths.length, 24);
  assert(policy.reference_paths.every(item => /^skills\/[^/]+\/SKILL\.md$/.test(item.path)));
});
test('root, package and path-level notices retain materially different declarations', () => {
  assert.equal(evidence.repository, policy.repository);
  assert.equal(evidence.revision, policy.revision);
  assert.equal(evidence.declarations.root_license, 'MIT');
  assert.equal(evidence.declarations.package_license, 'MIT AND GPL-3.0-only');
  assert.equal(evidence.source_files.find(item => item.path === 'LICENSE').git_blob, policy.root_license_evidence.blob);
  for (const item of evidence.source_files) {
    assert.equal(item.url, `https://raw.githubusercontent.com/${policy.repository}/${policy.revision}/${item.path}`);
    assert.equal(item.status, 200);
    assert.match(item.sha256, /^[a-f0-9]{64}$/);
    assert.match(item.git_blob, /^[a-f0-9]{40}$/);
    assert(item.bytes > 0 && item.bytes < 256 * 1024);
  }
  const notices = evidence.declarations.selected_notices;
  assert.equal(notices.find(item => item.source.endsWith('demo-2023-rain-puddle')).declared_license, 'GPL-3.0');
  assert.equal(notices.filter(item => item.observed_upstream_license === null).length, 2);
  assert(notices.flatMap(item => item.paths).every(p => !policy.reference_paths.some(item => item.path === p)));
  assert.equal(policy.current_remote_originality_result.status, 'not_run');
  assert.equal(policy.current_remote_originality_result.observed_at, null);
});
test('preparation includes only declared metadata and current runtime skills, excluding author tests and upstream payloads', () => {
  const bundle = buildBundle({ skill: 'threejs-development', caseId: 6 });
  assert.equal(bundle.privateRecord.status, 'not_run');
  assert.deepEqual(bundle.privateRecord.fixture_manifest.map(item => item.path).sort(), before.map(([p]) => p));
  assert.equal(before.length, 3);
  assert(!bundle.publicFiles.some(item => /collect-threejs-license-evidence|skill-three-provenance-fixtures|node_modules|source_materials\//.test(item.path)));
  assert(!bundle.publicFiles.some(item => item.path.endsWith('.png') || item.path.endsWith('.glb')));
  assert(bundle.publicFiles.some(item => item.path.endsWith('/threejs-development/SKILL.md')));
});
test('read-only metadata inspection cannot mutate policy or import files through the broker', () => {
  const bundle = buildBundle({ skill: 'threejs-development', caseId: 6 });
  const broker = createBroker(bundle.publicFiles);
  const call = (tool, args) => broker.call(JSON.stringify({ tool, arguments: args }));
  assert.equal(call('read_file', { path: 'workspace/upstream-evidence.json' }).ok, true);
  for (const file of ['workspace/existing-policy.json', 'workspace/vendor/copied.js']) {
    assert.equal(call('write_file', { path: file, content: 'unauthorized import' }).reason, 'write_not_granted');
  }
  assert.equal(call('read_file', { path: 'private/record.json' }).ok, false);
  assert.equal(broker.inspect().trace.filter(item => item.decision === 'denied').length, 3);
});
test('offline author checks leave primary evidence and canonical policy unchanged', () => {
  assert.deepEqual(fs.readdirSync(fixture).sort().map(file => [file, digest(fs.readFileSync(path.join(fixture, file)))]), before);
});
console.log(`${passed} provenance fixture checks passed; no model, import, whole-tree or remote originality result claimed.`);
