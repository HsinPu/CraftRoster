'use strict';
// Public read-only audit recorder. No credentials, environment inheritance,
// external code execution, lock update, package install, or canonical writes.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../../..');
const output = path.join(__dirname, 'remote-skill-verification.json');
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const allowedEnvironment = { SystemRoot: 'C:\\Windows', WINDIR: 'C:\\Windows' };
const timeoutMs = 300000;
function safeFile(relative) {
  const absolute = path.resolve(root, relative), resolved = fs.realpathSync(absolute);
  if (resolved !== absolute || !resolved.startsWith(root + path.sep) || !fs.statSync(resolved).isFile()) throw Error(`Unsafe repository file: ${relative}`);
  return resolved;
}
function fingerprint(files) {
  const entries = files.slice().sort().map(file => {
    const bytes = fs.readFileSync(safeFile(file)); return { path: file, bytes: bytes.length, sha256: sha256(bytes) };
  });
  return { sha256: sha256(JSON.stringify(entries)), files: entries };
}
function run(script, argumentsList, name) {
  const startedAt = new Date().toISOString(), started = performance.now();
  const child = spawnSync(process.execPath, [script, ...argumentsList], { cwd: root, env: allowedEnvironment,
    windowsHide: true, shell: false, timeout: timeoutMs, maxBuffer: 1048576, encoding: 'utf8' });
  const stdout = child.stdout || '', stderr = child.stderr || '';
  const result = { name, executable: process.execPath, arguments: [script, ...argumentsList],
    started_at: startedAt, finished_at: new Date().toISOString(), elapsed_ms: Math.round(performance.now() - started),
    timeout_ms: timeoutMs, output_limit_bytes: 1048576, exit_code: child.status, signal: child.signal,
    process_error_code: child.error?.code || null, status: child.error || child.status !== 0 ? 'error' : 'passed',
    stdout, stderr, stdout_sha256: sha256(stdout), stderr_sha256: sha256(stderr), completed_coverage: null };
  if (name === 'pinned_sources') {
    const local = stdout.match(/^Skill source manifest verified: (\d+) Skills, (\d+) repositories, (\d+) paths$/m);
    result.local_manifest_coverage = local ? { skills: Number(local[1]), repositories: Number(local[2]), paths: Number(local[3]) } : null;
    const match = stdout.match(/^Remote pinned Skill source trees verified: (\d+) repositories, (\d+) paths, (\d+) license evidence files$/m);
    if (!child.error && child.status === 0 && match) result.completed_coverage = {
      repositories: Number(match[1]), unique_paths_including_license: Number(match[2]), license_evidence_files: Number(match[3]),
    };
  } else {
    const match = stdout.match(/^Skill originality audit passed: (\d+) Skills, (\d+) local text files, (\d+) pinned upstream files, (\d+) comparisons$/m);
    if (!child.error && child.status === 0 && match) result.completed_coverage = {
      skills: Number(match[1]), local_text_files: Number(match[2]), unique_upstream_files: Number(match[3]), comparisons: Number(match[4]), suspicious_overlaps: 0,
    };
    const failures = stderr.match(/Skill originality audit failed with (\d+) suspicious overlap\(s\):/);
    result.reported_suspicious_overlap_count = failures ? Number(failures[1]) : result.completed_coverage ? 0 : null;
  }
  if (result.status === 'passed' && !result.completed_coverage) result.status = 'error_unrecognized_summary';
  console.log(JSON.stringify({ name, status: result.status, exit_code: result.exit_code, process_error_code: result.process_error_code,
    elapsed_ms: result.elapsed_ms, completed_coverage: result.completed_coverage, stdout, stderr }));
  return result;
}
if (fs.existsSync(output)) throw Error('Refusing to overwrite remote-skill-verification.json');
const startedAt = new Date().toISOString();
const sourceFiles = ['scripts/verify-skill-sources.js', 'scripts/audit-skill-originality.js', 'scripts/generate-skill-catalog.js',
  'scripts/lib/skill-dependencies.js', 'docs/audits/skill-optimization-2026-09-16/record-remote-skill-verification.cjs'];
