'use strict';

// This validates provenance and declared coverage relationships. It does not judge
// instruction quality, execute Blender, inspect images, or certify engine behavior.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { validateDependencies, validateRoutes } = require('./lib/skill-dependencies');

const SNAPSHOTS = {
  el4: { repo: 'EL4CTEO/blender-skills', commit: 'fb92cfb4cc5a238c22113a6a230b09f535bd0656', tree: '9b0d2fc9a2f4063c915e34c17d1136cfb08259e8', files: 117, entries: 28, manifestSha256: 'b6637662214377aa0f81ae07bcf55cb8445454d60fd95401b40577f8a2df6cb5' },
  arjun: { repo: 'arjun988/blender-skills', commit: '8f778d2405a214b508d4c7d80742be8e43acdd52', tree: 'fba306faa1425961eabe1af4199001a04d3a8e25', files: 271, entries: 94, manifestSha256: '6f060a2c640dbd5b458aadcd6b3b8b9486b106de8163c085e1136855844a31c3' }
};
const RETAINED = new Set(['blender-materials-uv', 'blender-reference-modeling', 'blender-rigging-animation', 'blender-visual-review']);
const NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const BLOB = /^[a-f0-9]{40}$/;
const fail = message => { throw new Error(`Blender coverage: ${message}`); };
function requireThat(condition, message) { if (!condition) fail(message); }
function text(value, label) { requireThat(typeof value === 'string' && value.trim() && !/[\x00-\x1f]/.test(value), `${label} needs nonempty single-line text`); }
function safeRelative(value, label) {
  requireThat(typeof value === 'string' && value && !value.includes('\\') && !/[\x00-\x1f\x7f]/.test(value)
    && !path.posix.isAbsolute(value) && !/^[A-Za-z]:/.test(value)
    && path.posix.normalize(value) === value && !value.split('/').some(p => p === '.' || p === '..' || !p), `${label}: unsafe path ${value}`);
  return value;
}
function canonicalEntry(alias, file) {
  return alias === 'el4' ? /^skills\/[^/]+\/SKILL\.md$/.test(file) : /^\.claude\/skills\/[^/]+\/SKILL\.md$/.test(file);
}
function classify(alias, file) {
  if (canonicalEntry(alias, file)) return 'entrypoint';
  if (file === 'LICENSE') return 'license';
  if (file === 'README.md') return 'repository-context';
  if (file.startsWith('.claude/skills/references/')) return 'shared-reference';
  if (/\/references\//.test(file)) return 'package-reference';
  if (/\/scripts\//.test(file)) return 'package-script';
  return 'package-resource';
}
function validateInventory(inventory) {
  requireThat(inventory && inventory.schemaVersion === 1 && Array.isArray(inventory.repositories), 'invalid inventory schema');
  requireThat(inventory.repositories.length === 2, 'inventory must retain the two pinned snapshots');
  const repositories = new Map();
  const entries = new Map();
  for (const repo of inventory.repositories) {
    const expected = SNAPSHOTS[repo.id];
    requireThat(expected && !repositories.has(repo.id), `unknown or duplicate inventory repository ${repo.id}`);
    for (const field of ['repo', 'commit', 'tree']) requireThat(repo[field] === expected[field], `${repo.id}: mismatched pinned ${field}`);
    requireThat(repo.license === 'MIT' && Array.isArray(repo.files) && repo.files.length === expected.files, `${repo.id}: incomplete pinned file inventory`);
    const files = new Map();
    for (const file of repo.files) {
      safeRelative(file.path, `${repo.id} source`);
      requireThat(!files.has(file.path), `${repo.id}: duplicate source path ${file.path}`);
      requireThat(BLOB.test(file.blob) && Number.isSafeInteger(file.size) && file.size > 0, `${repo.id}/${file.path}: invalid blob or size`);
      requireThat(file.kind === classify(repo.id, file.path), `${repo.id}/${file.path}: incorrect file classification`);
      files.set(file.path, file);
      if (canonicalEntry(repo.id, file.path)) entries.set(`${repo.id}:${file.path}`, { repository: repo.id, ...file });
    }
    requireThat([...files.values()].filter(f => f.kind === 'entrypoint').length === expected.entries, `${repo.id}: canonical entrypoint inventory incomplete`);
    requireThat(repo.files.every(f => !f.path.startsWith('.cursor/')), `${repo.id}: Cursor mirror must not be counted as canonical`);
    // Anchor the reviewed path/blob/byte-size list independently of coverage.
    // A coordinated edit to both manifests must not rewrite a frozen snapshot.
    const manifest = [...files.values()].sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0)
      .map(f => `${f.path}\0${f.blob}\0${f.size}\n`).join('');
    requireThat(crypto.createHash('sha256').update(manifest).digest('hex') === expected.manifestSha256, `${repo.id}: mismatched frozen file manifest`);
    repositories.set(repo.id, { ...repo, files });
  }
  requireThat(entries.size === 122, 'canonical entrypoint set must contain 122 entries');
  return { repositories, entries };
}
function validateCoverage(options = {}) {
  const root = path.resolve(options.root || path.join(__dirname, '..'));
  const read = p => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
  const inventory = options.inventory || read('scripts/data/blender-upstream-inventory.json');
  const coverage = options.coverage || read('scripts/data/blender-source-coverage.json');
  const catalog = options.catalog || read('scripts/data/skill-catalog.json');
  const bundles = options.bundles || read('scripts/data/install-bundles.json');
  const { repositories, entries } = validateInventory(inventory);
  requireThat(coverage && coverage.schemaVersion === 1 && Array.isArray(coverage.entries) && Array.isArray(coverage.packages), 'invalid coverage schema');
  requireThat(coverage.evidence && coverage.evidence.workflow === 'not_run' && coverage.evidence.visual === 'not_run' && coverage.evidence.targetEngine === 'not_run', 'authored coverage must keep runtime evidence separate and unexecuted');
  validateDependencies(catalog.skills); validateRoutes(catalog.skills);
  const packageNames = new Set(Object.entries(catalog.skills).filter(([, v]) => v.category === 'blender-creation').map(([n]) => n));
  requireThat(packageNames.size === 108, 'catalog must represent the 108-package Blender suite');
  const packageRecords = new Map();
  const seenEntries = new Set();
  const sourceUsers = new Map();
  const realSkills = fs.realpathSync(path.join(root, 'skills'));
  function localResource(resource, consumer, label) {
    requireThat(resource && resource.package === consumer && packageNames.has(consumer), `${label}: unknown or mismatched local package`);
    const relative = safeRelative(resource.path, label);
    const match = relative.match(/^skills\/([a-z0-9-]+)\/(SKILL\.md|references\/.+\.md)$/);
    requireThat(match && packageNames.has(match[1]), `${label}: resource outside intended Skill instructions`);
    const target = match[1];
    requireThat(!relative.endsWith('/upstream-notice.md'), `${label}: attribution alone is not capability support`);
    // A required workflow companion includes its resources too (common export
    // invokes asset validation). Conditional/related availability never suffices.
    if (target !== consumer) requireThat((catalog.skills[consumer].dependencies || []).some(d => d.name === target && d.kind === 'required'), `${label}: undeclared cross-Skill required resource ${consumer} -> ${target}`);
    const full = path.join(root, relative);
    requireThat(fs.existsSync(full) && fs.statSync(full).isFile(), `${label}: missing local resource ${relative}`);
    const resolved = fs.realpathSync(full);
    const targetRoot = fs.realpathSync(path.join(realSkills, target));
    const targetRel = path.relative(realSkills, targetRoot);
    const fileRel = path.relative(targetRoot, resolved);
    requireThat(targetRel && !targetRel.startsWith(`..${path.sep}`) && targetRel !== '..' && !path.isAbsolute(targetRel)
      && fileRel && !fileRel.startsWith(`..${path.sep}`) && fileRel !== '..' && !path.isAbsolute(fileRel), `${label}: resource resolves outside intended Skill`);
  }
  for (const pkg of coverage.packages) {
    requireThat(pkg && NAME.test(pkg.name) && packageNames.has(pkg.name), `unknown local package ${pkg && pkg.name}`);
    requireThat(!packageRecords.has(pkg.name), `duplicate local package ${pkg.name}`);
    requireThat(Array.isArray(pkg.sourceEntries) && Array.isArray(pkg.localResources) && pkg.localResources.length, `${pkg.name}: missing package coverage`);
    requireThat(new Set(pkg.localResources.map(r => r.path)).size === pkg.localResources.length, `${pkg.name}: duplicate supporting resource`);
    pkg.localResources.forEach(r => localResource(r, pkg.name, pkg.name));
    requireThat(pkg.localResources.some(r => r.path === `skills/${pkg.name}/SKILL.md`), `${pkg.name}: entrypoint support is missing`);
    const refs = path.join(root, 'skills', pkg.name, 'references');
    function requireCurrentReferences(directory) {
      if (!fs.existsSync(directory)) return;
      for (const item of fs.readdirSync(directory, { withFileTypes: true })) {
        const full = path.join(directory, item.name);
        if (item.isDirectory()) requireCurrentReferences(full);
        else if (item.name.endsWith('.md') && item.name !== 'upstream-notice.md') {
          const relative = path.relative(root, full).split(path.sep).join('/');
          requireThat(pkg.localResources.some(r => r.path === relative), `${pkg.name}: current instruction resource missing from coverage ${relative}`);
        }
      }
    }
    requireCurrentReferences(refs);
    if (RETAINED.has(pkg.name)) {
      requireThat(pkg.sourceEntries.length === 0 && pkg.retained === true, `${pkg.name}: retained coordinator must be identified separately`);
      text(pkg.retainedReason, `${pkg.name} retained reason`);
    } else requireThat(pkg.sourceEntries.length > 0 && pkg.retained !== true, `${pkg.name}: missing upstream entry mapping`);
    requireThat(new Set(pkg.sourceEntries).size === pkg.sourceEntries.length, `${pkg.name}: duplicate source mapping`);
    packageRecords.set(pkg.name, pkg);
  }
  requireThat(packageRecords.size === packageNames.size, 'coverage package set does not match catalog');
  for (const entry of coverage.entries) {
    requireThat(entry && entries.has(entry.id) && !seenEntries.has(entry.id), `unknown or duplicate coverage entry ${entry && entry.id}`);
    const expected = entries.get(entry.id);
    requireThat(entry.repository === expected.repository && entry.path === expected.path && entry.blob === expected.blob, `${entry.id}: mismatched entry blob or source`);
    seenEntries.add(entry.id);
    requireThat(Array.isArray(entry.mappedPackages) && entry.mappedPackages.length && new Set(entry.mappedPackages).size === entry.mappedPackages.length, `${entry.id}: entry is unmapped or has duplicate packages`);
    for (const pkg of entry.mappedPackages) requireThat(packageRecords.has(pkg) && packageRecords.get(pkg).sourceEntries.includes(entry.id), `${entry.id}: unknown package or asymmetric package mapping ${pkg}`);
    requireThat(Array.isArray(entry.capabilities) && entry.capabilities.length > 0, `${entry.id}: missing concrete capability declaration`);
    const capabilityPackages = new Set();
    for (const capability of entry.capabilities) {
      text(capability.description, `${entry.id} capability`);
      requireThat(entry.mappedPackages.includes(capability.package), `${entry.id}: capability uses unknown package ${capability.package}`);
      requireThat(Array.isArray(capability.localResources) && capability.localResources.length, `${entry.id}: capability lacks local resources`);
      requireThat(capability.localResources.some(r => r.path.startsWith(`skills/${capability.package}/`)), `${entry.id}: capability lacks support in its own package`);
      capability.localResources.forEach(r => localResource(r, capability.package, entry.id));
      if (capability.branchWorkflows !== undefined) {
        requireThat(Array.isArray(capability.branchWorkflows) && capability.branchWorkflows.length > 0, `${entry.id}: invalid declared branch workflows`);
        const branchNames = new Set();
        for (const branch of capability.branchWorkflows) {
          text(branch.name, `${entry.id} branch name`);
          requireThat(!branchNames.has(branch.name), `${entry.id}: duplicate branch workflow`);
          branchNames.add(branch.name);
          // Some authored branches integrate construction, look and correction
          // in one paragraph; do not impose a heading/section quality proxy.
          text(branch.procedure, `${entry.id} branch procedure`);
          localResource(branch.localResource, capability.package, entry.id);
          requireThat(capability.localResources.some(r => r.path === branch.localResource.path), `${entry.id}: branch resource absent from capability support`);
        }
      }
      requireThat(Array.isArray(capability.limitations) && capability.limitations.length, `${entry.id}: capability limits must remain explicit`);
      capability.limitations.forEach(l => text(l, `${entry.id} limitation`));
      capabilityPackages.add(capability.package);
    }
    requireThat(entry.mappedPackages.every(n => capabilityPackages.has(n)), `${entry.id}: mapped package lacks capability declaration`);
    requireThat(Array.isArray(entry.sourceResources) && entry.sourceResources.length, `${entry.id}: missing inspected source resources`);
    const resourcePaths = new Set();
    const repo = repositories.get(entry.repository);
    const prefix = entry.path.slice(0, -'SKILL.md'.length);
    for (const resource of entry.sourceResources) {
      requireThat(resource && !resourcePaths.has(resource.path), `${entry.id}: duplicate source resource`);
      const pinned = repo.files.get(safeRelative(resource.path, entry.id));
      requireThat(pinned && pinned.blob === resource.blob, `${entry.id}: unknown source resource or mismatched blob ${resource.path}`);
      requireThat(resource.path.startsWith(prefix) || pinned.kind === 'shared-reference' || pinned.kind === 'license' || pinned.kind === 'repository-context', `${entry.id}: resource belongs to another source package`);
      resourcePaths.add(resource.path);
      sourceUsers.set(`${entry.repository}:${resource.path}`, true);
    }
    for (const file of repo.files.values()) if (file.path.startsWith(prefix)) requireThat(resourcePaths.has(file.path), `${entry.id}: missing source resource ${file.path}`);
  }
  requireThat(seenEntries.size === entries.size, 'unmapped upstream entrypoint');
  for (const pkg of packageRecords.values()) for (const id of pkg.sourceEntries) requireThat(entries.has(id) && seenEntries.has(id) && coverage.entries.find(e => e.id === id).mappedPackages.includes(pkg.name), `${pkg.name}: unknown or asymmetric source entry ${id}`);
  requireThat(Array.isArray(coverage.repositoryResources), 'repository resource disposition is missing');
  const repositoryDisposition = new Set();
  for (const item of coverage.repositoryResources) {
    const repo = repositories.get(item.repository);
    const file = repo && repo.files.get(item.path);
    requireThat(file && file.blob === item.blob && ['license', 'repository-context', 'shared-reference'].includes(file.kind), 'invalid repository resource disposition');
    const id = `${item.repository}:${item.path}`;
    requireThat(!repositoryDisposition.has(id), `duplicate repository disposition ${id}`);
    repositoryDisposition.add(id); text(item.purpose, `${id} purpose`);
  }
  for (const repo of repositories.values()) for (const file of repo.files.values()) requireThat(sourceUsers.has(`${repo.id}:${file.path}`) || repositoryDisposition.has(`${repo.id}:${file.path}`), `inventory resource lacks coverage or disposition: ${repo.id}:${file.path}`);
  const bundle = bundles.bundles.find(b => b.id === 'game-development');
  requireThat(bundle && bundle.skills.length === 108 && new Set(bundle.skills).size === 108 && bundle.skills.every(n => packageNames.has(n)), 'game-development bundle is not the direct 108-package suite');
  requireThat(bundle.agents.length === 2 && bundle.agents.includes('blender-artist') && bundle.agents.includes('blender-asset-reviewer'), 'game-development must preserve the two existing Blender Agents');
  const foundation = catalog.skills['blender-development'];
  const foundationRoutes = foundation.dependencies || [];
  requireThat(foundationRoutes.length === 107 && foundationRoutes.every(d => d.kind === 'conditional' && packageNames.has(d.name)), 'foundation routing is incomplete or over-eager');
  requireThat(new Set(foundationRoutes.map(d => d.when)).size === 107, 'foundation routes must retain distinct task triggers');
  for (const n of packageNames) if (n !== 'blender-development') requireThat((catalog.skills[n].dependencies || []).some(d => d.name === 'blender-development' && d.kind === 'required' && d.usage === 'resource'), `${n}: missing required foundation resource`);
  requireThat((catalog.skills['blender-export'].dependencies || []).some(d => d.name === 'blender-asset-validation' && d.kind === 'required'), 'common export must preserve validation dependency');
  const closures = {};
  function closure(name) {
    const result = new Set();
    function visit(n) { if (result.has(n)) return; result.add(n); for (const d of catalog.skills[n].dependencies || []) if (d.kind === 'required') visit(d.name); }
    visit(name); return [...result].sort();
  }
  for (const n of packageNames) {
    closures[n] = closure(n);
    requireThat(closures[n].every(x => packageNames.has(x)), `${n}: installation leaks outside Blender suite`);
    if (!['blender-development', 'blender-export', 'blender-unity-export', 'blender-unreal-export', 'blender-godot-export'].includes(n)) requireThat(closures[n].length === 2, `${n}: ordinary specialist must not pull unrelated production packages`);
  }
  requireThat(closures['blender-development'].length === 1, 'foundation must remain standalone');
  requireThat(closures['blender-export'].length === 3, 'common export closure must contain three packages');
  for (const n of ['blender-unity-export', 'blender-unreal-export', 'blender-godot-export']) {
    requireThat((catalog.skills[n].dependencies || []).some(d => d.name === 'blender-export' && d.kind === 'required' && d.usage === 'resource'), `${n}: missing common export resource`);
    requireThat(closures[n].length === 4, `${n}: engine export closure must contain four packages`);
  }
  return { repositories: repositories.size, sourceFiles: [...repositories.values()].reduce((n, r) => n + r.files.size, 0), sourceEntries: seenEntries.size, packages: packageRecords.size, retainedCoordinators: RETAINED.size, capabilityDeclarations: coverage.entries.reduce((n, e) => n + e.capabilities.length, 0), evidence: coverage.evidence, semanticQuality: 'not established by this validator' };
}
if (require.main === module) {
  try { console.log(JSON.stringify(validateCoverage(), null, 2)); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { validateCoverage, validateInventory, classify, canonicalEntry };
