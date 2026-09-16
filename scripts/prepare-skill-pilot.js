#!/usr/bin/env node
'use strict';

// Offline packaging only. The eventual host must enforce read/tool isolation separately.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const DEFAULT_ROOT = path.resolve(__dirname, '..');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const compare = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const within = (root, file) => {
  const relative = path.relative(root, file);
  return relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
};

function normalized(value, label) {
  if (typeof value !== 'string' || !value || /[\\\0:]/.test(value) || path.posix.isAbsolute(value)
    || value.split('/').some(part => !part || part === '.' || part === '..' || /[. ]$/.test(part)
      || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part))) throw new Error(`${label}: normalized relative path required`);
  return value;
}

function safeRead(root, relative) {
  normalized(relative, 'input');
  const base = fs.realpathSync(root);
  let cursor = base;
  for (const part of relative.split('/')) {
    cursor = path.join(cursor, part);
    if (fs.lstatSync(cursor).isSymbolicLink()) throw new Error(`Symbolic links are not permitted: ${relative}`);
  }
  if (!within(base, fs.realpathSync(cursor)) || !fs.statSync(cursor).isFile()) throw new Error(`Input is not a contained regular file: ${relative}`);
  return fs.readFileSync(cursor);
}

function readJson(root, relative) {
  return JSON.parse(safeRead(root, relative).toString('utf8').replace(/^\uFEFF/, ''));
}

function runtimeFiles(root, name) {
  const output = [];
  const packageRelative = `skills/${name}`;
  safeRead(root, `${packageRelative}/SKILL.md`);
  function visit(relative) {
    const absolute = path.join(root, ...relative.split('/'));
    for (const entry of fs.readdirSync(absolute, { withFileTypes: true }).sort((a, b) => compare(a.name, b.name))) {
      // A runtime package must never carry this or another case's oracle into the public bundle.
      if (['evals', '.git', 'node_modules'].includes(entry.name)) continue;
      const next = `${relative}/${entry.name}`;
      if (entry.isSymbolicLink()) throw new Error(`Symbolic links are not permitted: ${next}`);
      if (entry.isDirectory()) visit(next);
      else if (entry.isFile()) output.push({ path: next, bytes: safeRead(root, next) });
      else throw new Error(`Non-regular runtime input: ${next}`);
    }
  }
  visit(packageRelative);
  return output;
}

function buildBundle(options) {
  const root = fs.realpathSync(options.root || DEFAULT_ROOT);
  const sourceRoot = fs.realpathSync(options.sourceRoot || root);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(options.skill || '')) throw new Error('Invalid Skill name');
  if (!Number.isSafeInteger(options.caseId) || options.caseId < 1) throw new Error('Invalid output case ID');
  const corpus = readJson(root, `skills/${options.skill}/evals/evals.json`);
  const matching = corpus.evals?.filter(item => item.id === options.caseId);
  if (corpus.skill_name !== options.skill || matching?.length !== 1) throw new Error('Output case must exist exactly once');
  const evaluation = matching[0];
  if (typeof evaluation.prompt !== 'string' || !evaluation.prompt.trim() || typeof evaluation.expected_output !== 'string'
    || !Array.isArray(evaluation.assertions) || !evaluation.assertions.length
    || evaluation.assertions.some(value => typeof value !== 'string' || !value.trim())) throw new Error('Invalid output case contract');
  if (!Array.isArray(evaluation.files) || evaluation.files.length === 0) {
    if (!options.textOnly) throw new Error('No declared fixture; inspect readiness and explicitly choose --text-only for a self-contained text task');
  } else if (options.textOnly) throw new Error('--text-only cannot omit declared fixture files');

  const publicFiles = [{ path: 'task.txt', bytes: Buffer.from(evaluation.prompt + '\n') }];
  const fixtureManifest = [];
  if (evaluation.files?.length) {
    const fixtureRoot = normalized(evaluation.fixture_root, 'fixture_root');
    if (fixtureRoot !== 'evals/fixtures' && !fixtureRoot.startsWith('evals/fixtures/')) throw new Error('fixture_root must be inside evals/fixtures');
    const destinations = new Set();
    for (const file of evaluation.files) {
      normalized(file, 'fixture file');
      if (!file.startsWith(fixtureRoot + '/')) throw new Error('Fixture file must be below fixture_root');
      const destination = file.slice(fixtureRoot.length + 1);
      normalized(destination, 'fixture destination');
      // Avoid cross-platform aliases and accidental discovery of evaluator instructions.
      if (destinations.has(destination.toLowerCase())) throw new Error('Duplicate or case-colliding fixture destination');
      if (destination.split('/').some(part => ['evals', '.git', '.codex', '.agents'].includes(part.toLowerCase()))) throw new Error('Fixture contains evaluator/host-control directories');
      destinations.add(destination.toLowerCase());
      const bytes = safeRead(root, `skills/${options.skill}/${file}`);
      publicFiles.push({ path: `workspace/${destination}`, bytes });
      fixtureManifest.push({ path: destination, sha256: hash(bytes), bytes: bytes.length });
    }
  }

  const catalog = readJson(sourceRoot, 'skills.json');
  if (!Array.isArray(catalog.skills)) throw new Error('Missing source catalog');
  const names = new Set();
  const catalogSnapshot = [];
  const packages = [];
  for (const skill of catalog.skills.slice().sort((a, b) => compare(a.name, b.name))) {
    if (typeof skill.name !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(skill.name) || names.has(skill.name)
      || typeof skill.description !== 'string' || !skill.description.trim()) throw new Error('Invalid or duplicate source catalog entry');
    names.add(skill.name);
    catalogSnapshot.push({ name: skill.name, description: skill.description, path: `skills/${skill.name}/SKILL.md` });
    const files = runtimeFiles(sourceRoot, skill.name);
    const manifest = files.map(file => ({ path: file.path.slice(`skills/${skill.name}/`.length), sha256: hash(file.bytes), bytes: file.bytes.length }));
    packages.push({ name: skill.name, sha256: hash(JSON.stringify(manifest)), files: manifest });
    publicFiles.push(...files);
  }
  if (!names.has(options.skill)) throw new Error('Source snapshot lacks the owning Skill');
  publicFiles.push({ path: 'skill-catalog.json', bytes: Buffer.from(JSON.stringify({ skills: catalogSnapshot }, null, 2) + '\n') });
  publicFiles.sort((a, b) => compare(a.path, b.path));
  if (new Set(publicFiles.map(file => file.path.toLowerCase())).size !== publicFiles.length) throw new Error('Case-colliding public paths');
  const publicManifest = publicFiles.map(file => ({ path: file.path, sha256: hash(file.bytes), bytes: file.bytes.length }));
  const bundleHash = hash(JSON.stringify(publicManifest));
  return {
    publicFiles,
    privateRecord: {
      schema_version: 1, evaluation_kind: 'offline_output_task_preparation', status: 'not_run',
      case_id: `${options.skill}:${options.caseId}`, skill: options.skill, output_case_id: options.caseId,
      split: 'development', locale: evaluation.locale || 'unspecified',
      mode: options.textOnly ? 'text_only' : 'workspace_fixture',
      corpus_case_sha256: hash(JSON.stringify(evaluation)), prompt_sha256: hash(evaluation.prompt),
      fixture_sha256: hash(JSON.stringify(fixtureManifest)), fixture_manifest: fixtureManifest,
      runtime_catalog_sha256: hash(JSON.stringify(catalogSnapshot)), skill_packages: packages,
      public_bundle_sha256: bundleHash, public_manifest: publicManifest,
      expected_output: evaluation.expected_output,
      assertions: evaluation.assertions.map((text, index) => ({ id: `${options.skill}:${options.caseId}:${index + 1}`, text, status: 'not_run', evidence: null })),
      host: null, model_effective: null, reasoning_effort_effective: null, toolset_sha256: null,
      advertised_catalog_sha256: null, activation_observed: false, cost: null,
      execution_readiness: 'requires_host_isolation_and_grader',
      limitations: [
        'Offline preparation only; no model, tool driver, or semantic grader has run.',
        'All current cases are development data; translations are not independent held-out families.',
        'Public/private directory separation is not a security boundary. A host must deny public-agent access to private data and the source repository before execution.',
        'Runtime catalog is an intended snapshot, not proof of advertised or loaded Skills.',
        'Workspace snapshots do not grant external operations; any real-service capability must be replaced by a scoped stub.',
      ],
    },
  };
}

