'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const MAX_ARTIFACT_BYTES = 4 * 1024 * 1024;
const sha256 = text => crypto.createHash('sha256').update(text).digest('hex');
const readText = file => fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
function readInputs(root, variant) {
  if (!['base', 'head'].includes(variant)) throw new Error('Unknown fixture variant');
  const manifestText = readText(path.join(root, variant, 'package.fixture.json'));
  const registryText = readText(path.join(root, 'registry/index.json'));
  const seedText = readText(path.join(root, 'registry/depot-seed.json'));
  const manifest = JSON.parse(manifestText), registry = JSON.parse(registryText), seed = JSON.parse(seedText);
  if (manifest.format !== 'offline-depot-manifest-v1' || manifest.application !== 'synthetic-depot-browser' ||
      manifest.dependency?.name !== 'depot-catalog' || !['1.4.1', '1.4.2'].includes(manifest.dependency.version)) throw new Error('Unsupported exact package selection');
  if (registry.format !== 'offline-depot-registry-v1') throw new Error('Unsupported registry format');
  const release = registry.releases.find(item => item.version === manifest.dependency.version);
  if (!release || registry.releases.filter(item => item.version === release.version).length !== 1) throw new Error('Missing or duplicate exact release');
  const expectedSource = `registry/sources/depot-catalog-${release.version}.cjs`;
  if (release.source !== expectedSource || release.apiVersion !== 1 || !/^[0-9a-f]{64}$/.test(release.sha256)) throw new Error('Unsupported package source contract');
  const source = readText(path.join(root, expectedSource));
  if (sha256(source) !== release.sha256) throw new Error('Package source digest mismatch');
  if (seed.format !== 'synthetic-depot-series-v1' || seed.first !== 1 || seed.count !== 9999 || seed.digits !== 4 ||
      seed.idPrefix !== 'D' || seed.labelPrefix !== 'Synthetic depot ' || seed.capacityBase !== 250 || seed.capacityPeriod !== 751 || seed.packageVersion !== '1.0.0') throw new Error('Unsupported synthetic data series');
  return { manifest, release, seed, graph: `depot-catalog@${release.version}`,
    inputsSha256: sha256(JSON.stringify([manifestText, registryText, seedText, source])) };
}
function depotRecord(seed, index) {
  const suffix = String(index).padStart(seed.digits, '0');
  return { depotId: `${seed.idPrefix}${suffix}`, label: `${seed.labelPrefix}${suffix}`, capacity: seed.capacityBase + (index % seed.capacityPeriod) };
}
function buildArtifact(inputs) {
  const { graph, release, seed, inputsSha256 } = inputs;
  const lines = [
    JSON.stringify({ type: 'header', format: 'offline-depot-graph-v1', graph, inputsSha256 }),
    JSON.stringify({ type: 'adapter', id: graph, version: release.version, source: release.source, sha256: release.sha256, apiVersion: release.apiVersion })
  ];
  for (let index = seed.first; index < seed.first + seed.count; index += 1) {
    const record = depotRecord(seed, index), suffix = String(index).padStart(seed.digits, '0');
    lines.push(JSON.stringify({ type: 'depot', id: `${graph}/depot-${suffix}`, version: seed.packageVersion, ...record, sha256: sha256(JSON.stringify(record)) }));
  }
  for (let index = seed.first; index < seed.first + seed.count; index += 1) {
    lines.push(JSON.stringify({ type: 'requires', from: graph, to: `${graph}/depot-${String(index).padStart(seed.digits, '0')}` }));
  }
  const artifact = `${lines.join('\n')}\n`;
  if (Buffer.byteLength(artifact, 'utf8') > MAX_ARTIFACT_BYTES) throw new Error('Artifact exceeds fixture single-file limit');
  return artifact;
}
function verifyArtifact(root, variant) {
  const expected = buildArtifact(readInputs(root, variant));
  const actual = readText(path.join(root, variant, 'dependency-graph.jsonl'));
  if (actual !== expected) throw new Error(`Derived artifact drift for ${variant}`);
  return { variant, lines: actual.trimEnd().split('\n').length, bytes: Buffer.byteLength(actual, 'utf8'), sha256: sha256(actual) };
}
module.exports = { MAX_ARTIFACT_BYTES, sha256, readText, readInputs, depotRecord, buildArtifact, verifyArtifact };
if (require.main === module) {
  const mode = process.argv[2];
  if (process.argv.length !== 3 || !['--check', '--write'].includes(mode)) throw new Error('Use --check or --write for this fixed fixture');
  const root = path.resolve(__dirname, '..');
  for (const variant of ['base', 'head']) {
    if (mode === '--write') fs.writeFileSync(path.join(root, variant, 'dependency-graph.jsonl'), buildArtifact(readInputs(root, variant)));
    console.log(JSON.stringify(verifyArtifact(root, variant)));
  }
}
