'use strict';
// Offline author probe only: no model, network, subprocess, or live GitHub access.
const fs = require('fs');
const path = require('path');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const root = path.resolve(__dirname, '../../..');
const { buildBundle } = require(path.join(root, 'scripts/prepare-skill-pilot'));
const { createBroker } = require(path.join(root, 'scripts/lib/skill-eval-broker'));
const { createReviewSnapshot } = require(path.join(root, 'scripts/lib/skill-review-snapshot'));
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const output = path.resolve(process.argv[2] || path.join(__dirname, 'review-preparation-check.json'));
if (process.argv.length > 3 || fs.existsSync(output)) throw new Error('Provide one new output file; do not overwrite prior evidence');
const cases = [1, 2, 7, 14].map(caseId => {
  const bundle = buildBundle({ root, skill: 'code-review', caseId });
  const broker = createBroker(bundle.publicFiles);
  const before = broker.inspect();
  assert.equal(before.public_bundle_sha256, bundle.privateRecord.public_bundle_sha256);
  const prepared = {
    case_id: bundle.privateRecord.case_id, status: 'not_run', split: 'development',
    corpus_case_sha256: bundle.privateRecord.corpus_case_sha256, fixture_sha256: bundle.privateRecord.fixture_sha256,
    public_bundle_sha256: before.public_bundle_sha256, fixture_files: bundle.privateRecord.fixture_manifest.length,
    skill_packages: bundle.privateRecord.skill_packages.length, assertions_executed: 0,
    model_calls: 0, host_isolation_enforced: false, preparation_check: 'passed',
  };
  if ([1, 2].includes(caseId)) {
    const evidence = bundle.publicFiles.find(file => file.path === 'workspace/evidence/author-verification.json');
    assert(evidence);
    const receipt = JSON.parse(evidence.bytes.toString('utf8'));
    assert.equal(receipt.fixtureOnly, true);
    prepared.author_git_receipt = { sha256: hash(evidence.bytes), observations: receipt.observations,
      base_test_count: receipt.tests.base.length, final_test_count: receipt.tests.final.length,
      limitation: 'Saved author receipt only. This preparation does not materialize the Git recipe or execute the reviewed code.' };
  } else {
    const response = broker.call(JSON.stringify({ tool: 'read_file', arguments: { path: 'workspace/github-snapshot.json' } }));
    assert.equal(response.ok, true);
    const service = createReviewSnapshot(JSON.parse(response.content));
    const { repository, number, head_sha, base_sha } = service.inspect().baseline;
    const request = (operation, extra = {}) => service.call(JSON.stringify({ operation, repository, number, head_sha, ...extra }));
    for (const operation of ['get_pr', 'get_commits', 'get_comments', 'get_checks', 'get_changed_files', 'get_review_history']) assert.equal(request(operation).ok, true);
    assert.equal(request('get_file', { ref: head_sha, path: 'src/items.js' }).ok, true);
    assert.equal(request('post_comment').reason, 'operation_not_allowed');
    assert.equal(request('get_pr', { head_sha: base_sha }).reason, 'baseline_mismatch');
    assert.equal(request('get_file', { ref: 'HEAD', path: 'src/items.js' }).reason, 'invalid_ref_or_path');
    prepared.scripted_service_probe = { status: 'passed', ...service.inspect(),
      semantic_review: 'unverified', finding_dispositions_graded: false };
  }
  assert.deepEqual(broker.inspect().final_manifest, before.initial_manifest);
  prepared.workspace_unchanged = true;
  return prepared;
});
const report = {
  schema_version: 1, kind: 'offline_review_fixture_preparation', created_at: new Date().toISOString(),
  node: process.version, platform: process.platform, status: 'not_run', model_calls: 0,
  implementation_hashes: Object.fromEntries([
    'scripts/prepare-skill-pilot.js', 'scripts/lib/skill-eval-broker.js', 'scripts/lib/skill-review-snapshot.js',
    'tests/skill-review-local-fixtures.test.js', 'tests/skill-review-pr-fixtures.test.js',
    'docs/audits/skill-optimization-2026-09-16/run-review-preparation-check.cjs',
  ].map(file => [file, hash(fs.readFileSync(path.join(root, file)))])), cases,
  limitations: [
    'These are repository-authored preparation and tool-boundary checks, not model reviews.',
    'Actual Git and contract-test observations are separately reproduced by the author-fixture test suites.',
    'The Git recipe still requires trusted isolated setup before any evaluated working-tree review.',
    'No semantic review grader, effective model, activation, cost, or host isolation is certified.',
  ],
};
fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
console.log(`Prepared four code-review cases; model calls 0, task status not_run; ${output}`);