function writeBundle(bundle, output) {
  const target = path.resolve(output);
  if (fs.existsSync(target)) throw new Error('Output already exists; use a new directory');
  const parent = path.dirname(target);
  if (!fs.statSync(parent).isDirectory() || path.resolve(fs.realpathSync(parent)) !== parent) throw new Error('Output parent must be an existing real directory');
  fs.mkdirSync(target);
  fs.mkdirSync(path.join(target, 'public', 'workspace'), { recursive: true });
  fs.mkdirSync(path.join(target, 'private'));
  for (const file of bundle.publicFiles) {
    normalized(file.path, 'public output');
    const destination = path.join(target, 'public', ...file.path.split('/'));
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, file.bytes, { flag: 'wx' });
  }
  fs.writeFileSync(path.join(target, 'private', 'record.json'), JSON.stringify(bundle.privateRecord, null, 2) + '\n', { flag: 'wx' });
  return target;
}

function parseArgs(argv) {
  const options = { root: DEFAULT_ROOT, sourceRoot: null, textOnly: false };
  const seen = new Set();
  for (let index = 0; index < argv.length; index++) {
    const key = argv[index];
    if (seen.has(key)) throw new Error(`Duplicate option: ${key}`);
    seen.add(key);
    if (key === '--text-only') { options.textOnly = true; continue; }
    if (!['--root', '--source-root', '--skill', '--case', '--output'].includes(key)) throw new Error('Unknown option');
    const value = argv[++index];
    if (!value || value.startsWith('--')) throw new Error(`Missing value: ${key}`);
    if (key === '--root') options.root = path.resolve(value);
    if (key === '--source-root') options.sourceRoot = path.resolve(value);
    if (key === '--skill') options.skill = value;
    if (key === '--case') options.caseId = Number(value);
    if (key === '--output') options.output = path.resolve(value);
  }
  if (!options.output) throw new Error('Usage: node scripts/prepare-skill-pilot.js --skill <name> --case <number> --output <new-directory> [--text-only] [--root <corpus-repository>] [--source-root <runtime-snapshot>]');
  return options;
}

function main(argv) {
  const options = parseArgs(argv);
  if (fs.existsSync(options.output)) throw new Error('Output already exists; use a new directory');
  const bundle = buildBundle(options);
  const target = writeBundle(bundle, options.output);
  console.log(`Prepared ${bundle.privateRecord.case_id}: ${bundle.publicFiles.length} public files; status not_run; ${target}`);
}
if (require.main === module) {
  try { main(process.argv.slice(2)); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { buildBundle, writeBundle, parseArgs, safeRead };
