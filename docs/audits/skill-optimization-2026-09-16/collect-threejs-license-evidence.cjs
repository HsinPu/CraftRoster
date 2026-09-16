'use strict';
// Author preparation only. Reads three fixed public metadata files; never imports upstream code/assets.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../../..');
const fixture = path.join(root, 'skills/threejs-development/evals/fixtures/pinned-provenance');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const localTextSha = bytes => sha(bytes.toString('utf8').replace(/\r\n/g, '\n'));
const blob = bytes => crypto.createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
async function main() {
  if (process.argv.slice(2).join(' ') !== '--record-primary-evidence') throw Error('Explicit --record-primary-evidence required');
  const manifestBytes = fs.readFileSync(path.join(root, 'scripts/data/skill-reference-sources.json'));
  const source = JSON.parse(manifestBytes).repositories.find(item => item.repo === 'scottstts/Threejs-Awesome-Graphics-Agent-Skills');
  if (source.commit !== 'e43dcb03020cae5b08983a828bc1817dd6c0c40a') throw Error('Reference revision changed; re-audit collector');
  const sourceFiles = ['package.json', 'LICENSE', 'source_materials/THIRD_PARTY_NOTICES.md'];
  const observations = [];
  const texts = {};
  for (const file of sourceFiles) {
    const url = `https://raw.githubusercontent.com/${source.repo}/${source.commit}/${file}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(20000), redirect: 'error' });
    if (response.status !== 200) throw Error(`Metadata fetch failed: ${file} ${response.status}`);
    const parts = []; let size = 0;
    for await (const chunk of response.body) {
      size += chunk.length;
      if (size > 256 * 1024) throw Error('Metadata response exceeds bound');
      parts.push(chunk);
    }
    const bytes = Buffer.concat(parts);
    texts[file] = bytes.toString('utf8');
    observations.push({ path: file, url, status: response.status, bytes: bytes.length, sha256: sha(bytes), git_blob: blob(bytes) });
  }
  const pkg = JSON.parse(texts['package.json']);
  const notices = texts['source_materials/THIRD_PARTY_NOTICES.md'];
  if (pkg.version !== '0.4.4' || pkg.license !== 'MIT AND GPL-3.0-only') throw Error('Unexpected package declaration');
  if (observations[1].git_blob !== source.licenseEvidence.blob) throw Error('Root license blob does not match pinned manifest');
  const section = name => notices.split(`## ${name}\n`)[1]?.split('\n## ')[0] || '';
  const gpl = section('Faraz-Portfolio/demo-2023-rain-puddle');
  const gist = section('momentchan/r3f-gist');
  const rain = section('rocksdanister/rain');
  if (!gpl.includes('- License: GPL-3.0') || !gist.includes('no license observed') || !rain.includes('no license observed')) throw Error('Expected notice declarations absent');
  for (const file of ['skills/threejs-precipitation-surfaces/examples/wet-puddle-rain/', 'skills/threejs-precipitation-surfaces/assets/wet-puddle-rain/Splash.png', 'skills/threejs-precipitation-surfaces/assets/wet-puddle-rain/road/']) {
    if (!gpl.includes('`' + file + '`')) throw Error('Expected GPL path declaration absent');
  }
  if (!gist.includes('`skills/threejs-procedural-vegetation/examples/gpu-computed-grass/`') || !rain.includes('`skills/threejs-temporal-surfaces/examples/refractive-window-rain/`')) throw Error('Expected unlicensed-source path declaration absent');
  const evidence = {
    schema_version: 1, kind: 'selected_primary_metadata_observations', observed_at: new Date().toISOString(),
    repository: source.repo, revision: source.commit, tree_from_local_manifest: source.tree,
    source_files: observations,
    declarations: {
      root_license: 'MIT', root_license_git_blob_verified: true,
      package_name: pkg.name, package_version: pkg.version, package_license: pkg.license,
      package_published_paths: pkg.files,
      selected_notices: [
        { source: 'Faraz-Portfolio/demo-2023-rain-puddle', declared_license: 'GPL-3.0', paths: ['skills/threejs-precipitation-surfaces/examples/wet-puddle-rain/', 'skills/threejs-precipitation-surfaces/assets/wet-puddle-rain/Splash.png', 'skills/threejs-precipitation-surfaces/assets/wet-puddle-rain/road/'] },
        { source: 'momentchan/r3f-gist', observed_upstream_license: null, publisher_treatment: 'MIT by project rule', paths: ['skills/threejs-procedural-vegetation/examples/gpu-computed-grass/'] },
        { source: 'rocksdanister/rain', observed_upstream_license: null, publisher_treatment: 'MIT by project rule', paths: ['skills/threejs-temporal-surfaces/examples/refractive-window-rain/'] }
      ]
    },
    limits: ['Selected declarations, not a complete upstream tree or path-level clearance.', 'Underlying third-party repositories were not independently fetched in this observation.', 'No source, example, texture, model, LUT, installer or vendor file was imported.', 'This metadata check does not execute the separate remote integrity or originality audit.']
  };
  const policyPath = 'docs/threejs-skill-sources.md';
  const policy = {
    schema_version: 1, kind: 'existing_repository_reference_policy',
    local_source_digest_algorithm: 'sha256-utf8-lf',
    sources: [{ path: 'scripts/data/skill-reference-sources.json', sha256: localTextSha(manifestBytes) }, { path: policyPath, sha256: localTextSha(fs.readFileSync(path.join(root, policyPath))) }],
    repository: source.repo, revision: source.commit, tree: source.tree,
    root_license_evidence: source.licenseEvidence,
    canonical_author: 'HsinPu', canonical_source: 'HsinPu/CraftRoster', canonical_license: 'Apache-2.0',
    reference_mode: 'first-party adaptation, no upstream redistribution',
    reference_paths: Object.entries(source.skills).map(([local_skill, [entry]]) => ({ local_skill, path: entry.path, git_blob: entry.blob })),
    excluded_material: ['examples', 'assets', 'vendor source', 'binary lookup tables', 'models', 'textures', 'installers', 'source_materials'],
    future_import_condition: 'Path-level evidence, compatibility review and a new audit; root metadata alone is insufficient.',
    current_remote_originality_result: { status: 'not_run', observed_at: null }
  };
  fs.mkdirSync(fixture, { recursive: true });
  fs.writeFileSync(path.join(fixture, 'upstream-evidence.json'), JSON.stringify(evidence, null, 2) + '\n');
  fs.writeFileSync(path.join(fixture, 'existing-policy.json'), JSON.stringify(policy, null, 2) + '\n');
  console.log(JSON.stringify({ metadata_files: observations.length, reference_paths: policy.reference_paths.length, observed_at: evidence.observed_at, model_calls: 0 }));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
