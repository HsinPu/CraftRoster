'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { pathToFileURL } = require('node:url');
const { buildBundle } = require('../scripts/prepare-skill-pilot');
const { createBroker } = require('../scripts/lib/skill-eval-broker');
const root = path.resolve(__dirname, '../skills/threejs-development/evals/fixtures/renderer-feature-baseline');
const read = p => JSON.parse(fs.readFileSync(path.join(root, p)));
const hash = b => crypto.createHash('sha256').update(b).digest('hex');
function snapshot() { return fs.readdirSync(root, { recursive: true, withFileTypes: true }).filter(e => e.isFile()).map(e => { const f = path.join(e.parentPath, e.name); return [path.relative(root, f).replaceAll('\\', '/'), hash(fs.readFileSync(f))]; }).sort(); }
const before = snapshot();
let passed = 0;
function test(name, fn) { fn(); passed++; console.log(`PASS ${name}`); }
async function main() {
  const { expectedPixel, comparePixel, boundedSize } = await import(pathToFileURL(path.join(root, 'src/pixel-contract.js')).href);
  test('linear byte comparisons tolerate only quantization, retaining post RGB and alpha semantics', () => {
    assert.deepEqual(expectedPixel(), [64, 128, 191, 255]);
    assert.deepEqual(expectedPixel(true), [191, 128, 64, 255]);
    assert(comparePixel(new Uint8Array([64, 127, 191, 255])));
    assert(comparePixel(new Uint8Array([191, 128, 64, 255]), true));
    assert(!comparePixel(new Uint8Array([137, 188, 225, 255]))); // Encoded display bytes are not linear data.
    assert(!comparePixel(new Uint8Array([64, 128, 191, 0])));
    assert(!comparePixel(new Uint8Array([64, 128, 191])));
    assert(!comparePixel(new Uint16Array([64, 128, 191, 255])));
    assert(!comparePixel(new Uint8Array(expectedPixel()), true));
  });
  test('display sizes clamp DPR and dimensions and reject invalid allocation requests', () => {
    assert.deepEqual(boundedSize(375, 240, 3), { width: 750, height: 480 });
    assert.deepEqual(boundedSize(10000, 10000, 4), { width: 1024, height: 1024 });
    assert.deepEqual(boundedSize(0.1, 0.1, 0.1), { width: 1, height: 1 });
    for (const args of [[0, 240, 1], [-1, 240, 1], [Infinity, 240, 1], [200, NaN, 1], [200, 200, 0]]) assert.throws(() => boundedSize(...args), /Invalid display size/);
  });
  test('dependency, observed version and target requirements agree without inventing compatibility results', () => {
    const pkg = read('package.json'), lock = read('package-lock.json'), evidence = read('dependency-evidence.json'), contract = read('contracts/requirements.json');
    assert.equal(pkg.dependencies.three, '0.180.0');
    assert.equal(lock.packages[''].dependencies.three, pkg.dependencies.three);
    assert.equal(lock.packages['node_modules/three'].version, pkg.dependencies.three);
    assert.equal(evidence.version, pkg.dependencies.three);
    assert.equal(contract.threeVersion, pkg.dependencies.three);
    assert.equal(lock.packages['node_modules/three'].resolved, 'https://registry.npmjs.org/three/-/three-0.180.0.tgz');
    assert.match(lock.packages['node_modules/three'].integrity, /^sha512-[A-Za-z0-9+/]+=*$/);
    assert(contract.targets.every(item => item.status === 'not_run'));
    assert.equal(contract.performance.approvedGpuBudgetMs, null);
    assert.equal(contract.modelEvaluation, 'not_run');
  });
  test('the declared case packages every input without private test code or installed runtime', () => {
    const bundle = buildBundle({ skill: 'threejs-development', caseId: 5 });
    assert.equal(bundle.privateRecord.fixture_manifest.length, 11);
    assert.deepEqual(bundle.privateRecord.fixture_manifest.map(item => item.path).sort(), before.map(([p]) => p));
    assert.equal(bundle.privateRecord.status, 'not_run');
    assert(!bundle.publicFiles.some(item => /node_modules\/|dist\/|skill-three-renderer-fixtures/.test(item.path)));
    const broker = createBroker(bundle.publicFiles);
    assert.equal(broker.call(JSON.stringify({ tool: 'read_file', arguments: { path: 'workspace/contracts/requirements.json' } })).ok, true);
    assert.equal(broker.call(JSON.stringify({ tool: 'read_file', arguments: { path: 'private/record.json' } })).ok, false);
    assert.equal(broker.call(JSON.stringify({ tool: 'write_file', arguments: { path: 'workspace/dependency-evidence.json', content: '{}' } })).ok, false);
  });
  test('author verification leaves canonical input unchanged and does not materialize build output', () => {
    assert.deepEqual(snapshot(), before);
    assert(!fs.existsSync(path.join(root, 'dist')));
    assert(!fs.existsSync(path.join(root, 'node_modules')));
  });
  console.log(`${passed} renderer baseline author checks passed; browser, backend parity and GPU performance are not certified by this suite.`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
