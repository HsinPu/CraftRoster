#!/usr/bin/env node
'use strict';

// An offline impact plan, not an execution command or authorization to run models.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { safeRead } = require('./prepare-skill-pilot');
const { validateDependencies } = require('./lib/skill-dependencies');
const { validateRoutingDocument } = require('./validate-skill-evals');
const DEFAULT_ROOT = path.resolve(__dirname, '..');
const CATALOG = 'scripts/data/skill-catalog.json';
const ALGORITHM = 'changed-direct-consumers-routing-neighbors-v2';
const NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const compare = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const nonempty = value => typeof value === 'string' && value.trim().length > 0;
const ordered = value => Array.isArray(value) ? value.map(ordered) : object(value)
  ? Object.fromEntries(Object.keys(value).sort(compare).map(key => [key, ordered(value[key])])) : value;
const fingerprint = value => hash(JSON.stringify(ordered(value)));

function relativePath(value) {
  if (typeof value !== 'string' || !value || /[\\\0:]/.test(value) || path.posix.isAbsolute(value)
    || value.split('/').some(part => !part || part === '.' || part === '..' || /[. ]$/.test(part)
      || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part))) {
    throw new Error(`Normalized relative path required: ${value}`);
  }
  return value;
}

function inspect(root, relative) {
  relativePath(relative);
  let cursor = root;
  for (const part of relative.split('/')) {
    cursor = path.join(cursor, part);
    let stat;
    try { stat = fs.lstatSync(cursor); } catch (error) { if (error.code === 'ENOENT') return null; throw error; }
    if (stat.isSymbolicLink()) throw new Error(`Symbolic links are not permitted: ${relative}`);
  }
  return fs.lstatSync(cursor);
}

function jsonInput(root, relative) {
  const bytes = safeRead(root, relative);
  let document;
  try { document = JSON.parse(bytes.toString('utf8').replace(/^\uFEFF/, '')); }
  catch { throw new Error(`Invalid JSON: ${relative}`); }
  return { document, path: relative, sha256: hash(bytes), bytes: bytes.length };
}

function validateCatalog(catalog) {
  if (!object(catalog) || !object(catalog.skills) || Object.keys(catalog.skills).length === 0) throw new Error('Canonical catalog needs nonempty skills');
  validateDependencies(catalog.skills);
  if (!Array.isArray(catalog.routingGroups)) throw new Error('Canonical catalog needs routingGroups');
  const ids = new Set();
  for (const group of catalog.routingGroups) {
    if (!object(group) || typeof group.id !== 'string' || !NAME.test(group.id) || ids.has(group.id) || !nonempty(group.title)
      || !nonempty(group.decision) || !Array.isArray(group.skills) || group.skills.length < 2) throw new Error('Invalid or duplicate routing group');
    ids.add(group.id);
    const names = new Set();
    for (const route of group.skills) {
      if (!object(route) || typeof route.name !== 'string' || !NAME.test(route.name)
        || !Object.hasOwn(catalog.skills, route.name) || names.has(route.name) || !nonempty(route.when)) throw new Error(`Invalid or duplicate route: ${group.id}`);
      names.add(route.name);
    }
  }
}

function runtimePackage(root, name) {
  const prefix = `skills/${name}`;
  safeRead(root, `${prefix}/SKILL.md`);
  const files = [];
  const identities = new Set();
  function visit(relative) {
    for (const entry of fs.readdirSync(path.join(root, ...relative.split('/')), { withFileTypes: true }).sort((a, b) => compare(a.name, b.name))) {
      // Match the offline pilot package boundary; eval oracles are never runtime inputs.
      if (['evals', '.git', 'node_modules'].includes(entry.name)) continue;
      const next = `${relative}/${entry.name}`;
      const stat = inspect(root, next);
      if (stat?.isDirectory()) visit(next);
      else if (stat?.isFile()) {
        const identity = next.toLowerCase();
        if (identities.has(identity)) throw new Error(`Case-colliding runtime path: ${next}`);
        identities.add(identity);
        const bytes = safeRead(root, next);
        files.push({ path: next.slice(prefix.length + 1), sha256: hash(bytes), bytes: bytes.length });
      } else throw new Error(`Non-regular runtime input: ${next}`);
    }
  }
  visit(prefix);
  files.sort((a, b) => compare(a.path, b.path));
  return { name, sha256: fingerprint(files), files };
}

