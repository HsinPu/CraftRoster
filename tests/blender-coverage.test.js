'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { validateCoverage, validateInventory } = require('../scripts/validate-blender-coverage');

const root = path.resolve(__dirname, '..');
const read = p => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
const baseline = {
  root,
  inventory: read('scripts/data/blender-upstream-inventory.json'),
  coverage: read('scripts/data/blender-source-coverage.json'),
  catalog: read('scripts/data/skill-catalog.json'),
  bundles: read('scripts/data/install-bundles.json')
};
let passed = 0;
function test(name, action) { action(); passed++; console.log(`PASS ${name}`); }
function options() { return { ...structuredClone({ ...baseline, root: undefined }), root }; }
function reject(name, mutate, expected) {
  test(name, () => { const data = options(); mutate(data); assert.throws(() => validateCoverage(data), expected); });
}
function firstCapability(data) { return data.coverage.entries[0].capabilities[0]; }

test('all frozen source entries and retained coordinators have coherent local support', () => {
  const result = validateCoverage(baseline);
  assert.equal(result.sourceFiles, 388);
  assert.equal(result.sourceEntries, 122);
  assert.equal(result.packages, 108);
  assert.equal(result.retainedCoordinators, 4);
  assert.equal(result.evidence.workflow, 'not_run');
  assert.equal(result.semanticQuality, 'not established by this validator');
});
reject('an unmapped canonical upstream entry is rejected', d => {
  d.coverage.entries[0].mappedPackages = [];
}, /unmapped/);
reject('a completely omitted upstream entry is rejected', d => {
  const entry = d.coverage.entries.pop();
  for (const p of d.coverage.packages) p.sourceEntries = p.sourceEntries.filter(id => id !== entry.id);
}, /missing upstream entry mapping|unmapped upstream entrypoint/);
reject('a duplicate source entry cannot pad coverage totals', d => {
  d.coverage.entries.push(structuredClone(d.coverage.entries[0]));
}, /unknown or duplicate coverage entry/);
reject('a mismatched source entry blob is rejected', d => {
  d.coverage.entries[0].blob = '0'.repeat(40);
}, /mismatched entry blob/);
reject('a mismatched inspected reference or script blob is rejected', d => {
  d.coverage.entries[0].sourceResources[0].blob = '0'.repeat(40);
}, /mismatched blob/);
reject('an omitted package reference or script cannot pass on entrypoint alone', d => {
  const entry = d.coverage.entries.find(e => e.sourceResources.some(r => r.path !== e.path && r.path.startsWith(e.path.slice(0, -8))));
  assert(entry, 'real source package with supporting resource exists');
  const prefix = entry.path.slice(0, -'SKILL.md'.length);
  const remove = entry.sourceResources.find(r => r.path !== entry.path && r.path.startsWith(prefix));
  entry.sourceResources = entry.sourceResources.filter(r => r.path !== remove.path);
}, /missing source resource/);
reject('a missing local supporting document is rejected', d => {
  const capability = firstCapability(d);
  capability.localResources[0].path = `skills/${capability.package}/references/not-present-for-coverage.md`;
}, /missing local resource/);
reject('a current local instruction reference cannot be silently omitted from the package index', d => {
  const pkg = d.coverage.packages.find(p => p.localResources.some(r => r.path.startsWith(`skills/${p.name}/references/`)));
  const resource = pkg.localResources.find(r => r.path.startsWith(`skills/${pkg.name}/references/`));
  pkg.localResources = pkg.localResources.filter(r => r.path !== resource.path);
}, /current instruction resource missing from coverage/);
reject('an invented package cannot masquerade as a mapped capability', d => {
  firstCapability(d).package = 'blender-unregistered-invention';
}, /unknown package/);
reject('a traversal path is rejected before filesystem resolution', d => {
  firstCapability(d).localResources[0].path = 'skills/blender-development/../../README.md';
}, /unsafe path/);
reject('an absolute Windows path is rejected', d => {
  firstCapability(d).localResources[0].path = 'C:/Windows/system.ini';
}, /unsafe path/);
reject('an undeclared cross-Skill resource is rejected even when the file exists', d => {
  const capability = firstCapability(d);
  const target = d.coverage.packages.find(p => p.name !== capability.package && p.name !== 'blender-development'
    && !(d.catalog.skills[capability.package].dependencies || []).some(dep => dep.name === p.name && dep.kind === 'required' && dep.usage === 'resource'));
  assert(target, 'an unrelated existing package exists');
  capability.localResources.push({ package: capability.package, path: `skills/${target.name}/SKILL.md` });
}, /undeclared cross-Skill required resource/);
reject('conditional presence does not satisfy a required resource declaration', d => {
  const capability = d.coverage.entries.flatMap(e => e.capabilities).find(c => c.package !== 'blender-development');
  const dependency = d.catalog.skills[capability.package].dependencies.find(dep => dep.name === 'blender-development');
  dependency.kind = 'conditional'; dependency.when = 'Only for an unrelated optional task.';
}, /undeclared cross-Skill required resource|missing required foundation resource/);
reject('a legal notice cannot substitute for actual capability instructions', d => {
  const capability = firstCapability(d);
  capability.localResources[0].path = `skills/${capability.package}/references/upstream-notice.md`;
}, /attribution alone/);
reject('a partial purpose bundle cannot silently orphan packages', d => {
  d.bundles.bundles.find(b => b.id === 'game-development').skills.pop();
}, /direct 108-package suite/);
reject('an engine exporter cannot omit the common export resource', d => {
  d.catalog.skills['blender-godot-export'].dependencies = d.catalog.skills['blender-godot-export'].dependencies.filter(dep => dep.name !== 'blender-export');
}, /undeclared cross-Skill required resource|missing common export resource|engine export closure/);
reject('structural coverage cannot be relabeled a successful Blender workflow', d => {
  d.coverage.evidence.workflow = 'passed';
}, /keep runtime evidence separate/);
test('repository revisions and trees are frozen independently of mappings', () => {
  const inventory = structuredClone(baseline.inventory);
  inventory.repositories[0].tree = '0'.repeat(40);
  assert.throws(() => validateInventory(inventory), /mismatched pinned tree/);
});
test('coordinated inventory and coverage edits cannot rewrite a pinned file blob', () => {
  const data = options();
  const repo = data.inventory.repositories[0];
  const file = repo.files.find(f => f.kind === 'package-script');
  file.blob = '0'.repeat(40);
  for (const entry of data.coverage.entries) if (entry.repository === repo.id) {
    for (const resource of entry.sourceResources) if (resource.path === file.path) resource.blob = file.blob;
  }
  assert.throws(() => validateCoverage(data), /mismatched frozen file manifest/);
});
test('a mirror cannot replace a canonical entry while keeping a similar count', () => {
  const inventory = structuredClone(baseline.inventory);
  const repo = inventory.repositories.find(r => r.id === 'arjun');
  const entry = repo.files.find(f => f.kind === 'entrypoint');
  entry.path = entry.path.replace('.claude/', '.cursor/');
  assert.throws(() => validateInventory(inventory), /classification|canonical entrypoint inventory incomplete|mirror/);
});
console.log(`${passed} Blender coverage checks passed; no semantic, rendered or engine acceptance inferred.`);
