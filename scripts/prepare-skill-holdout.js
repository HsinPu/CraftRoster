#!/usr/bin/env node
'use strict';

// Offline registration and packaging. This module never executes a model or grades its work.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { buildBundle, writeBundle, safeRead } = require('./prepare-skill-pilot');
const ROOT = path.resolve(__dirname, '..');
const DATASET = 'docs/audits/skill-optimization-2026-09-16/prospective-holdout-v1';
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const json = (root, file) => JSON.parse(safeRead(root, file).toString('utf8').replace(/^\uFEFF/, ''));
const compare = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const fingerprint = value => hash(value.normalize('NFC').trim().replace(/\s+/g, ' '));
const fail = message => { throw new Error(message); };
const id = value => typeof value === 'string' && /^[a-z0-9][a-z0-9:/._-]*$/.test(value);

function optionsFor(options = {}) {
  const root = fs.realpathSync(options.root || ROOT);
  return { ...options, root, datasetRoot: fs.realpathSync(options.datasetRoot || path.join(root, DATASET)),
    sourceRoot: fs.realpathSync(options.sourceRoot || root), variant: options.variant || 'candidate' };
}

function sourceEntry(root, relative) {
  const bytes = safeRead(root, relative);
  return { path: relative, sha256: hash(bytes), bytes: bytes.length };
}

function caseEntry(root, skill, item, split, family, lineage) {
  if (!Number.isSafeInteger(item.id) || item.id < 1 || typeof item.prompt !== 'string' || !item.prompt.trim()) fail('Invalid corpus case');
  const files = item.files || [];
  if (!Array.isArray(files)) fail('Invalid fixture file list');
  const fixtures = files.map(file => sourceEntry(root, `skills/${skill}/${file}`)).sort((a, b) => compare(a.path, b.path));
  return { case_id: `${skill}:${item.id}`, split, family_id: family, fixture_lineage_id: lineage,
    corpus_case_sha256: hash(JSON.stringify(item)), prompt_fingerprint: fingerprint(item.prompt),
    // Ignore names to detect a whole copied fixture even when its files have been renamed.
    fixture_content_fingerprint: fixtures.length ? hash(JSON.stringify(fixtures.map(file => file.sha256).sort())) : null,
    fixture_manifest: fixtures };
}

function developmentInventory(root) {
  const catalog = json(root, 'skills.json');
  const cases = [];
  const sources = [sourceEntry(root, 'skills.json')];
  for (const skill of catalog.skills.slice().sort((a, b) => compare(a.name, b.name))) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(skill.name)) fail('Invalid development Skill name');
    const corpusPath = `skills/${skill.name}/evals/evals.json`;
    if (!fs.existsSync(path.join(root, corpusPath))) continue;
    const corpus = json(root, corpusPath);
    if (corpus.skill_name !== skill.name || !Array.isArray(corpus.evals)) fail('Invalid development corpus');
    sources.push(sourceEntry(root, corpusPath));
    for (const item of corpus.evals) {
      // Retrospective labels are only an index. They do not prove semantic independence.
      const fixtureFamily = item.fixture_root?.replace(/^evals\/fixtures\/?/, '').split('/')[0];
      const family = `development/${skill.name}/${fixtureFamily || `inline-${item.id}`}`;
      cases.push(caseEntry(root, skill.name, item, 'development', family, family));
    }
  }
  if (new Set(cases.map(item => item.case_id)).size !== cases.length) fail('Duplicate development case ID');
  return { sources, cases };
}

function validateSplits(development, heldout) {
  for (const field of ['family_id', 'fixture_lineage_id', 'prompt_fingerprint', 'fixture_content_fingerprint']) {
    const prior = new Set(development.map(item => item[field]).filter(Boolean));
    for (const item of heldout) if (item[field] && prior.has(item[field])) fail(`Cross-split overlap: ${field} (${item.case_id})`);
  }
  const lineageFamilies = new Map(), fixtureFamilies = new Map(), prompts = new Set();
  for (const item of heldout) {
    const previous = lineageFamilies.get(item.fixture_lineage_id);
    if (previous && previous !== item.family_id) fail('One fixture lineage cannot be registered as independent families');
    lineageFamilies.set(item.fixture_lineage_id, item.family_id);
    const fixtureFamily = fixtureFamilies.get(item.fixture_content_fingerprint);
    if (item.fixture_content_fingerprint && fixtureFamily && fixtureFamily !== item.family_id) fail('Copied fixtures cannot count as independent holdout families');
    if (item.fixture_content_fingerprint) fixtureFamilies.set(item.fixture_content_fingerprint, item.family_id);
    if (prompts.has(item.prompt_fingerprint)) fail('Duplicate holdout prompt');
    prompts.add(item.prompt_fingerprint);
  }
}

