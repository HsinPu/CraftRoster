'use strict';
// Executes fixed first-party author checks, never model output or a model service.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../../..');
const { buildBundle } = require(path.join(root, 'scripts/prepare-skill-pilot'));
const { createBroker } = require(path.join(root, 'scripts/lib/skill-eval-broker'));
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const cases = [
  { skill: 'code-review', caseId: 4, test: 'tests/skill-review-react-fixtures.test.js', input: 'CONTRACT.md', grants: {} },
  { skill: 'verified-software-delivery', caseId: 1, test: 'tests/skill-delivery-migration-fixtures.test.js', input: 'CONTRACT.md', grants: { writable_roots: ['workspace/services/', 'workspace/test/', 'workspace/artifacts/', 'workspace/evidence/new/'] } },
  { skill: 'threejs-development', caseId: 6, test: 'tests/skill-three-provenance-fixtures.test.js', input: 'CONTEXT.md', grants: {} }
];
function main() {
  if (process.argv.slice(2).join(' ') !== '--record-author-checks') throw Error('Explicit --record-author-checks required');
  const output = path.join(__dirname, 'ui-delivery-preparation-check-v2.json');
  if (fs.existsSync(output)) throw Error('Historical report already exists; preserve it and create a new dated record when inputs change');
  const results = [], authorChecks = [];
  for (const item of cases) {
    const bundle = buildBundle(item), before = bundle.privateRecord;
    const started = new Date();
    const result = spawnSync(process.execPath, [item.test], { cwd: root, encoding: 'utf8', timeout: 60000, maxBuffer: 2 * 1024 * 1024 });
    if (result.error || result.status !== 0) throw Error(`Author check failed: ${item.test}\n${result.error?.message || ''}\n${result.stdout}\n${result.stderr}`);
    if (buildBundle(item).privateRecord.fixture_sha256 !== before.fixture_sha256) throw Error('Author check changed canonical input');
    const passed = result.stdout.split(/\r?\n/).filter(line => /^PASS /.test(line)).length;
    if (!passed) throw Error(`Missing explicit author check output: ${item.test}`);
    authorChecks.push({ command: `node ${item.test}`, sha256: hash(fs.readFileSync(path.join(root, item.test))), started_at: started.toISOString(), elapsed_ms: Date.now() - started.getTime(), exit_code: result.status, checks_passed: passed, stdout: result.stdout, stderr: result.stderr });
    const broker = createBroker(bundle.publicFiles, item.grants);
    const call = (tool, args) => broker.call(JSON.stringify({ tool, arguments: args }));
    if (!call('read_file', { path: `workspace/${item.input}` }).ok) throw Error('Public input inaccessible');
    if (call('write_file', { path: `workspace/${item.input}`, content: 'invalid' }).ok) throw Error('Protected input writable');
    if (call('read_file', { path: 'private/record.json' }).ok) throw Error('Private oracle readable');
    if (item.grants.writable_roots) {
      if (!call('write_file', { path: 'workspace/artifacts/author-probe.txt', content: 'author probe only' }).ok) throw Error('Scoped output denied');
      if (!call('delete_file', { path: 'workspace/artifacts/author-probe.txt' }).ok) throw Error('Scoped probe cleanup denied');
      if (!call('write_file', { path: 'workspace/evidence/new/author-probe.json', content: '{"status":"probe-only"}' }).ok) throw Error('New evidence receipt denied');
      if (!call('read_file', { path: 'workspace/evidence/new/author-probe.json' }).ok) throw Error('New evidence receipt unreadable');
      if (!call('delete_file', { path: 'workspace/evidence/new/author-probe.json' }).ok) throw Error('New evidence probe cleanup denied');
      for (const protectedPath of ['workspace/evidence/review.json', 'workspace/evidence/initial-checks.json', 'workspace/targets/local.json', 'workspace/contracts/acceptance.json']) {
        if (call('write_file', { path: protectedPath, content: '{}' }).ok) throw Error('Acceptance input writable');
      }
    }
    const inspected = broker.inspect();
    const unchanged = JSON.stringify(inspected.initial_manifest) === JSON.stringify(inspected.final_manifest);
    if (!unchanged) throw Error('Scripted probe changed public snapshot');
    results.push({ case_id: before.case_id, status: 'not_run', model_calls: 0, fixture_files: before.fixture_manifest.length, fixture_manifest: before.fixture_manifest, fixture_sha256: before.fixture_sha256,
      corpus_case_sha256: before.corpus_case_sha256, public_bundle_sha256: before.public_bundle_sha256, skill_packages: before.skill_packages.length,
      preparation_check: 'passed', scripted_tool_probe: { status: 'passed', grants: item.grants, trace: inspected.trace, final_workspace_unchanged: unchanged },
      semantic_verdict_graded: false, host_isolation_enforced: false });
  }
  const report = { schema_version: 1, kind: 'offline_ui_delivery_provenance_fixture_preparation', created_at: new Date().toISOString(), node: process.version, platform: process.platform, status: 'not_run', model_calls: 0,
    supersedes: 'ui-delivery-preparation-check.json', update_reason: 'Grant new delivery receipts under evidence/new/ while preserving original evidence. Receipts outside the excluded evidence root would change source scope and become self-referential.',
    cases: results, author_checks: authorChecks,
    implementation_sha256: Object.fromEntries(['scripts/prepare-skill-pilot.js', 'scripts/lib/skill-eval-broker.js', path.relative(root, __filename).replaceAll('\\', '/')].map(file => [file, hash(fs.readFileSync(path.join(root, file)))])),
    limitations: [
      'React Node checks do not certify browser focus, layout, rendering or devices. Actual browser observations are recorded separately.',
      'Migration services exchange actual serialized responses in-process. The target is synthetic local state, not a network deployment or a real Git commit.',
      'The required independent-review adapter is unavailable; self-written approval claims cannot complete the delivery gate.',
      'Provenance inputs are selected fixed-revision declarations. Metadata verification is not whole-tree path clearance or remote originality execution.',
      'No controlled model host, activation, model cost, semantic outcome or full task result is certified. Browser and arbitrary code execution require separate isolation.'
    ] };
  fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify({ report: path.relative(root, output), cases: results.length, author_checks: authorChecks.map(item => item.checks_passed), model_calls: 0, status: 'not_run' }));
}
try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
