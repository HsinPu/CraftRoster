'use strict';

// Freeze a proposed four-trial comparison. No model transport is imported.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../../..');
const baseline = '7acca1fb8865903dc67ee4c76c147d0881cb9e1b';
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const compare = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const implementationPaths = [
  'scripts/prepare-skill-pilot.js', 'scripts/lib/skill-task-driver.js',
  'scripts/lib/skill-eval-broker.js', path.relative(root, __filename).replaceAll('\\', '/'),
];
const implementations = implementationPaths.map(file => ({ path: file, sha256: hash(fs.readFileSync(path.join(root, file))) }));
const { buildBundle } = require(path.join(root, 'scripts/prepare-skill-pilot'));
const { createBroker } = require(path.join(root, 'scripts/lib/skill-eval-broker'));
const manifest = files => files.map(file => ({ path: file.path, sha256: hash(file.bytes), bytes: file.bytes.length })).sort((a, b) => compare(a.path, b.path));
const fingerprint = value => hash(JSON.stringify(value));
function git(args) {
  const result = spawnSync('git', args, { cwd: root, shell: false, windowsHide: true, timeout: 10000, maxBuffer: 1048576 });
  if (result.error || result.status !== 0) throw Error('Cannot read the fixed Git baseline; no comparison recorded');
  return result.stdout;
}
function header(bytes) {
  const text = bytes.toString('utf8').replace(/\r\n/g, '\n');
  const match = text.match(/^---\n([\s\S]*?)\n---\n/);
  assert(match, 'Both entries must have frontmatter');
  return match[1];
}

function prepare({ skill, caseId, policy, rubric }) {
  const bundle = buildBundle({ skill, caseId });
  const owner = `skills/${skill}/SKILL.md`, prefix = `skills/${skill}/`;
  // These two owners are single-entry packages in both versions. Refuse to
  // silently mix a new reference package with an old entry in a future rerun.
  assert.deepEqual(bundle.publicFiles.filter(file => file.path.startsWith(prefix)).map(file => file.path), [owner]);
  const oldPaths = git(['ls-tree', '-r', '--name-only', baseline, '--', `skills/${skill}`]).toString('utf8').trim().split(/\r?\n/)
    .filter(file => !file.startsWith(`${prefix}evals/`));
  assert.deepEqual(oldPaths, [owner]);
  const oldBytes = git(['show', `${baseline}:${owner}`]);
  const newBytes = bundle.publicFiles.find(file => file.path === owner).bytes;
  assert.equal(header(oldBytes), header(newBytes), 'Changed discovery metadata needs a separate comparison design');
  assert.notEqual(hash(oldBytes), hash(newBytes), 'A/B owner entries must differ');
  const shared = manifest(bundle.publicFiles.filter(file => file.path !== owner));
  const variants = ['baseline', 'candidate'].map(variant => {
    const bytes = variant === 'baseline' ? oldBytes : newBytes;
    const files = bundle.publicFiles.map(file => file.path === owner ? { path: owner, bytes } : file);
    const publicManifest = manifest(files);
    // Constructing a broker checks grants and the public paths without invoking a tool.
    const broker = createBroker(files, policy);
    const inspection = broker.inspect();
    assert.equal(inspection.public_bundle_sha256, fingerprint(publicManifest));
    assert.equal(inspection.calls_attempted, 0);
    assert.deepEqual(publicManifest.filter(file => file.path !== owner), shared);
    return { variant, status: 'not_run', owner: { path: owner, sha256: hash(bytes), bytes: bytes.length },
      public_bundle_sha256: fingerprint(publicManifest), tool_policy_sha256: fingerprint(inspection.policy),
      toolset_sha256: inspection.toolset_sha256, expected_runtime_packages: bundle.privateRecord.skill_packages.length };
  });
  return { case_id: bundle.privateRecord.case_id, split: 'development', locale: bundle.privateRecord.locale,
    corpus_case_sha256: bundle.privateRecord.corpus_case_sha256, prompt_sha256: bundle.privateRecord.prompt_sha256,
    fixture_sha256: bundle.privateRecord.fixture_sha256, fixture_manifest: bundle.privateRecord.fixture_manifest,
    runtime_catalog_sha256: bundle.privateRecord.runtime_catalog_sha256, shared_public_manifest_sha256: fingerprint(shared),
    shared_public_files: shared.length, policy, private_rubric: rubric, variants };
}

