#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { validateRepository: validateEvals } = require('./validate-skill-evals');
const { validateRepository: validateSources, computeReferenceLock, readReferenceManifest } = require('./verify-skill-sources');
const START = '<!-- CRAFTROSTER_RELEASE_BASELINE_START -->';
const END = '<!-- CRAFTROSTER_RELEASE_BASELINE_END -->';

function buildBaseline(root) {
  const read = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
  const skills = read('skills.json');
  const agents = read('agents.json');
  const coverage = read('scripts/data/skill-eval-coverage.json');
  const matrix = read('scripts/data/agent-coverage-matrix.json');
  const evals = validateEvals(root);
  if (evals.errors.length) throw new Error(evals.errors.join('\n'));
  const sources = validateSources(root);
  const lock = computeReferenceLock(readReferenceManifest(root));
  return [
    ['Skills', skills.skills.length], ['Agents', agents.agents.length],
    ['Skill categories', skills.categories.length],
    ['Agent coverage categories', `${matrix.categories.filter(c => c.status === 'covered').length}／${matrix.categories.length}`],
    ['Required eval packages', coverage.required_skills.length],
    ['Output case definitions／assertions', `${evals.summary.evalCount}／${evals.summary.assertionCount}`],
    ['Routing case definitions', evals.summary.routingCaseCount],
    ['Referenced Skills／repositories／paths', `${sources.referencedSkillCount}／${sources.sourceCount}／${sources.referencePathCount}`],
    ['Provenance lock mappings', `${lock.referencedSkillCount} Skills／${lock.repositoryCount} repositories／${lock.referencePathCount} path entries`],
  ];
}
function renderBlock(rows) {
  return `${START}\n| Evidence | Current baseline |\n|---|---:|\n${rows.map(([key,value]) => `| ${key} | ${value} |`).join('\n')}\n${END}`;
}
function updateDocument(source, block) {
  const start = source.indexOf(START), end = source.indexOf(END);
  if (start < 0 || end < start || source.indexOf(START, start + START.length) >= 0 || source.indexOf(END, end + END.length) >= 0) {
    throw new Error('Release checklist must contain exactly one ordered baseline marker pair');
  }
  return source.slice(0, start) + block + source.slice(end + END.length);
}
function run(argv = process.argv.slice(2), root = path.resolve(__dirname, '..')) {
  if (argv.some(a => a !== '--check') || argv.length > 1) throw new Error('Usage: node scripts/generate-release-baseline.js [--check]');
  const file = path.join(root, 'docs/release-checklist.md');
  const source = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  const result = updateDocument(source, renderBlock(buildBaseline(root)));
  if (argv.includes('--check')) {
    if (source !== result) throw new Error('Release baseline is out of date; run npm run generate:release-baseline');
    console.log('Release baseline check passed (catalog and case definitions, not runtime success)');
  } else {
    fs.writeFileSync(file, result);
    console.log('Generated release baseline');
  }
}
if (require.main === module) {
  try { run(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { buildBaseline, renderBlock, updateDocument, run };