function validateOutput(owner, document) {
  if (!object(document) || document.skill_name !== owner || !Array.isArray(document.evals) || !document.evals.length) throw new Error(`${owner}: invalid output eval document`);
  const ids = new Set();
  for (const item of document.evals) {
    if (!object(item) || !Number.isSafeInteger(item.id) || item.id < 1 || ids.has(item.id)
      || !nonempty(item.prompt) || !nonempty(item.expected_output) || !Array.isArray(item.assertions)
      || !item.assertions.length || item.assertions.some(value => !nonempty(value))
      || new Set(item.assertions.map(value => value.trim())).size !== item.assertions.length) throw new Error(`${owner}: invalid or duplicate output case`);
    ids.add(item.id);
    if (item.locale !== undefined && (!['en', 'zh-TW', 'mixed-zh-TW-en'].includes(item.locale)
      || (item.locale !== 'en' && !/[\u3400-\u9fff]/.test(item.prompt))
      || (item.locale === 'mixed-zh-TW-en' && !/[A-Za-z]{2,}/.test(item.prompt)))) throw new Error(`${owner}:${item.id}: invalid locale`);
    if (item.files !== undefined && !Array.isArray(item.files)) throw new Error(`${owner}:${item.id}: files must be an array`);
    const files = item.files || [];
    files.forEach(relativePath);
    if (new Set(files.map(value => value.toLowerCase())).size !== files.length) throw new Error(`${owner}:${item.id}: duplicate or case-colliding input file`);
    if (item.fixture_root !== undefined && (typeof item.fixture_root !== 'string'
      || !/^evals\/fixtures(?:\/[A-Za-z0-9_-]+)*$/.test(item.fixture_root) || !files.length
      || files.some(file => !file.startsWith(item.fixture_root + '/')))) throw new Error(`${owner}:${item.id}: invalid fixture_root`);
  }
}

function discoverCorpora(root, names) {
  const corpora = [];
  for (const owner of names) {
    for (const kind of ['output', 'routing']) {
      const relative = `skills/${owner}/evals/${kind === 'output' ? 'evals' : 'routing'}.json`;
      if (!inspect(root, relative)) continue;
      const input = jsonInput(root, relative);
      if (kind === 'output') validateOutput(owner, input.document);
      else {
        const errors = [], references = [];
        validateRoutingDocument(owner, input.document, errors, references);
        for (const reference of references) if (!names.includes(reference.skillName)) errors.push(`Unknown routed Skill: ${reference.skillName}`);
        if (errors.length) throw new Error(`${relative}: ${errors.join('; ')}`);
      }
      const items = kind === 'output' ? input.document.evals : input.document.cases;
      // Validate and bind declared inputs even for unselected cases. A broken corpus cannot disappear silently.
      const cases = items.map(item => {
        const files = (item.files || []).slice().sort(compare).map(file => {
          const relative = `skills/${owner}/${relativePath(file)}`;
          const bytes = safeRead(root, relative);
          return { path: relative, sha256: hash(bytes), bytes: bytes.length };
        });
        return { item, input_files: files };
      }).sort((a, b) => kind === 'output' ? a.item.id - b.item.id : compare(a.item.id, b.item.id));
      corpora.push({ owner, kind, path: input.path, sha256: input.sha256, bytes: input.bytes, cases });
    }
  }
  return corpora;
}

