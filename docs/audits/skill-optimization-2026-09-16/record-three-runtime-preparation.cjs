'use strict';
// Fixed first-party author checks only. Never runs model-generated code.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../../..');
const { buildBundle } = require(path.join(root, 'scripts/prepare-skill-pilot'));
const { createBroker } = require(path.join(root, 'scripts/lib/skill-eval-broker'));
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const cases = [
  { caseId: 2, test: 'tests/skill-three-viewer-fixtures.test.js', protected: ['CONTRACT.md', 'scenario.json'] },
  { caseId: 4, test: 'tests/skill-three-r3f-fixtures.test.js', protected: ['CONTRACT.md', 'scenario.json', 'assets/level.json'] },
  { caseId: 5, test: 'tests/skill-three-renderer-fixtures.test.js', protected: ['CONTRACT.md', 'contracts/requirements.json', 'dependency-evidence.json'] }
];
function main() {
  if (process.argv.slice(2).join(' ') !== '--record-author-checks') throw Error('Explicit --record-author-checks required');
  const output = path.join(__dirname, 'three-runtime-preparation-check.json');
  if (fs.existsSync(output)) throw Error('Preserve existing historical report; create a new version after input changes');
  const results = [], authorChecks = [];
  for (const item of cases) {
    const options = { skill: 'threejs-development', caseId: item.caseId };
    const bundle = buildBundle(options), before = bundle.privateRecord;
    const start = Date.now();
    const run = spawnSync(process.execPath, [item.test], { cwd: root, encoding: 'utf8', timeout: 60000, maxBuffer: 2 * 1024 * 1024 });
    if (run.error || run.status !== 0) throw Error(`Author check failed: ${item.test}\n${run.error?.message || ''}\n${run.stdout}\n${run.stderr}`);
    if (buildBundle(options).privateRecord.fixture_sha256 !== before.fixture_sha256) throw Error('Canonical input changed');
    const passed = run.stdout.split(/\r?\n/).filter(line => /^PASS /.test(line)).length;
    if (!passed) throw Error('Missing explicit check results');
    authorChecks.push({ command: `node ${item.test}`, sha256: hash(fs.readFileSync(path.join(root, item.test))), started_at: new Date(start).toISOString(), elapsed_ms: Date.now() - start, exit_code: run.status, checks_passed: passed, stdout: run.stdout, stderr: run.stderr });
    const grants = { writable_roots: ['workspace/src/', 'workspace/test/', 'workspace/tools/', 'workspace/artifacts/'], writable_paths: ['workspace/package.json', 'workspace/package-lock.json', 'workspace/index.html', 'workspace/style.css'] };
    const broker = createBroker(bundle.publicFiles, grants);
    const call = (tool, args) => broker.call(JSON.stringify({ tool, arguments: args }));
    for (const file of item.protected) {
      if (!call('read_file', { path: `workspace/${file}` }).ok) throw Error('Protected public input unreadable');
      if (call('write_file', { path: `workspace/${file}`, content: '{}' }).ok) throw Error('Acceptance input writable');
    }
    if (call('read_file', { path: 'private/record.json' }).ok) throw Error('Oracle leaked');
    for (const location of ['workspace/src/author-probe.txt', 'workspace/artifacts/author-probe.txt']) {
      if (!call('write_file', { path: location, content: 'probe only' }).ok) throw Error('Scoped change refused');
      if (!call('delete_file', { path: location }).ok) throw Error('Probe cleanup refused');
    }
    const inspected = broker.inspect();
    if (JSON.stringify(inspected.initial_manifest) !== JSON.stringify(inspected.final_manifest)) throw Error('Probe changed snapshot');
    results.push({ case_id: before.case_id, status: 'not_run', model_calls: 0, fixture_files: before.fixture_manifest.length, fixture_manifest: before.fixture_manifest, fixture_sha256: before.fixture_sha256, corpus_case_sha256: before.corpus_case_sha256, public_bundle_sha256: before.public_bundle_sha256, skill_packages: before.skill_packages.length, preparation_check: 'passed', scripted_tool_probe: { status: 'passed', grants, trace: inspected.trace, final_workspace_unchanged: true }, semantic_verdict_graded: false, host_isolation_enforced: false });
  }
  const report = { schema_version: 1, kind: 'offline_three_runtime_fixture_preparation', created_at: new Date().toISOString(), node: process.version, platform: process.platform, status: 'not_run', model_calls: 0, cases: results, author_checks: authorChecks,
    implementation_sha256: Object.fromEntries(['scripts/prepare-skill-pilot.js', 'scripts/lib/skill-eval-broker.js', path.relative(root, __filename).replaceAll('\\', '/')].map(file => [file, hash(fs.readFileSync(path.join(root, file)))])),
    limitations: ['Default Node checks do not render a browser or certify GPU, mobile, XR or production performance.', 'Private disposal and R3F candidates are first-party feasibility checks, not model output or full task completion.', 'Renderer input is a WebGL baseline, not an implemented WebGPU/TSL migration.', 'The original GLB browser attempt crashed with cause unverified; partial observations are retained separately.', 'Tool grants are tested in a pure in-memory broker. No controlled model host, activation or arbitrary-code execution isolation is certified.'] };
  fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify({ report: path.relative(root, output), cases: results.length, author_checks: authorChecks.map(x => x.checks_passed), status: 'not_run', model_calls: 0 }));
}
try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
