#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { buildBundleRows, buildAgentDependencyRows, renderRows, renderBundleSummary } = require('./lib/install-bundles');

function run(root, check = false) {
  const read = (name) => JSON.parse(fs.readFileSync(path.join(root, name), 'utf8'));
  const agents = read('agents.json');
  const skills = read('skills.json');
  const registry = read('scripts/data/install-bundles.json');
  const outputs = new Map([
    ['scripts/data/install-bundles.tsv', renderRows(buildBundleRows(registry, agents, skills), ['bundle', 'title', 'description', 'type', 'name'])],
    ['scripts/data/install-agent-skill-dependencies.tsv', renderRows(buildAgentDependencyRows(agents, skills), ['agent', 'skill', 'kind', 'when', 'reason'])]
  ]);
  const readmePath = path.join(root, 'README.md');
  if (fs.existsSync(readmePath)) {
    const readme = fs.readFileSync(readmePath, 'utf8');
    const marker = /<!-- INSTALL_BUNDLES_START -->[\s\S]*?<!-- INSTALL_BUNDLES_END -->/;
    if (marker.test(readme)) outputs.set('README.md', readme.replace(marker, renderBundleSummary(registry)));
  }
  for (const [name, content] of outputs) {
    const file = path.join(root, name);
    if (check) {
      if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== content) {
        throw new Error(`${name} is stale; run npm run generate:install-bundles`);
      }
    } else {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, content, 'utf8');
    }
  }
  return { bundles: registry.bundles.length, agents: agents.agents.length, skills: skills.skills.length };
}

if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.some((arg) => arg !== '--check')) throw new Error('Usage: node scripts/generate-install-bundles.js [--check]');
  const stats = run(path.resolve(__dirname, '..'), args.includes('--check'));
  console.log(`${args.includes('--check') ? 'Verified' : 'Generated'} ${stats.bundles} install bundles covering ${stats.agents} Agents and ${stats.skills} Skills`);
}

module.exports = { run };