function buildPlan(options) {
  const root = fs.realpathSync(options.root || DEFAULT_ROOT);
  const changed = [...new Set(options.changed || [])].sort(compare);
  if (!changed.length || changed.some(name => typeof name !== 'string' || !NAME.test(name))) throw new Error('At least one normalized --changed Skill name is required');
  const input = jsonInput(root, CATALOG);
  const catalog = input.document;
  validateCatalog(catalog);
  const names = Object.keys(catalog.skills).sort(compare);
  for (const name of changed) if (!Object.hasOwn(catalog.skills, name)) throw new Error(`Unknown changed Skill: ${name}`);
  const packages = names.map(name => runtimePackage(root, name));
  const corpora = discoverCorpora(root, names);
  const reasons = new Map();
  const full = new Set(changed), routing = new Set(changed);
  function add(name, reason) {
    if (!reasons.has(name)) reasons.set(name, []);
    reasons.get(name).push(reason);
  }
  for (const name of changed) add(name, { type: 'direct_change', source: 'caller', changed_skill: name });
  const optionalAdvisories = [];
  for (const name of names) for (const dependency of catalog.skills[name].dependencies || []) {
    if (dependency.kind === 'optional') {
      if (changed.includes(name) || changed.includes(dependency.name)) optionalAdvisories.push({
        owner: name, dependency: dependency.name, kind: 'optional', source: CATALOG,
        changed_endpoints: [name, dependency.name].filter(endpoint => changed.includes(endpoint)).sort(compare),
        selection_effect: 'none',
      });
      continue;
    }
    if (!changed.includes(dependency.name)) continue;
    full.add(name); routing.add(name);
    add(name, { type: 'direct_dependency_consumer', source: CATALOG, changed_skill: dependency.name, kind: dependency.kind, when: dependency.when || null });
  }
  optionalAdvisories.sort((a, b) => compare(a.owner, b.owner) || compare(a.dependency, b.dependency));
  // Every edge is anchored to the original changed set; never revisit newly selected nodes.
  for (const group of catalog.routingGroups) for (const changedSkill of changed) {
    if (!group.skills.some(route => route.name === changedSkill)) continue;
    for (const route of group.skills) if (route.name !== changedSkill) {
      routing.add(route.name);
      add(route.name, { type: 'direct_routing_neighbor', source: CATALOG, changed_skill: changedSkill, group_id: group.id, when: route.when });
    }
  }
  const selectedCases = [];
  for (const corpus of corpora) for (const { item, input_files: files } of corpus.cases) {
    const caseReasons = [];
    if ((corpus.kind === 'output' ? full : routing).has(corpus.owner)) {
      caseReasons.push({ type: 'selected_owner_suite', owner: corpus.owner, suite: corpus.kind });
    }
    if (corpus.kind === 'routing') for (const field of ['expected_skills', 'excluded_skills', 'allowed_skills']) {
      for (const changedSkill of changed) if ((item[field] || []).includes(changedSkill)) {
        const reason = { type: 'routing_case_reference', source: corpus.path, case_id: item.id, field, changed_skill: changedSkill };
        caseReasons.push(reason); add(corpus.owner, reason);
      }
    }
    if (!caseReasons.length) continue;
    selectedCases.push({ id: `${corpus.owner}:${corpus.kind}:${item.id}`, owner: corpus.owner, suite: corpus.kind,
      case_id: item.id, kind: corpus.kind === 'routing' ? item.kind : 'output_task', locale: item.locale || 'unspecified',
      split: 'development', status: 'not_run', source: corpus.path, corpus_sha256: corpus.sha256,
      case_sha256: fingerprint(item), prompt_sha256: hash(item.prompt), input_files: files,
      input_sha256: fingerprint({ prompt_sha256: hash(item.prompt), files }), reasons: caseReasons,
      grading: null, result: null });
  }
  selectedCases.sort((a, b) => compare(a.id, b.id));
  const selectedSkills = [...reasons.keys()].sort(compare).map(name => {
    const suites = {};
    for (const kind of ['output', 'routing']) {
      const corpus = corpora.find(entry => entry.owner === name && entry.kind === kind);
      const count = selectedCases.filter(item => item.owner === name && item.suite === kind).length;
      const requested = (kind === 'output' ? full : routing).has(name);
      suites[kind] = { selection: requested ? 'all' : count ? 'referencing_cases_only' : 'not_selected',
        definition_status: corpus ? 'present' : 'missing', available_cases: corpus?.cases.length || 0,
        selected_cases: count, reason: requested ? 'owner_impact' : count ? 'references_changed_skill' : 'outside_bounded_selection' };
    }
    return { name, reasons: reasons.get(name).sort((a, b) => compare(JSON.stringify(ordered(a)), JSON.stringify(ordered(b)))), suites };
  });
  const sourceManifest = corpora.map(corpus => ({ path: corpus.path, sha256: corpus.sha256, bytes: corpus.bytes, cases: corpus.cases.length }));
  const implementation = ['plan-skill-regressions.js', 'prepare-skill-pilot.js', 'lib/skill-dependencies.js', 'validate-skill-evals.js']
    .map(file => ({ path: `scripts/${file}`, sha256: hash(fs.readFileSync(path.join(__dirname, file))) }));
  return { schema_version: 1, evaluation_kind: 'offline_affected_suite_plan', audience: 'evaluator', status: 'not_run',
    selection_algorithm: { version: ALGORITHM, source: CATALOG, reverse_dependency_depth: 1, routing_group_depth: 1,
      expansion_roots: 'changed_only', case_reference_fields: ['expected_skills', 'excluded_skills', 'allowed_skills'],
      conditional_dependencies: 'conservatively_included_without_evaluating_when', optional_dependencies: 'advisory_only_no_expansion', implementation },
    changed_skills: changed, optional_dependency_advisories: optionalAdvisories, selected_skills: selectedSkills, cases: selectedCases,
    sources: { canonical_catalog: { path: CATALOG, sha256: input.sha256, bytes: input.bytes },
      discovered_corpora: sourceManifest, corpus_inventory_sha256: fingerprint(sourceManifest),
      runtime_packages: packages, runtime_snapshot_sha256: fingerprint(packages) },
    selected_inputs_sha256: fingerprint(selectedCases.map(item => ({ id: item.id, case_sha256: item.case_sha256, input_sha256: item.input_sha256 }))),
    summary: { catalog_skills: names.length, selected_skills: selectedSkills.length,
      routing_cases: selectedCases.filter(item => item.suite === 'routing').length,
      output_cases: selectedCases.filter(item => item.suite === 'output').length,
      missing_requested_suites: selectedSkills.flatMap(skill => Object.entries(skill.suites)
        .filter(([, suite]) => suite.selection === 'all' && suite.definition_status === 'missing')
        .map(([suite]) => ({ owner: skill.name, suite }))), executed_cases: 0 },
    execution: { host: null, model: null, reasoning_effort: null, toolset: null, grader: null,
      variants: null, trials: null, run_budget: null, cost: null, usage: null, activation_observed: false },
    limitations: [
      'Planning only: no model, network, shell, Git, task execution, or grading was invoked. Case counts are definitions, not authorized runs or quota.',
      'This is a bounded impact heuristic, not a transitive dependency closure or proof of complete behavioral coverage. Add indirect consumers explicitly through --changed when warranted.',
      'Only original changed Skills expand dependency and routing edges. Routing-only neighbors select routing suites, not output tasks; other owners contribute only cases explicitly referencing a changed Skill.',
      'Optional dependency edges touching a changed Skill are listed as advisories only; they do not add Skills or cases. Independent routing or explicit-change reasons still apply.',
      'No declared fixture does not establish text-only readiness. A host, scoped tools, validated isolation, graders, variants, trials, and execution authorization remain to be configured.',
      'Hashes bind the observed local bytes, not an atomic filesystem snapshot or proof of host discovery/activation. Rebuild after authoring stops and verify hashes before execution.',
      'Current corpus cases are development definitions; this plan does not create a holdout or an independent A/B comparison.',
      'Runtime packages exclude evals, .git, and node_modules. Case oracle hashes and selection reasons are evaluator metadata; this manifest is not a model-facing prompt.',
    ] };
}