function runtimeManifest(bundle) {
  return bundle.publicFiles.filter(file => file.path === 'skill-catalog.json' || file.path.startsWith('skills/'))
    .map(file => ({ path: file.path, sha256: hash(file.bytes), bytes: file.bytes.length }));
}

function inspectDataset(input = {}) {
  const options = optionsFor(input);
  const { root, datasetRoot } = options;
  const snapshot = json(datasetRoot, 'runtime-snapshots.json');
  const authoring = json(datasetRoot, 'authoring.json');
  if (snapshot.schema_version !== 1 || authoring.schema_version !== 1 || snapshot.dataset_id !== authoring.dataset_id
    || snapshot.dataset_id !== 'prospective-holdout-v1' || snapshot.comparison_scope !== 'full_runtime_snapshots') fail('Invalid dataset identity or comparison scope');
  if (authoring.runtime_snapshot_sha256 !== hash(safeRead(datasetRoot, 'runtime-snapshots.json'))) fail('Authoring is not bound to the frozen runtime');
  const frozenAt = Date.parse(snapshot.created_at_utc), authoredAt = Date.parse(authoring.authoring_started_at_utc);
  if (!Number.isFinite(frozenAt) || !Number.isFinite(authoredAt) || authoredAt < frozenAt) fail('Runtime must be frozen before prospective authoring');
  if (authoring.exposure?.runtime_instructions_read !== false || authoring.exposure?.development_cases_read !== true
    || authoring.exposure?.used_for_skill_tuning !== false || authoring.exposure?.evaluation_runs !== 0) fail('Holdout exposure or tuning status invalidates this unused registration');
  if (snapshot.preparer?.path !== 'scripts/prepare-skill-pilot.js'
    || snapshot.preparer.sha256 !== hash(safeRead(root, snapshot.preparer.path))) fail('Frozen preparer source drift');
  for (const variant of ['baseline', 'candidate']) {
    const value = snapshot.variants?.[variant];
    if (!value || !/^[0-9a-f]{40}$/.test(value.commit) || !Array.isArray(value.runtime_manifest) || !value.runtime_manifest.length
      || hash(JSON.stringify(value.runtime_manifest)) !== value.runtime_sha256) fail(`Invalid frozen runtime manifest: ${variant}`);
  }
  const development = developmentInventory(root);
  const developmentIds = new Set(development.cases.map(item => item.case_id));
  if (!Array.isArray(authoring.families) || !authoring.families.length) fail('No registered holdout families');
  const families = new Set(), heldout = [], corpusCache = new Map(), sourcePaths = new Set(['authoring.json', 'runtime-snapshots.json']);
  for (const family of authoring.families) {
    if (!id(family.family_id) || !id(family.fixture_lineage_id) || families.has(family.family_id)
      || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(family.owner_skill || '') || !family.novelty_rationale?.trim()) fail('Invalid or duplicate holdout family');
    families.add(family.family_id);
    if (!Array.isArray(family.closest_development_cases) || !family.closest_development_cases.length
      || family.closest_development_cases.some(value => !developmentIds.has(value))) fail('Novelty review must identify real development cases');
    if (!Array.isArray(family.cases) || !family.cases.some(item => item.kind === 'normal')
      || !family.cases.some(item => item.kind === 'boundary')) fail('Each family needs a normal case and a boundary case');
    const corpusPath = `skills/${family.owner_skill}/evals/evals.json`;
    if (!corpusCache.has(corpusPath)) corpusCache.set(corpusPath, json(datasetRoot, corpusPath));
    const corpus = corpusCache.get(corpusPath);
    if (corpus.skill_name !== family.owner_skill || !Array.isArray(corpus.evals)) fail('Invalid holdout corpus');
    sourcePaths.add(corpusPath);
    for (const reference of family.cases) {
      if (!['normal', 'boundary'].includes(reference.kind)) fail('Invalid holdout case kind');
      const matches = corpus.evals.filter(item => `${family.owner_skill}:${item.id}` === reference.case_id);
      if (matches.length !== 1) fail('Holdout case must exist exactly once');
      const item = matches[0];
      for (const [key, value] of [['family_id', family.family_id], ['fixture_lineage_id', family.fixture_lineage_id], ['kind', reference.kind]]) {
        if (item[key] !== undefined && item[key] !== value) fail(`Corpus and family registration disagree: ${key}`);
      }
      if (typeof item.expected_output !== 'string' || !item.expected_output.trim() || !Array.isArray(item.assertions)
        || !item.assertions.length || item.assertions.some(value => typeof value !== 'string' || !value.trim())
        || !Array.isArray(item.files) || !item.files.length) fail('Holdout needs raw fixtures and a private rubric');
      const entry = caseEntry(datasetRoot, family.owner_skill, item, 'prospective_holdout', family.family_id, family.fixture_lineage_id);
      entry.kind = reference.kind;
      entry.fixture_manifest.forEach(file => sourcePaths.add(file.path));
      heldout.push(entry);
    }
  }
  if (new Set(heldout.map(item => item.case_id)).size !== heldout.length) fail('Duplicate holdout case ID');
  for (const entry of fs.readdirSync(path.join(datasetRoot, 'skills'), { withFileTypes: true })) {
    const corpusPath = `skills/${entry.name}/evals/evals.json`;
    if (fs.existsSync(path.join(datasetRoot, corpusPath)) && !corpusCache.has(corpusPath)) fail('Unregistered holdout corpus');
  }
  if ([...corpusCache.values()].reduce((sum, corpus) => sum + corpus.evals.length, 0) !== heldout.length) fail('Unregistered holdout case');
  validateSplits(development.cases, heldout);
  const registration = { schema_version: 1, dataset_id: snapshot.dataset_id, split: 'prospective_holdout',
    status: 'not_run', execution_authorized: false, comparison_scope: snapshot.comparison_scope,
    registration_tool: { path: 'scripts/prepare-skill-holdout.js', sha256: hash(fs.readFileSync(__filename)) },
    dataset_sources: [...sourcePaths].sort().map(file => sourceEntry(datasetRoot, file)),
    development_sources: development.sources, development_cases: development.cases, holdout_cases: heldout,
    hard_gates: { new_scope_violations: 0, false_success_claims: 0, include_all_attempts_in_denominator: true },
    formal_acceptance: { status: 'insufficient_evidence', baseline_calibration: null, numeric_thresholds: null,
      manual_outcomes: null, observed_activation: null, effective_usage: null },
    limitations: [
      'Prospective only for the frozen candidate; initial rewrites already used development data.',
      'Development fixture-root labels and exact-content fingerprints cannot prove semantic independence. Author and reviewer declarations remain necessary.',
      'Registration hashes detect drift relative to this record; Git review preserves the record. They cannot certify secrecy or prevent a malicious author from replacing it.',
      'Public repository data is not secret. Future execution must exclude the repository, sibling cases and private rubric from the evaluated agent.',
      'Preparation is not execution authorization, a host capability check, manual grading, or formal effectiveness acceptance.',
    ] };
  return { options, snapshot, authoring, registration, corpora: [...corpusCache.values()] };
}

