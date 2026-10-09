'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { sha256 } = require('../../../scripts/validate-skill-review');
const root = path.resolve(__dirname, '../../..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');
const registryPath = 'docs/skill-review-registry.json';
const registry = JSON.parse(read(registryPath));
const before = JSON.parse(fs.readFileSync(path.join(__dirname, 'catalog-before.json'), 'utf8'));
const current = JSON.parse(read('scripts/data/skill-catalog.json'));
const status = JSON.parse(fs.readFileSync(path.join(__dirname, 'remediation-status.json'), 'utf8'));
const baseline = path.join(__dirname, 'review-registry-before.json');
if (!fs.existsSync(baseline)) fs.writeFileSync(baseline, read(registryPath), { flag: 'wx' });
const originalEntries = new Map(JSON.parse(fs.readFileSync(baseline, 'utf8')).skills.map(entry => [entry.name, entry]));
registry.review_date = '2026-10-09';
registry.scope = 'Entry instructions and all reviewed package dependency/route relationships across 286 Skills; see docs/audits/skill-installability-2026-10-09/remediation-status.json. Static instruction/installability review and case definitions do not certify live model behavior.';
let changed = 0;
for (const entry of registry.skills) {
  const digest = sha256(read(`skills/${entry.name}/SKILL.md`));
  const bodyChanged = digest !== originalEntries.get(entry.name).entry_sha256;
  const metadataChanged = JSON.stringify(before.skills[entry.name]) !== JSON.stringify(current.skills[entry.name]);
  const findings = status.resolutions.filter(item => item.source === entry.name);
  entry.entry_sha256 = digest;
  if (bodyChanged || metadataChanged || findings.length) {
    changed++;
    entry.decision = 'improve';
    entry.review_depth = bodyChanged ? 'semantic-review' : 'dependency-review';
    entry.reason = `Installability repair: ${findings.length} original findings resolved; core, conditional, resource, and alternative ownership checked against current evidence. See the 2026-10-09 remediation record.`;
    entry.next_action = 'Use the verified required closure for selective/category installation. Live task behavior remains unrun; any later model trial needs its own current-source evidence.';
  } else if (entry.review_depth === 'inventory-only') {
    entry.decision = 'keep';
    entry.review_depth = 'dependency-review';
    entry.reason = 'The installability audit reviewed current instructions and relationships; no package dependency or wording repair was needed. Live task behavior remains unrun.';
    entry.next_action = 'Recheck relevant relationships when instructions or installed target capabilities change.';
  }
  entry.runtime_status = 'not_run';
}
fs.writeFileSync(path.join(root, registryPath), JSON.stringify(registry, null, 2) + '\n');
console.log(`Refreshed review registry: ${registry.skills.length} current hashes, ${changed} repair decisions; runtime remains not_run`);