function parseArgs(argv) {
  const options = { root: DEFAULT_ROOT, changed: [] };
  const seen = new Set();
  for (let index = 0; index < argv.length; index++) {
    const key = argv[index];
    if (!['--changed', '--root', '--output'].includes(key)) throw new Error(`Unknown option: ${key}`);
    if (key !== '--changed' && seen.has(key)) throw new Error(`Duplicate option: ${key}`);
    seen.add(key);
    const value = argv[++index];
    if (!value || value.startsWith('--')) throw new Error(`Missing value: ${key}`);
    if (key === '--changed') options.changed.push(value);
    if (key === '--root') options.root = path.resolve(value);
    if (key === '--output') options.output = path.resolve(value);
  }
  if (!options.changed.length || !options.output) throw new Error('Usage: node scripts/plan-skill-regressions.js --changed <skill> [--changed <skill> ...] --output <new-json-file> [--root <repository>]');
  return options;
}

function writePlan(plan, output) {
  const target = path.resolve(output), parent = path.dirname(target);
  relativePath(path.basename(target));
  // wx also rejects a dangling symlink and closes the overwrite race.
  if (fs.existsSync(target)) throw new Error('Output already exists; choose a new JSON file');
  if (!fs.statSync(parent).isDirectory() || path.resolve(fs.realpathSync(parent)) !== parent) throw new Error('Output parent must be an existing real directory');
  fs.writeFileSync(target, JSON.stringify(plan, null, 2) + '\n', { flag: 'wx' });
  return target;
}

function main(argv, log = console.log) {
  const options = parseArgs(argv);
  if (fs.existsSync(options.output)) throw new Error('Output already exists; choose a new JSON file');
  const plan = buildPlan(options);
  const target = writePlan(plan, options.output);
  log(`Planned ${plan.summary.selected_skills} Skills, ${plan.summary.routing_cases} routing and ${plan.summary.output_cases} output definitions; status not_run; ${target}`);
  return plan;
}
if (require.main === module) {
  try { main(process.argv.slice(2)); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { buildPlan, parseArgs, writePlan, main };
