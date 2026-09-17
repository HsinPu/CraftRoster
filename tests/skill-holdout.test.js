'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const assert = require('assert');
const { buildBundle, writeBundle } = require('../scripts/prepare-skill-pilot');
const { registerDataset, validateDataset, buildHoldoutBundle, inspectDataset, validateSplits, runtimeManifest, parseArgs } = require('../scripts/prepare-skill-holdout');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'craftroster-holdout-test-'));
const root = path.join(temp, 'repo'), datasetRoot = path.join(temp, 'holdout'), baseline = path.join(temp, 'baseline');
const options = { root, datasetRoot };
let passed = 0;
function check(name, fn) { fn(); passed++; console.log(`PASS ${name}`); }
function write(base, relative, value) {
  const file = path.join(base, relative);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, typeof value === 'string' ? value : JSON.stringify(value, null, 2) + '\n');
}
function change(base, relative, transform, fn) {
  const file = path.join(base, relative), original = fs.readFileSync(file);
  try { fs.writeFileSync(file, transform(original)); fn(); } finally { fs.writeFileSync(file, original); }
}
function mutateJson(base, relative, transform, fn) {
  change(base, relative, bytes => { const value = JSON.parse(bytes); transform(value); return JSON.stringify(value); }, fn);
}
const corpusPath = 'skills/alpha/evals/evals.json';
const item = (number, name, prompt, input) => ({ id: number, prompt, expected_output: `PRIVATE-ORACLE-${name}`,
  assertions: [`PRIVATE-RUBRIC-${name}`], fixture_root: `evals/fixtures/${name}`, files: [`evals/fixtures/${name}/input.txt`] });