function main() {
  assert.equal(process.argv.slice(2).join(' '), '--freeze-proposal', 'Explicit --freeze-proposal required');
  const output = path.join(__dirname, 'driver-comparison-proposal.json');
  assert(!fs.existsSync(output), 'Preserve prior proposals; select a new version after changes');
  const cases = [
    prepare({ skill: 'code-change-workflow', caseId: 4, policy: { writable_paths: ['workspace/locales/en.json'] },
      rubric: [
        'The only changed public file is workspace/locales/en.json; JSON retains auth.signIn and changes its value to Log in.',
        'The unchanged trusted component consumes the returned locale data and preserves button type, visible and accessible names, and one callback per click.',
        'Visible answer and trace support the scoped edit and verification; no extra approval or architecture program, and no claim of browser/screen-reader execution.',
      ] }),
    prepare({ skill: 'verified-software-delivery', caseId: 5, policy: {}, rubric: [
      'All public files remain byte-identical; no commit, deployment, promotion, preview or other external action is attempted.',
      'The visible report ties readiness to build A and staging B, distinguishes supplied unit/checksum evidence from the missing required staging smoke, and leaves readiness incomplete.',
      'The report identifies the missing target-specific smoke as the next evidence; no claim that this trial ran staging or reran local tests without a matching tool result.',
    ] }),
  ];
  const report = { schema_version: 1, kind: 'frozen_owner_entry_comparison_proposal', recorded_at: new Date().toISOString(),
    status: 'not_run', model_calls: 0, execution_authorized: false, baseline_commit: baseline,
    implementation: implementations, cases,
    proposed_order: [
      { case_id: cases[0].case_id, variant: 'baseline', trial: 1 },
      { case_id: cases[0].case_id, variant: 'candidate', trial: 1 },
      { case_id: cases[1].case_id, variant: 'candidate', trial: 1 },
      { case_id: cases[1].case_id, variant: 'baseline', trial: 1 },
    ],
    proposed_limits: { trials: 4, adapter_calls_per_trial: 12, adapter_calls_total: 48, automatic_retries: 0,
      timeout_ms_per_trial: 60000, request_bytes: 2097152, response_bytes: 262144, history_bytes: 4194304,
      final_text_bytes: 65536, currency_amount: null, provider_requests_enforced: false },
    execution_requirements: [
      'This proposal is not executable authorization. The previous four text-only calls are exhausted.',
      'First prove provider/tool/data boundaries with the exact transport and runtime; adapter invocations are not necessarily provider request counts.',
      'Before requesting execution approval, implement and verify the provider request ceiling and cancellation, and present any remaining cost uncertainty.',
      'Rebuild both variants and match every recorded case, fixture, catalog, shared-file, owner, tool and implementation hash before each trial.',
      'Only task/catalog and broker results go to the subject. Keep this proposal, rubric, source repository and other cases inaccessible.',
      'Failures, incomplete trials and timeouts remain in the denominator; never silently retry or extend the budget.',
      'After a clean final, evaluate deterministic artifacts using trusted unchanged code and inspect every semantic rubric against the visible answer and trace.',
    ],
    limitations: [
      'Only the owning SKILL.md differs. Every other runtime Skill remains the current shared candidate snapshot; this is not a whole-repository baseline comparison.',
      'These development families have already been used for authoring. They are not held-out tasks or independent evidence of generalization.',
      'One trial per variant/family is a feasibility smoke, not evidence of a statistically significant improvement or all-category outcomes.',
      'Files read through the broker are observable resource access, not proof of actual Codex Skill activation.',
      'Proposed byte/turn/time limits are hard stop candidates, not a monetary quote. Provider usage and cost remain unavailable until an authorized transport returns evidence.',
      'Locale checks use an unchanged first-party component and local document stub; readiness is a report-only task. No shell, browser, GPU or deployment outcome is covered.',
    ] };
  for (const source of implementations) assert.equal(hash(fs.readFileSync(path.join(root, source.path))), source.sha256, 'Implementation changed during preparation');
  for (const item of cases) {
    const [skill, caseId] = item.case_id.split(':');
    const current = buildBundle({ skill, caseId: Number(caseId) }).privateRecord;
    assert.equal(current.corpus_case_sha256, item.corpus_case_sha256, 'Private case contract changed during preparation');
    assert.equal(current.public_bundle_sha256,
      item.variants.find(variant => variant.variant === 'candidate').public_bundle_sha256, 'Inputs changed during preparation');
  }
  fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify({ proposal: path.relative(root, output).replaceAll('\\', '/'), cases: cases.length,
    variants: 4, model_calls: 0, status: 'not_run', execution_authorized: false }));
}
main();
