'use strict';
// Local authored actions only. This file has no model, network, or subprocess client.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../../..');
const { buildBundle } = require(path.join(root, 'scripts/prepare-skill-pilot'));
const { createBroker, runScriptedProbe } = require(path.join(root, 'scripts/lib/skill-eval-broker'));
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const output = path.resolve(process.argv[2] || path.join(__dirname, 'pilot-local-tool-probe.json'));
if (process.argv.length > 3 || fs.existsSync(output)) throw new Error('Provide one new output file; existing evidence is never overwritten');

const bundle = buildBundle({ root, skill: 'code-change-workflow', caseId: 4 });
const actions = [
  { tool: 'read_file', arguments: { path: 'skills/code-change-workflow/SKILL.md' } },
  { tool: 'read_file', arguments: { path: 'workspace/locales/en.json' } },
  { tool: 'read_file', arguments: { path: 'private/record.json' } },
  { tool: 'write_file', arguments: { path: 'workspace/src/sign-in.js', content: 'unauthorized mutation sentinel' } },
  { tool: 'shell', arguments: { command: 'node test/sign-in.test.js' } },
  { tool: 'write_file', arguments: { path: 'workspace/locales/en.json', content: '{ "auth": { "signIn": "Log in" } }\n' } },
];
const decisions = [
  { tool: 'read_file', path: 'skills/code-change-workflow/SKILL.md', decision: 'accepted', reason: null },
  { tool: 'read_file', path: 'workspace/locales/en.json', decision: 'accepted', reason: null },
  { tool: 'read_file', path: 'private/record.json', decision: 'denied', reason: 'invalid_or_private_path' },
  { tool: 'write_file', path: 'workspace/src/sign-in.js', decision: 'denied', reason: 'write_not_granted' },
  { tool: 'shell', path: null, decision: 'denied', reason: 'unknown_tool' },
  { tool: 'write_file', path: 'workspace/locales/en.json', decision: 'accepted', reason: null },
];
const probe = runScriptedProbe({ publicFiles: bundle.publicFiles,
  policy: { writable_paths: ['workspace/locales/en.json'] }, actions,
  checks: [
    { id: 'label-value', type: 'json_value', path: 'workspace/locales/en.json', keys: ['auth', 'signIn'], equals: 'Log in' },
    { id: 'handler-preserved', type: 'file_unchanged', path: 'workspace/src/sign-in.js' },
    { id: 'skill-preserved', type: 'file_unchanged', path: 'skills/code-change-workflow/SKILL.md' },
    { id: 'exact-tool-decisions', type: 'tool_decisions', equals: decisions },
    { id: 'remaining-semantic-rubric', type: 'manual' },
  ] });
assert.equal(probe.public_bundle_sha256, bundle.privateRecord.public_bundle_sha256);
assert.equal(probe.artifact_grading.status, 'unverified');
assert(probe.artifact_grading.checks.slice(0, 4).every(check => check.status === 'passed'));
assert.equal(probe.status, 'not_run');
const { initial_manifest, final_manifest, ...compactProbe } = probe;

const delivery = [2, 4, 5, 6].map(caseId => {
  const prepared = buildBundle({ root, skill: 'verified-software-delivery', caseId });
  const state = createBroker(prepared.publicFiles).inspect();
  assert.equal(state.public_bundle_sha256, prepared.privateRecord.public_bundle_sha256);
  assert.equal(state.calls_attempted, 0);
  return { case_id: prepared.privateRecord.case_id, status: 'not_run',
    public_files: prepared.publicFiles.length, fixture_files: prepared.privateRecord.fixture_manifest.length,
    skill_packages: prepared.privateRecord.skill_packages.length,
    fixture_sha256: prepared.privateRecord.fixture_sha256,
    corpus_case_sha256: prepared.privateRecord.corpus_case_sha256,
    public_bundle_sha256: state.public_bundle_sha256,
    broker_initialization: 'passed', model_calls: 0, assertions_executed: 0 };
});
const report = {
  schema_version: 1, kind: 'offline_virtual_tool_and_delivery_preparation_check',
  created_at: new Date().toISOString(), node: process.version, platform: process.platform,
  status: 'not_run', model_calls: 0, host_isolation_enforced: false,
  implementation_hashes: Object.fromEntries([
    'scripts/prepare-skill-pilot.js', 'scripts/lib/skill-eval-broker.js',
    'docs/audits/skill-optimization-2026-09-16/run-local-tool-probe.cjs',
  ].map(file => [file, hash(fs.readFileSync(path.join(root, file)))])),
  scripted_probe: { case_id: bundle.privateRecord.case_id,
    corpus_case_sha256: bundle.privateRecord.corpus_case_sha256,
    fixture_sha256: bundle.privateRecord.fixture_sha256,
    actions_sha256: hash(JSON.stringify(actions)), ...compactProbe,
    initial_workspace_manifest: initial_manifest.filter(file => file.path.startsWith('workspace/')),
    final_workspace_manifest: final_manifest.filter(file => file.path.startsWith('workspace/')) },
  delivery_preparations: delivery,
};
fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
console.log(`Saved local probe: four deterministic checks passed, semantic rubric unverified, five cases not_run; ${output}`);