try {
  const catalog = { skills: [{ name: 'alpha', description: 'Alpha task capability.' }] };
  for (const base of [root, baseline]) {
    write(base, 'skills.json', catalog);
    write(base, 'skills/alpha/SKILL.md', base === baseline ? 'Baseline runtime instructions.' : 'Frozen candidate runtime instructions.');
  }
  write(root, 'scripts/prepare-skill-pilot.js', 'Synthetic preparer fingerprint; tests use the real module.');
  write(root, corpusPath, { skill_name: 'alpha', evals: [item(1, 'old', 'An old development task.')] });
  write(root, 'skills/alpha/evals/fixtures/old/input.txt', 'OLD DEVELOPMENT INPUT');
  write(datasetRoot, corpusPath, { skill_name: 'alpha', evals: [item(10, 'normal', 'Complete the new normal task.'), item(11, 'boundary', 'Inspect the new boundary task.')] });
  write(datasetRoot, 'skills/alpha/evals/fixtures/normal/input.txt', 'NOVEL NORMAL INPUT');
  write(datasetRoot, 'skills/alpha/evals/fixtures/boundary/input.txt', 'NOVEL BOUNDARY INPUT');
  const snapshot = { schema_version: 1, dataset_id: 'prospective-holdout-v1', created_at_utc: '2026-09-17T00:00:00Z',
    comparison_scope: 'full_runtime_snapshots', preparer: { path: 'scripts/prepare-skill-pilot.js', sha256: hash(fs.readFileSync(path.join(root, 'scripts/prepare-skill-pilot.js'))) }, variants: {} };
  for (const [variant, sourceRoot] of [['baseline', baseline], ['candidate', root]]) {
    const manifest = runtimeManifest(buildBundle({ root, sourceRoot, skill: 'alpha', caseId: 1 }));
    snapshot.variants[variant] = { commit: variant === 'baseline' ? 'a'.repeat(40) : 'b'.repeat(40), runtime_sha256: hash(JSON.stringify(manifest)), runtime_manifest: manifest };
  }
  write(datasetRoot, 'runtime-snapshots.json', snapshot);
  write(datasetRoot, 'authoring.json', { schema_version: 1, dataset_id: snapshot.dataset_id,
    authoring_started_at_utc: '2026-09-17T00:01:00Z', author_role: 'synthetic-test-author',
    runtime_snapshot_sha256: hash(fs.readFileSync(path.join(datasetRoot, 'runtime-snapshots.json'))),
    exposure: { runtime_instructions_read: false, development_cases_read: true, used_for_skill_tuning: false, evaluation_runs: 0 },
    families: [{ family_id: 'new-family', fixture_lineage_id: 'new-lineage', owner_skill: 'alpha',
      novelty_rationale: 'This synthetic family differs from the old development input.', closest_development_cases: ['alpha:1'],
      cases: [{ case_id: 'alpha:10', kind: 'normal' }, { case_id: 'alpha:11', kind: 'boundary' }] }] });

  check('registers a prospective split with a complete denominator and no model results', () => {
    const record = registerDataset(options);
    assert.strictEqual(record.development_cases.length, 1);
    assert.strictEqual(record.holdout_cases.length, 2);
    assert(record.holdout_cases.every(entry => entry.split === 'prospective_holdout'));
    assert(record.development_cases.every(entry => entry.split === 'development'));
    assert.strictEqual(record.status, 'not_run');
    assert.strictEqual(record.execution_authorized, false);
    assert.deepStrictEqual(record.formal_acceptance, { status: 'insufficient_evidence', baseline_calibration: null, numeric_thresholds: null, manual_outcomes: null, observed_activation: null, effective_usage: null });
    assert.strictEqual(validateDataset(options).holdout_cases.length, 2);
  });
  check('candidate and baseline package the same raw task against their own complete frozen runtime', () => {
    const candidate = buildHoldoutBundle({ ...options, caseId: 'alpha:10' });
    const old = buildHoldoutBundle({ ...options, sourceRoot: baseline, variant: 'baseline', caseId: 'alpha:10' });
    const taskFiles = bundle => bundle.publicFiles.filter(file => file.path === 'task.txt' || file.path.startsWith('workspace/'));
    assert.deepStrictEqual(taskFiles(candidate), taskFiles(old));
    assert.notDeepStrictEqual(runtimeManifest(candidate), runtimeManifest(old));
    assert.strictEqual(candidate.privateRecord.comparison_scope, 'full_runtime_snapshots');
    assert.strictEqual(candidate.privateRecord.family_id, 'new-family');
    assert.strictEqual(candidate.privateRecord.split, 'prospective_holdout');
    assert.strictEqual(old.privateRecord.variant, 'baseline');
  });
  check('writes only task, current fixture and runtime to public; rubric and sibling prompts stay private', () => {
    const bundle = buildHoldoutBundle({ ...options, caseId: 'alpha:10' });
    const output = path.join(temp, 'prepared');
    writeBundle(bundle, output);
    const text = bundle.publicFiles.map(file => file.bytes.toString()).join('\n');
    assert(!text.includes('PRIVATE-'));
    assert(!text.includes('Inspect the new boundary task.'));
    assert(fs.readFileSync(path.join(output, 'private/record.json'), 'utf8').includes('PRIVATE-ORACLE-normal'));
    assert(!fs.existsSync(path.join(output, 'public/registration.json')));
    assert(bundle.privateRecord.assertions.every(value => value.status === 'not_run' && value.evidence === null));
  });
  check('cannot replace a registered split or package an unregistered case', () => {
    assert.throws(() => registerDataset(options), /already exists/);
    assert.throws(() => buildHoldoutBundle({ ...options, caseId: 'alpha:1' }), /not registered/);
  });
  check('changed runtime bytes fail even when the commit label is unchanged', () => {
    change(root, 'skills/alpha/SKILL.md', () => 'Instructions tuned after seeing holdout.', () => {
      assert.throws(() => validateDataset(options), /runtime source drift/);
    });
    assert.throws(() => validateDataset({ ...options, sourceRoot: baseline }), /runtime source drift/);
  });
  check('changed packaging implementation fails its pre-authoring binding', () => {
    change(root, 'scripts/prepare-skill-pilot.js', () => 'Changed preparer', () => assert.throws(() => validateDataset(options), /preparer source drift/));
  });
  check('fixture and development source changes cannot silently preserve the registration', () => {
    for (const [base, file] of [[datasetRoot, 'skills/alpha/evals/fixtures/normal/input.txt'], [root, 'skills/alpha/evals/fixtures/old/input.txt']]) {
      change(base, file, bytes => Buffer.concat([bytes, Buffer.from(' changed')]), () => assert.throws(() => validateDataset(options), /Registration source or contract drift/));
    }
    mutateJson(root, corpusPath, value => value.evals.push(item(2, 'old', 'Another development task.')), () => assert.throws(() => validateDataset(options), /Registration source or contract drift/));
  });
  check('exact prompt copies remain development even after whitespace or ID changes', () => {
    mutateJson(datasetRoot, corpusPath, value => { value.evals[0].prompt = '  An old\n development   task. '; }, () => {
      assert.throws(() => inspectDataset(options), /Cross-split overlap: prompt_fingerprint/);
    });
  });
  check('renamed copies of an entire fixture are rejected across splits', () => {
    change(datasetRoot, 'skills/alpha/evals/fixtures/normal/input.txt', () => 'OLD DEVELOPMENT INPUT', () => {
      assert.throws(() => inspectDataset(options), /Cross-split overlap: fixture_content_fingerprint/);
    });
  });
  check('same family or fixture lineage cannot cross development and holdout', () => {
    const inspected = inspectDataset(options);
    for (const field of ['family_id', 'fixture_lineage_id']) {
      const heldout = structuredClone(inspected.registration.holdout_cases);
      heldout[0][field] = inspected.registration.development_cases[0][field];
      assert.throws(() => validateSplits(inspected.registration.development_cases, heldout), new RegExp(`Cross-split overlap: ${field}`));
    }
    const heldout = structuredClone(inspected.registration.holdout_cases);
    heldout[1].family_id = 'pretend-independent-family';
    assert.throws(() => validateSplits([], heldout), /lineage cannot be registered as independent/);
    heldout[1].fixture_lineage_id = 'renamed-lineage';
    heldout[1].fixture_content_fingerprint = heldout[0].fixture_content_fingerprint;
    assert.throws(() => validateSplits([], heldout), /Copied fixtures cannot count as independent/);
  });
  check('tuning exposure, runtime-instruction exposure or evaluation use invalidates unused status', () => {
    for (const [key, value] of [['used_for_skill_tuning', true], ['runtime_instructions_read', true], ['evaluation_runs', 1]]) {
      mutateJson(datasetRoot, 'authoring.json', document => { document.exposure[key] = value; }, () => assert.throws(() => inspectDataset(options), /exposure or tuning status/));
    }
  });
  check('post-authoring freezes and unbound author declarations are rejected', () => {
    mutateJson(datasetRoot, 'authoring.json', value => { value.authoring_started_at_utc = '2026-09-16T00:00:00Z'; }, () => assert.throws(() => inspectDataset(options), /before prospective authoring/));
    mutateJson(datasetRoot, 'authoring.json', value => { value.runtime_snapshot_sha256 = '0'.repeat(64); }, () => assert.throws(() => inspectDataset(options), /not bound/));
  });
  check('boundary coverage and concrete development comparison are required', () => {
    mutateJson(datasetRoot, 'authoring.json', value => { value.families[0].cases[1].kind = 'normal'; }, () => assert.throws(() => inspectDataset(options), /normal case and a boundary case/));
    mutateJson(datasetRoot, 'authoring.json', value => { value.families[0].closest_development_cases = ['alpha:999']; }, () => assert.throws(() => inspectDataset(options), /real development cases/));
  });
  check('duplicate and unregistered holdout cases cannot be dropped from the denominator', () => {
    mutateJson(datasetRoot, corpusPath, value => { value.evals.push(item(12, 'boundary', 'Unregistered case.')); }, () => assert.throws(() => inspectDataset(options), /Unregistered holdout case/));
    mutateJson(datasetRoot, 'authoring.json', value => { value.families[0].cases.push(value.families[0].cases[0]); }, () => assert.throws(() => inspectDataset(options), /Duplicate holdout case ID/));
    mutateJson(datasetRoot, corpusPath, value => { value.evals[1].prompt = value.evals[0].prompt; }, () => assert.throws(() => inspectDataset(options), /Duplicate holdout prompt/));
    mutateJson(datasetRoot, corpusPath, value => { value.evals[0].family_id = 'unrelated-family'; }, () => assert.throws(() => inspectDataset(options), /Corpus and family registration disagree/));
    write(datasetRoot, 'skills/hidden/evals/evals.json', { skill_name: 'hidden', evals: [] });
    try { assert.throws(() => inspectDataset(options), /Unregistered holdout corpus/); }
    finally { fs.unlinkSync(path.join(datasetRoot, 'skills/hidden/evals/evals.json')); }
  });
  check('rubric source drift does not alter public treatment but must invalidate the private registration', () => {
    const before = buildBundle({ root: datasetRoot, sourceRoot: root, skill: 'alpha', caseId: 10 });
    mutateJson(datasetRoot, corpusPath, value => { value.evals[0].expected_output = 'CHANGED PRIVATE RUBRIC'; }, () => {
      assert.throws(() => validateDataset(options), /Registration source or contract drift/);
      const after = buildBundle({ root: datasetRoot, sourceRoot: root, skill: 'alpha', caseId: 10 });
      assert.strictEqual(before.privateRecord.public_bundle_sha256, after.privateRecord.public_bundle_sha256);
    });
  });
  check('oracle and sibling prompt copies in a declared public fixture are rejected before registration', () => {
    const file = path.join(datasetRoot, 'registration.json'), record = fs.readFileSync(file);
    fs.unlinkSync(file);
    try {
      for (const leaked of ['PRIVATE-ORACLE-normal', 'PRIVATE-RUBRIC-boundary', 'Inspect the new boundary task.']) {
        change(datasetRoot, 'skills/alpha/evals/fixtures/normal/input.txt', () => leaked, () => assert.throws(() => registerDataset(options), /leaked into public bundle/));
      }
    } finally { fs.writeFileSync(file, record); }
  });
  check('a manually claimed pass cannot satisfy missing calibration, manual outcomes or usage', () => {
    mutateJson(datasetRoot, 'registration.json', value => { value.status = 'passed'; value.formal_acceptance.status = 'passed'; }, () => assert.throws(() => validateDataset(options), /contract drift/));
    mutateJson(datasetRoot, 'registration.json', value => { value.formal_acceptance.effective_usage = { input_tokens: 0 }; }, () => assert.throws(() => validateDataset(options), /contract drift/));
  });
  check('CLI has only explicit offline actions and rejects conflicting or incomplete options', () => {
    assert.throws(() => parseArgs(['--execute']), /Unknown/);
    assert.throws(() => parseArgs(['--check', '--register']), /Choose one/);
    assert.throws(() => parseArgs(['--check', '--check']), /Duplicate/);
    assert.throws(() => parseArgs(['--prepare', '--case', 'alpha:10']), /Use --check/);
    assert.throws(() => parseArgs(['--check', '--output', 'unused']), /Use --check/);
    assert.deepStrictEqual(parseArgs(['--check', '--variant', 'baseline']), { action: 'check', variant: 'baseline' });
  });
  console.log(`Skill holdout tests passed: ${passed}; synthetic fixtures only, no model calls.`);
} finally {
  const resolved = fs.realpathSync(temp);
  if (path.dirname(resolved) !== fs.realpathSync(os.tmpdir()) || !path.basename(resolved).startsWith('craftroster-holdout-test-')) throw new Error('Unexpected cleanup root');
  fs.rmSync(resolved, { recursive: true, force: true });
}
