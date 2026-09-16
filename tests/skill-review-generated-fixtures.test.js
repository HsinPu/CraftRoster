'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');

// Executes only fixed repository-authored source and explicit author mutations.
// No model, network, npm, Git, child process or persistent evidence record runs.
assert.equal(process.argv.length, 2, 'This author test has no record mode');
const root = path.resolve(__dirname, '../skills/code-review/evals/fixtures/generated-dependency-review');
const generator = require(path.join(root, 'tools/generate-artifact.cjs'));
const { loadCatalog } = require(path.join(root, 'shared/src/catalog-client.cjs'));
const { runPackageChecks } = require(path.join(root, 'shared/test/package.test.cjs'));
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'craftroster-generated-review-'));
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const writeJson = (file, value) => fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
let passed = 0;
let counter = 0;
const observations = { kind: 'author_fixture_checks', modelExecution: false, node: process.version, platform: process.platform, artifacts: [], ordinaryPackageTests: [] };
function test(name, fn) { fn(); passed += 1; console.log(`PASS ${name}`); }
function inventory(directory, prefix = '') {
  return fs.readdirSync(path.join(directory, prefix), { withFileTypes: true }).sort((a, b) => a.name < b.name ? -1 : 1).flatMap(entry => {
    assert.equal(entry.isSymbolicLink(), false);
    const file = `${prefix}${entry.name}`;
    return entry.isDirectory() ? inventory(directory, `${file}/`) : [{ path: file, bytes: fs.readFileSync(path.join(directory, file)) }];
  });
}
const original = inventory(root).map(file => [file.path, hash(file.bytes)]);
function isolatedCopy() {
  const destination = path.join(temp, `case-${++counter}`);
  assert.equal(fs.existsSync(destination), false);
  fs.cpSync(root, destination, { recursive: true });
  return destination;
}
function regenerate(directory, variant = 'head') {
  fs.writeFileSync(path.join(directory, variant, 'dependency-graph.jsonl'), generator.buildArtifact(generator.readInputs(directory, variant)));
}
function readRows(directory, variant = 'head') {
  return generator.readText(path.join(directory, variant, 'dependency-graph.jsonl')).trimEnd().split('\n').map(line => JSON.parse(line));
}
function writeRows(directory, rows, variant = 'head') {
  fs.writeFileSync(path.join(directory, variant, 'dependency-graph.jsonl'), `${rows.map(row => JSON.stringify(row)).join('\n')}\n`);
}
function assertConsumerContract(catalog) {
  const listed = catalog.listDepots();
  assert.equal(listed.length, 9999);
  for (let index = 1; index <= listed.length; index += 1) {
    const suffix = String(index).padStart(4, '0');
    assert.deepEqual(listed[index - 1], { depotId: `D${suffix}`, label: `Synthetic depot ${suffix}`, capacity: 250 + (index % 751) }, 'Canonical depot data contract');
  }
  for (const index of [1, 2, 750, 751, 752, 4999, 9998, 9999]) {
    const id = `D${String(index).padStart(4, '0')}`, capacity = 250 + (index % 751);
    assert.deepEqual(catalog.getDepot(id), listed[index - 1], 'Lookup capacity contract');
    assert.equal(catalog.canReserve(id, capacity), true, 'Full-capacity reservation must remain eligible');
    assert.equal(catalog.canReserve(id, capacity + 1), false);
    const copy = catalog.getDepot(id); copy.capacity = -1;
    assert.equal(catalog.getDepot(id).capacity, capacity, 'Lookup results must be detached copies');
  }
  listed[0].capacity = -1;
  assert.equal(catalog.getDepot('D0001').capacity, 251, 'List results must be detached copies');
  for (const units of [0, -1, 0.5, '1', NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) assert.equal(catalog.canReserve('D0001', units), false);
  for (const id of ['D0000', 'D10000', 'd0001', '', null]) {
    assert.equal(catalog.getDepot(id), null);
    assert.equal(catalog.canReserve(id, 1), false);
  }
}
try {
  test('the sole manifest change selects a pinned offline patch release with the same advertised API', () => {
    const base = readJson(path.join(root, 'base/package.fixture.json'));
    const head = readJson(path.join(root, 'head/package.fixture.json'));
    assert.equal(base.dependency.version, '1.4.1'); assert.equal(head.dependency.version, '1.4.2');
    base.dependency.version = head.dependency.version;
    assert.deepEqual(base, head);
    const registry = readJson(path.join(root, 'registry/index.json'));
    assert.deepEqual(registry.releases.map(release => release.version), ['1.4.1', '1.4.2']);
    for (const release of registry.releases) {
      assert.equal(release.apiVersion, 1);
      assert.equal(hash(generator.readText(path.join(root, release.source))), release.sha256);
      assert.deepEqual(Object.keys(require(path.join(root, release.source))).sort(), ['getDepot', 'listDepots']);
    }
  });

  test('each actual 20000-line artifact consists only of useful unique packages and their dependency edges', () => {
    for (const variant of ['base', 'head']) {
      const rows = readRows(root, variant), inputs = generator.readInputs(root, variant);
      assert.equal(rows.length, 20000);
      assert.deepEqual(rows.reduce((counts, row) => ({ ...counts, [row.type]: (counts[row.type] || 0) + 1 }), {}),
        { header: 1, adapter: 1, depot: 9999, requires: 9999 });
      const nodes = rows.filter(row => row.type === 'depot'), edges = rows.filter(row => row.type === 'requires');
      assert.equal(new Set(nodes.map(row => row.id)).size, 9999);
      assert.equal(new Set(edges.map(row => row.to)).size, 9999);
      for (let index = 1; index <= 9999; index += 1) {
        const suffix = String(index).padStart(4, '0'), node = nodes[index - 1], edge = edges[index - 1];
        const record = { depotId: `D${suffix}`, label: `Synthetic depot ${suffix}`, capacity: 250 + (index % 751) };
        assert.equal(node.id, `${inputs.graph}/depot-${suffix}`);
        assert.equal(node.version, '1.0.0');
        assert.equal(node.sha256, hash(JSON.stringify(record)));
        assert.deepEqual({ depotId: node.depotId, label: node.label, capacity: node.capacity }, record);
        assert.deepEqual(edge, { type: 'requires', from: inputs.graph, to: node.id });
      }
    }
  });

  test('canonical inputs reproduce both complete artifacts byte for byte and the mechanical IDs explain every changed line', () => {
    for (const variant of ['base', 'head']) {
      const actual = generator.readText(path.join(root, variant, 'dependency-graph.jsonl'));
      assert.equal(generator.buildArtifact(generator.readInputs(root, variant)), actual);
      observations.artifacts.push(generator.verifyArtifact(root, variant));
    }
    const before = readRows(root, 'base'), after = readRows(root, 'head');
    assert.equal(before.filter((row, index) => JSON.stringify(row) !== JSON.stringify(after[index])).length, 20000);
    const payloads = rows => rows.filter(row => row.type === 'depot').map(({ depotId, label, capacity, sha256, version }) => ({ depotId, label, capacity, sha256, version }));
    assert.deepEqual(payloads(before), payloads(after), 'The package identity update must not silently alter depot data');
  });

  test('ordinary package checks actually execute and pass for both base and head', () => {
    for (const variant of ['base', 'head']) {
      const result = runPackageChecks(root, variant);
      assert.deepEqual(result, { checks: 4, variant, status: 'passed' });
      observations.ordinaryPackageTests.push(result);
    }
  });

  test('both fixed release implementations satisfy copied-record, lookup and reservation boundaries', () => {
    const base = loadCatalog(root, 'base'), head = loadCatalog(root, 'head');
    assertConsumerContract(base); assertConsumerContract(head);
    assert.deepEqual(base.listDepots(), head.listDepots());
  });

  test('a correctly repinned but API-breaking dependency still passes smoke checks and fails the real consumer contract', () => {
    const mutant = isolatedCopy(), sourcePath = path.join(mutant, 'registry/sources/depot-catalog-1.4.2.cjs');
    const source = generator.readText(sourcePath);
    const changed = source.replace('return record ? { ...record } : null;', 'return record ? { depotId: record.depotId, label: record.label, slots: record.capacity } : null;');
    assert.notEqual(changed, source);
    fs.writeFileSync(sourcePath, changed);
    const registryPath = path.join(mutant, 'registry/index.json'), registry = readJson(registryPath);
    registry.releases.find(release => release.version === '1.4.2').sha256 = hash(changed);
    writeJson(registryPath, registry); regenerate(mutant);
    assert.equal(generator.verifyArtifact(mutant, 'head').lines, 20000);
    assert.equal(runPackageChecks(mutant, 'head').status, 'passed');
    const consumer = loadCatalog(mutant, 'head');
    assert.equal(consumer.canReserve('D0001', 1), false);
    assert.throws(() => assertConsumerContract(consumer), /Lookup capacity contract/);
  });

  test('source tampering, unknown exact versions and registry path escapes cannot silently resolve', () => {
    const tampered = isolatedCopy();
    fs.appendFileSync(path.join(tampered, 'registry/sources/depot-catalog-1.4.2.cjs'), '// changed after pinning\n');
    assert.throws(() => generator.readInputs(tampered, 'head'), /source digest mismatch/);
    assert.throws(() => loadCatalog(tampered, 'head'), /source digest mismatch/);
    const missing = isolatedCopy(), manifestPath = path.join(missing, 'head/package.fixture.json'), manifest = readJson(manifestPath);
    manifest.dependency.version = '1.4.99'; writeJson(manifestPath, manifest);
    assert.throws(() => generator.readInputs(missing, 'head'), /Unsupported exact package selection/);
    const escaped = isolatedCopy(), registryPath = path.join(escaped, 'registry/index.json'), registry = readJson(registryPath);
    registry.releases[1].source = '../outside.cjs'; writeJson(registryPath, registry);
    assert.throws(() => generator.readInputs(escaped, 'head'), /Unsupported package source contract/);
    assert.throws(() => generator.readInputs(root, '../head'), /Unknown fixture variant/);
  });

  test('semantically altered derived data with a valid local record hash still fails canonical reproduction', () => {
    const mutant = isolatedCopy(), rows = readRows(mutant);
    const node = rows.find(row => row.type === 'depot');
    node.capacity += 17;
    node.sha256 = hash(JSON.stringify({ depotId: node.depotId, label: node.label, capacity: node.capacity }));
    writeRows(mutant, rows);
    assert.equal(runPackageChecks(mutant, 'head').status, 'passed');
    assert.throws(() => generator.verifyArtifact(mutant, 'head'), /Derived artifact drift/);
    assert.throws(() => assertConsumerContract(loadCatalog(mutant, 'head')), /Canonical depot data contract/);
  });

  test('duplicate and unresolved dependency edges are rejected and artifact sizes stay within broker limits', () => {
    const duplicate = isolatedCopy(), duplicateRows = readRows(duplicate), duplicateEdges = duplicateRows.filter(row => row.type === 'requires');
    duplicateEdges[1].to = duplicateEdges[0].to; writeRows(duplicate, duplicateRows);
    assert.throws(() => loadCatalog(duplicate, 'head'), /Invalid dependency edge/);
    const unresolved = isolatedCopy(), unresolvedRows = readRows(unresolved);
    unresolvedRows.find(row => row.type === 'requires').to += '-missing'; writeRows(unresolved, unresolvedRows);
    assert.throws(() => loadCatalog(unresolved, 'head'), /Incomplete dependency closure/);
    const files = inventory(root);
    assert.ok(files.every(file => file.bytes.length <= 4 * 1024 * 1024));
    assert.ok(files.reduce((total, file) => total + file.bytes.length, 0) < 64 * 1024 * 1024);
    const oversized = isolatedCopy();
    fs.writeFileSync(path.join(oversized, 'head/dependency-graph.jsonl'), Buffer.alloc(4 * 1024 * 1024 + 1, 120));
    assert.throws(() => loadCatalog(oversized, 'head'), /Artifact too large/);
  });

  test('author checks leave every canonical input and artifact unchanged without adding public oracle files', () => {
    assert.deepEqual(inventory(root).map(file => [file.path, hash(file.bytes)]), original);
    assert.equal(fs.existsSync(path.join(root, '.git')), false);
    assert.equal(fs.existsSync(path.join(root, 'evidence')), false);
    assert.ok(original.every(([file]) => !file.includes('skill-review-generated-fixtures.test.js')));
  });
  console.log(JSON.stringify(observations));
} finally {
  const resolved = path.resolve(temp);
  if (path.dirname(resolved) !== path.resolve(os.tmpdir()) || !path.basename(resolved).startsWith('craftroster-generated-review-')) throw new Error('Unsafe generated fixture cleanup');
  fs.rmSync(resolved, { recursive: true, force: true });
}
console.log(`${passed} generated-dependency author-fixture checks passed; no model or external service ran.`);