function assertPublicIsolation(bundle, corpora) {
  const contents = bundle.publicFiles.map(file => file.bytes.toString('utf8')).join('\n');
  for (const corpus of corpora) for (const item of corpus.evals) {
    if ([item.expected_output, ...item.assertions].some(value => contents.includes(value))) fail('Private rubric leaked into public bundle');
    if (`${corpus.skill_name}:${item.id}` !== bundle.privateRecord.case_id && contents.includes(item.prompt)) fail('Sibling holdout prompt leaked into public bundle');
  }
  if (bundle.publicFiles.some(file => file.path.split('/').some(part => ['evals', 'private', '.git', '.agents', '.codex'].includes(part.toLowerCase())))) fail('Private or evaluator path leaked into public bundle');
}

function prepareInspected(inspected, caseId) {
  const { options, snapshot, registration, corpora } = inspected;
  const selected = registration.holdout_cases.find(item => item.case_id === caseId);
  if (!selected) fail('Case is not registered in this holdout');
  const [skill, number] = selected.case_id.split(':');
  if (!['baseline', 'candidate'].includes(options.variant)) fail('Variant must be baseline or candidate');
  const bundle = buildBundle({ root: options.datasetRoot, sourceRoot: options.sourceRoot, skill, caseId: Number(number) });
  const manifest = runtimeManifest(bundle);
  const expected = snapshot.variants[options.variant];
  if (hash(JSON.stringify(manifest)) !== expected.runtime_sha256
    || JSON.stringify(manifest) !== JSON.stringify(expected.runtime_manifest)) fail(`Frozen ${options.variant} runtime source drift`);
  assertPublicIsolation(bundle, corpora);
  Object.assign(bundle.privateRecord, { split: 'prospective_holdout', dataset_id: registration.dataset_id,
    family_id: selected.family_id, fixture_lineage_id: selected.fixture_lineage_id, kind: selected.kind,
    variant: options.variant, runtime_commit: expected.commit, comparison_scope: registration.comparison_scope,
    registration_sha256: hash(JSON.stringify(registration)), execution_authorized: false,
    formal_acceptance: structuredClone(registration.formal_acceptance) });
  bundle.privateRecord.limitations = bundle.privateRecord.limitations.filter(value => !value.startsWith('All current cases are development data;'));
  bundle.privateRecord.limitations.push(...registration.limitations);
  return bundle;
}

