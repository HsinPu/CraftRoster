#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const sha256 = (value) => crypto.createHash('sha256').update(value.toString('utf8').replace(/\r\n/g, '\n')).digest('hex');
function isWithin(root, target) {
  const relative = path.relative(root, target);
  return relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}
function readablePackageFile(root, name, file) {
  const packageRoot = fs.realpathSync(path.join(root, 'skills', name));
  return isWithin(fs.realpathSync(path.join(root, 'skills')), packageRoot)
    && fs.existsSync(file) && fs.statSync(file).isFile()
    && isWithin(packageRoot, fs.realpathSync(file));
}

function validate(root, registry) {
  const errors = [];
  const catalog = JSON.parse(fs.readFileSync(path.join(root, 'skills.json'), 'utf8'));
  const skills = new Map(catalog.skills.map((skill) => [skill.name, skill]));
  if (!registry || registry.schema_version !== 1 || !Array.isArray(registry.skills)
    || !Array.isArray(registry.category_representatives)) return ['Invalid review registry schema'];
  if (registry.entry_hash_normalization !== 'utf8-lf') errors.push('Entry hashes must normalize CRLF to LF');
  if (!/^[a-f0-9]{40}$/.test(registry.baseline_commit || '')) errors.push('Missing baseline commit');
  const seen = new Set();
  for (const entry of registry.skills) {
    if (!entry || typeof entry.name !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.name) || !skills.has(entry.name)) { errors.push('Unknown review Skill'); continue; }
    if (seen.has(entry.name)) errors.push(`Duplicate review Skill: ${entry.name}`);
    seen.add(entry.name);
    if (entry.category !== skills.get(entry.name).category) errors.push(`${entry.name}: category drift`);
    if (!['keep', 'improve', 'route', 'merge', 'defer'].includes(entry.decision)) errors.push(`${entry.name}: invalid decision`);
    if (!['semantic-review', 'dependency-review', 'eval-design', 'inventory-only'].includes(entry.review_depth)) errors.push(`${entry.name}: invalid review depth`);
    if (entry.review_depth === 'inventory-only' && entry.decision !== 'defer') errors.push(`${entry.name}: inventory alone cannot justify a content decision`);
    for (const field of ['reason', 'next_action']) {
      if (typeof entry[field] !== 'string' || !entry[field].trim()) errors.push(`${entry.name}: missing ${field}`);
    }
    // This registry records review scope, never an execution pass. Runtime evidence is a separate artifact.
    if (entry.runtime_status !== 'not_run') errors.push(`${entry.name}: registry must not claim a runtime result`);
    const entryFile = path.join(root, 'skills', entry.name, 'SKILL.md');
    if (!readablePackageFile(root, entry.name, entryFile)) { errors.push(`${entry.name}: entry must stay within the Skill package`); continue; }
    const content = fs.readFileSync(entryFile);
    if (entry.entry_sha256 !== sha256(content)) errors.push(`${entry.name}: entry changed since review; refresh its decision and hash`);
  }
  for (const name of skills.keys()) if (!seen.has(name)) errors.push(`Missing review decision: ${name}`);
  const categories = new Set(catalog.categories.map((category) => category.id));
  const covered = new Set();
  for (const representative of registry.category_representatives) {
    if (!representative || !categories.has(representative.category)) { errors.push('Unknown representative category'); continue; }
    if (covered.has(representative.category)) errors.push(`Duplicate representative category: ${representative.category}`);
    covered.add(representative.category);
    if (typeof representative.skill !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(representative.skill)
      || !skills.has(representative.skill) || skills.get(representative.skill).category !== representative.category) {
      errors.push(`${representative.category}: representative must belong to category`);
      continue;
    }
    const packageRoot = path.join(root, 'skills', representative.skill);
    const file = path.join(packageRoot, 'evals/evals.json');
    if (!fs.existsSync(file)) { errors.push(`${representative.category}: missing representative output cases`); continue; }
    if (!readablePackageFile(root, representative.skill, file)) {
      errors.push(`${representative.category}: representative cases must stay within the Skill package`);
      continue;
    }
    const document = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!Array.isArray(document.evals) || !document.evals.some((item) => item.id === representative.case_id)) errors.push(`${representative.category}: representative case does not exist`);
    if (representative.status !== 'definition_only') errors.push(`${representative.category}: runtime results belong in a separate run artifact`);
  }
  for (const category of categories) if (!covered.has(category)) errors.push(`Missing representative category: ${category}`);
  if (registry.pilot_skills !== undefined) {
    if (!Array.isArray(registry.pilot_skills) || registry.pilot_skills.length === 0 || new Set(registry.pilot_skills).size !== registry.pilot_skills.length) {
      errors.push('Pilot Skills must be a nonempty unique list');
    } else for (const name of registry.pilot_skills) {
      if (typeof name !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name) || !skills.has(name)) { errors.push('Unknown pilot Skill'); continue; }
      const directory = path.join(root, 'skills', name, 'evals');
      const output = path.join(directory, 'evals.json'), routing = path.join(directory, 'routing.json');
      if (!fs.existsSync(output) || !fs.existsSync(routing)) { errors.push(`${name}: pilot needs output and routing cases`); continue; }
      if (!readablePackageFile(root, name, output) || !readablePackageFile(root, name, routing)) { errors.push(`${name}: pilot cases must stay within the Skill package`); continue; }
      const outputs = JSON.parse(fs.readFileSync(output, 'utf8')).evals;
      const routes = JSON.parse(fs.readFileSync(routing, 'utf8')).cases;
      if (!Array.isArray(outputs) || outputs.length < 6 || !Array.isArray(routes) || routes.length < 7) {
        errors.push(`${name}: pilot requires at least 6 output and 7 routing definitions`);
      } else for (const [kind, minimum] of [['positive', 2], ['near_match', 2], ['negative', 1]]) {
        if (routes.filter((item) => item.kind === kind).length < minimum) errors.push(`${name}: pilot lacks ${kind} representation`);
      }
      for (const [label, cases] of [['output', outputs], ['routing', routes]]) {
        if (!Array.isArray(cases)) continue;
        for (const locale of ['en', 'zh-TW', 'mixed-zh-TW-en']) {
          if (!cases.some(item => item.locale === locale)) errors.push(`${name}: pilot ${label} lacks ${locale} representation`);
        }
      }
    }
  }
  return errors;
}

function run(root = path.resolve(__dirname, '..')) {
  const registry = JSON.parse(fs.readFileSync(path.join(root, 'docs/skill-review-registry.json'), 'utf8'));
  const errors = validate(root, registry);
  if (errors.length) throw new Error(errors.join('\n'));
  console.log(`Skill review registry validated: ${registry.skills.length} decisions, ${registry.category_representatives.length} category case definitions; no runtime result claimed`);
}
if (require.main === module) {
  try { if (process.argv.length > 2) throw new Error('No arguments supported'); run(); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { validate, sha256, run };
