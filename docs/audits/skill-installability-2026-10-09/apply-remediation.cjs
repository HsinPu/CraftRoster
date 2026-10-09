'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../../..');
const { validateDependencies, validateRoutes, validateSiblingLinks } = require(path.join(root, 'scripts/lib/skill-dependencies'));
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const read = file => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');
const json = file => JSON.parse(read(file));
const write = (file, object) => fs.writeFileSync(path.join(root, file), JSON.stringify(object, null, 2) + '\n');
const prefix = 'docs/audits/skill-installability-2026-10-09/';
const catalogPath = 'scripts/data/skill-catalog.json';
const audit = json(prefix + 'skill-installability.json');
const backlog = json(prefix + 'clarification-backlog.json');
const proposals = ['core', 'content', 'frontend', 'threejs'].map(part => json(prefix + `remediation-${part}.json`));
const entries = proposals.flatMap(part => part.skills);
const known = new Set(audit.skills.map(skill => skill.name));
const byName = new Map(entries.map(entry => [entry.name, entry]));
if (entries.length !== known.size || byName.size !== known.size || entries.some(entry => !known.has(entry.name))) {
  throw new Error('Remediation partitions must cover every Skill exactly once');
}
function checkEvidence(evidence, label) {
  if (!Array.isArray(evidence) || !evidence.length) throw new Error(`${label}: evidence missing`);
  for (const item of evidence) {
    if (!/^skills\/[a-z0-9-]+\//.test(item.file) || item.file.includes('..') || !Number.isSafeInteger(item.line) || item.line < 1) {
      throw new Error(`${label}: invalid evidence path/line`);
    }
    const line = read(item.file).split('\n')[item.line - 1];
    if (!item.text || !line?.includes(item.text)) throw new Error(`${label}: current evidence drift at ${item.file}:${item.line}`);
  }
}
const config = json(catalogPath);
for (const entry of entries) {
  const dependencies = new Map(), routes = new Map();
  for (const relation of entry.relationships) {
    if (!known.has(relation.target) || relation.target === entry.name) throw new Error(`${entry.name}: invalid target ${relation.target}`);
    if (!['required', 'conditional', 'optional', 'alternative', 'related'].includes(relation.kind)) throw new Error(`${entry.name}: unresolved relation kind ${relation.kind}`);
    checkEvidence(relation.evidence, `${entry.name} -> ${relation.target}`);
    if (['alternative', 'related'].includes(relation.kind)) {
      const key = `${relation.target}/${relation.kind}`;
      const when = (relation.when || relation.reasonZh || '').replace(/[\t\r\n\0]+/g, ' ').trim();
      if (!when) throw new Error(`${entry.name}: route has no condition`);
      const old = routes.get(key);
      routes.set(key, { name: relation.target, kind: relation.kind, when: old && old.when !== when ? `${old.when}; ${when}` : when });
      continue;
    }
    const old = dependencies.get(relation.target);
    const rank = { optional: 0, conditional: 1, required: 2 };
    const kind = old && rank[old.kind] > rank[relation.kind] ? old.kind : relation.kind;
    const dependency = { name: relation.target, kind };
    if (kind === 'conditional') {
      const when = (relation.kind === 'conditional' ? relation.when || '' : old?.when || '').replace(/[\t\r\n\0]+/g, ' ').trim();
      if (!when) throw new Error(`${entry.name}: conditional relation has no trigger`);
      dependency.when = old?.when && old.when !== when ? `${old.when}; ${when}` : when;
    }
    // Workflow use takes precedence if the same package also supplies reference files.
    if (relation.usage === 'resource' && (!old || old.usage === 'resource')) dependency.usage = 'resource';
    dependencies.set(relation.target, dependency);
  }
  for (const excluded of entry.excludedRelationships || []) {
    if (!known.has(excluded.target) || !excluded.reason) throw new Error(`${entry.name}: excluded relation needs a known target and rationale`);
    checkEvidence(excluded.evidence, `${entry.name}: excluded ${excluded.target}`);
  }
  delete config.skills[entry.name].dependencies;
  delete config.skills[entry.name].routes;
  if (dependencies.size) config.skills[entry.name].dependencies = [...dependencies.values()].sort((a, b) => a.name.localeCompare(b.name));
  if (routes.size) config.skills[entry.name].routes = [...routes.values()].sort((a, b) => a.name.localeCompare(b.name) || a.kind.localeCompare(b.kind));
}
config.updated = '2026-10-09T00:00:00Z';
validateDependencies(config.skills);
validateRoutes(config.skills);
validateSiblingLinks(root, config.skills);
const originalItems = Array.isArray(backlog) ? backlog : backlog.items;
if (!Array.isArray(originalItems)) throw new Error('Unknown backlog shape');
const resolutions = originalItems.map(item => {
  const owner = byName.get(item.source);
  if (item.type === 'wording') {
    const match = owner.resolvedAmbiguities?.find(resolved => resolved.title === item.title);
    if (!match?.resolution) throw new Error(`${item.source}: wording unresolved: ${item.title}`);
    return { source: item.source, type: item.type, title: item.title, status: 'resolved', resolution: match.resolution };
  }
  const dependency = config.skills[item.source].dependencies?.find(dep => dep.name === item.target);
  const route = config.skills[item.source].routes?.find(route => route.name === item.target);
  const excluded = owner.excludedRelationships?.find(rel => rel.target === item.target);
  if (!dependency && !route && !excluded) throw new Error(`${item.source}: metadata disposition missing for ${item.target}`);
  return { source: item.source, type: item.type, title: item.title, target: item.target, oldKind: item.declaredKind || null,
    status: 'resolved', disposition: dependency ? 'dependency' : route ? 'route' : 'excluded',
    current: dependency || route || { reason: excluded.reason } };
});
function closure(names, table) {
  const result = new Set();
  function visit(name) { if (result.has(name)) return; result.add(name);
    for (const dep of table[name].dependencies || []) if (dep.kind === 'required') visit(dep.name); }
  names.forEach(visit); return [...result].sort();
}
const before = Object.fromEntries(audit.skills.map(skill => [skill.name, { dependencies: skill.declaredDependencies }]));
const sourceFiles = [...new Set(audit.skills.flatMap(skill => skill.sourceFiles.map(file => file.file)))].sort();
const manifest = sourceFiles.map(file => {
  const bytes = fs.readFileSync(path.join(root, file)); return { file, sha256: hash(bytes), bytes: bytes.length };
});
const stats = {};
for (const entry of Object.values(config.skills)) for (const dependency of entry.dependencies || []) stats[dependency.kind] = (stats[dependency.kind] || 0) + 1;
stats.routes = Object.values(config.skills).reduce((n, entry) => n + (entry.routes || []).length, 0);
stats.resourceDependencies = Object.values(config.skills).reduce((n, entry) => n + (entry.dependencies || []).filter(dep => dep.usage === 'resource').length, 0);
const result = { schemaVersion: 1, auditDate: '2026-10-09', status: 'implemented', runtimeStatus: 'not_run',
  scope: 'All 286 Skill packages and applicable findings in the frozen installability audit; catalog/installer rules only, no interactive category UI.',
  stats: { skills: entries.length, resolvedBacklogItems: resolutions.length, ...stats }, resolutions,
  packages: audit.skills.map(skill => ({ name: skill.name, category: skill.category,
    changedFiles: byName.get(skill.name).changedFiles, before: closure([skill.name], before), after: closure([skill.name], config.skills),
    dependencies: config.skills[skill.name].dependencies || [], routes: config.skills[skill.name].routes || [] })),
  sources: manifest, proposalFiles: proposals.map((_, index) => ['core', 'content', 'frontend', 'threejs'][index]).map(part => {
    const file = prefix + `remediation-${part}.json`; return { file, sha256: hash(fs.readFileSync(path.join(root, file))) };
  }), limitations: ['Instruction and installation semantics were reviewed statically. Executed repository and installer checks are recorded separately; no live model task outcome is claimed.'] };
if (process.argv[2] === '--apply') {
  const baselineFile = path.join(__dirname, 'catalog-before.json');
  if (!fs.existsSync(baselineFile)) fs.writeFileSync(baselineFile, read(catalogPath) + '\n', { flag: 'wx' });
  write(catalogPath, config);
  write(prefix + 'remediation-status.json', result);
  console.log(`Applied remediation: ${entries.length} Skills, ${resolutions.length} resolved findings, ${JSON.stringify(stats)}`);
} else if (process.argv.length === 2) console.log(`Remediation preflight passed: ${entries.length} Skills, ${resolutions.length} findings, ${JSON.stringify(stats)}`);
else throw new Error('Usage: node apply-remediation.cjs [--apply]');