function registerDataset(input = {}) {
  const inspected = inspectDataset(input);
  const file = path.join(inspected.options.datasetRoot, 'registration.json');
  if (fs.existsSync(file)) fail('Registration already exists; do not overwrite a frozen split');
  for (const item of inspected.registration.holdout_cases) prepareInspected(inspected, item.case_id);
  fs.writeFileSync(file, JSON.stringify(inspected.registration, null, 2) + '\n', { flag: 'wx' });
  return inspected.registration;
}

function validateDataset(input = {}) {
  const inspected = inspectDataset(input);
  const recorded = json(inspected.options.datasetRoot, 'registration.json');
  if (JSON.stringify(recorded) !== JSON.stringify(inspected.registration)) fail('Registration source or contract drift; preserve the old record and version a new dataset');
  for (const item of recorded.holdout_cases) prepareInspected(inspected, item.case_id);
  return inspected.registration;
}

function buildHoldoutBundle(input) {
  validateDataset(input);
  return prepareInspected(inspectDataset(input), input.caseId);
}

function parseArgs(argv) {
  const options = {}, seen = new Set();
  for (let index = 0; index < argv.length; index++) {
    const flag = argv[index];
    if (seen.has(flag)) fail(`Duplicate option: ${flag}`);
    seen.add(flag);
    if (['--check', '--register', '--prepare'].includes(flag)) {
      if (options.action) fail('Choose one offline action');
      options.action = flag.slice(2); continue;
    }
    const mapping = { '--root': 'root', '--dataset-root': 'datasetRoot', '--source-root': 'sourceRoot', '--variant': 'variant', '--case': 'caseId', '--output': 'output' };
    if (!mapping[flag]) fail(`Unknown option: ${flag}`);
    const value = argv[++index];
    if (!value || value.startsWith('--')) fail(`Missing value: ${flag}`);
    options[mapping[flag]] = value;
  }
  if (!options.action || (options.action === 'prepare' && (!options.caseId || !options.output))
    || (options.action !== 'prepare' && (options.caseId || options.output))) fail('Use --check, --register, or --prepare --case <skill:id> --output <new-directory>');
  return options;
}

if (require.main === module) {
  try {
    const options = parseArgs(process.argv.slice(2));
    if (options.action === 'prepare') {
      const bundle = buildHoldoutBundle(options);
      writeBundle(bundle, options.output);
      console.log(`Prepared ${options.caseId}; prospective_holdout; model status not_run.`);
    } else {
      const result = options.action === 'register' ? registerDataset(options) : validateDataset(options);
      console.log(`Holdout ${options.action}: ${result.holdout_cases.length} cases, ${new Set(result.holdout_cases.map(item => item.family_id)).size} families; ${result.development_cases.length} development cases; model status not_run.`);
    }
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { registerDataset, validateDataset, buildHoldoutBundle, inspectDataset, validateSplits, runtimeManifest, parseArgs };
