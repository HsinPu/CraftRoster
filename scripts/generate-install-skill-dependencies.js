#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { validateDependencies } = require('./lib/skill-dependencies');

function buildRows(catalog) {
  if (!catalog || !Array.isArray(catalog.skills)) throw new Error('Skill catalog must contain skills');
  for (const skill of catalog.skills) {
    if (!skill || typeof skill.name !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(skill.name)) {
      throw new Error('Skill catalog must contain normalized string names');
    }
  }
  const entries = Object.fromEntries(catalog.skills.map((skill) => [skill.name, skill]));
  if (Object.keys(entries).length !== catalog.skills.length) throw new Error('Duplicate Skill names');
  validateDependencies(entries);
  return Object.keys(entries).sort().flatMap((name) => [...(entries[name].dependencies || [])]
    .sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0)
    .map((dependency) => ({ skill: name, dependency: dependency.name, kind: dependency.kind, when: dependency.when || '-' })));
}

function render(rows) {
  return ['skill\tdependency\tkind\twhen', ...rows.map((row) => `${row.skill}\t${row.dependency}\t${row.kind}\t${row.when}`)].join('\n') + '\n';
}

function run(argv = process.argv.slice(2), root = path.resolve(__dirname, '..')) {
  if (argv.some((arg) => arg !== '--check')) throw new Error('Only --check is supported');
  const output = path.join(root, 'scripts/data/install-skill-dependencies.tsv');
  const rows = buildRows(JSON.parse(fs.readFileSync(path.join(root, 'skills.json'), 'utf8')));
  const text = render(rows);
  if (argv.includes('--check')) {
    if (!fs.existsSync(output) || fs.readFileSync(output, 'utf8') !== text) throw new Error('Dependency index is stale; run npm run generate:skills');
  } else fs.writeFileSync(output, text, 'utf8');
  console.log(`Skill dependency index ${argv.includes('--check') ? 'check passed' : 'generated'}: ${rows.length} edges`);
}

if (require.main === module) {
  try { run(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { buildRows, render, run };