const manifestFiles = ['skills.json', 'scripts/data/skill-reference-sources.json', 'scripts/data/skill-reference-lock.json'];
sourceFiles.concat(manifestFiles).forEach(safeFile);
// Audit functions are imported only to construct local expected scope; their CLI
// main functions are require.main guarded and no network is started here.
const verifier = require(path.join(root, 'scripts/verify-skill-sources.js'));
const auditor = require(path.join(root, 'scripts/audit-skill-originality.js'));
const state = verifier.validateRepository(root), plan = auditor.buildAuditPlan(root);
const localFiles = [...new Set(plan.items.flatMap(item => item.localFiles.map(file => file.path)))];
const before = { sources: fingerprint(sourceFiles), manifests: fingerprint(manifestFiles), local_packages: fingerprint(localFiles) };
const catalog = JSON.parse(fs.readFileSync(safeFile('skills.json'), 'utf8'));
const expected = { catalog_skills: catalog.skills.length, referenced_skills: plan.referencedSkillCount,
  unreferenced_skills_outside_audit: catalog.skills.length - plan.referencedSkillCount,
  repositories: state.sourceCount, unique_paths_including_license: state.referencePathCount,
  local_text_files: plan.localFileCount, mapped_upstream_paths: plan.upstreamPathCount,
  unique_upstream_files: new Set(plan.items.flatMap(item => item.upstreamFiles.map(file => `${file.repo}@${file.commit}/${file.path}`))).size,
  comparisons: plan.items.reduce((total, item) => total + item.localFiles.length * item.upstreamFiles.length, 0) };
console.log(JSON.stringify({ phase: 'start', started_at: startedAt, expected_coverage: expected, environment_keys: Object.keys(allowedEnvironment) }));
const runs = [run('scripts/verify-skill-sources.js', ['--remote'], 'pinned_sources'),
  run('scripts/audit-skill-originality.js', [], 'originality')];
const after = { sources: fingerprint(sourceFiles), manifests: fingerprint(manifestFiles), local_packages: fingerprint(localFiles) };
const stable = ['sources','manifests','local_packages'].every(key => before[key].sha256 === after[key].sha256);
const record = { schema_version: 1, evaluation_kind: 'public_pinned_skill_source_verification',
  started_at: startedAt, finished_at: new Date().toISOString(), status: !stable ? 'invalidated_inputs_changed'
    : runs.every(result => result.status === 'passed') ? 'passed' : 'error',
  model_calls: 0, node_version: process.version, environment_keys: Object.keys(allowedEnvironment), inherited_environment: false,
  public_hosts: ['api.github.com','raw.githubusercontent.com'], credentials_supplied: false, lock_updated: false,
  expected_coverage: expected, input_stability: stable ? 'unchanged' : 'changed', before, after,
  pinned_sources: state.sources.map(source => ({ repository: source.repo, commit: source.revision, tree: source.tree,
    license: source.license, license_evidence: source.licenseEvidence, skills: source.skills,
    mapped_evidence: source.pathEvidence })), runs,
  limitations: [
    'Coverage is limited to referenced Skills and manifest-mapped pinned sources; unreferenced Skills and arbitrary upstream repositories are outside this audit.',
    'The verifier reads public commit/tree metadata and license blobs; a recursive tree response is metadata, not a checkout or execution of repository code.',
    'Originality compares every decoded text file in each referenced local Skill package with that Skill\'s mapped upstream raw files, including local evals. Unknown binary formats are excluded.',
    'The overlap heuristic uses normalized lines of at least 60 characters, exact 12-word phrases, or 32 CJK characters, with structural frontmatter and boilerplate exclusions. No finding is not a proof of originality or a legal license determination.',
    'Built-in scripts may retry transient requests at most three times; the recorder imposes a five-minute process timeout per run. HTTP, network, rate-limit and timeout failures are errors, never skipped passes.',
    'A failed CLI does not report partial remote coverage; completed_coverage is null unless its full success summary and zero exit are observed. Error text is retained as actual stdout/stderr.',
    'Source, manifest and audited local-package hashes are compared before/after. Network responses are not archived; Git object identities are checked by the existing verifier and pinned raw URLs by the existing originality auditor.',
  ] };
fs.writeFileSync(output, JSON.stringify(record, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ phase: 'recorded', output: path.relative(root, output).split(path.sep).join('/'), status: record.status,
  input_stability: record.input_stability, record_sha256: sha256(fs.readFileSync(output)) }));
process.exitCode = record.status === 'passed' ? 0 : 1;
