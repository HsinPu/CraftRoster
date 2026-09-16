'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const zlib = require('node:zlib');
const { spawnSync } = require('node:child_process');

// Private author input checks. This script never drives a browser, executes
// model code, or converts disposal events into claims about GPU allocation.
const canonical = path.resolve(__dirname, '../skills/threejs-development/evals/fixtures/glb-viewer-lifecycle');
const stageBrowser = process.argv.includes('--stage-browser');
const buildRequested = stageBrowser || process.argv.includes('--build');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'craftroster-glb-author-'));
let passed = 0, copies = 0, keepTemp = false, browserStage = null;
const read = (root, file) => fs.readFileSync(path.join(root, file), 'utf8');
const json = (root, file) => JSON.parse(read(root, file));
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
function test(name, fn) { fn(); passed += 1; console.log('PASS ' + name); }
function copy(name) {
  const root = path.join(temp, name || 'fixture-' + ++copies);
  fs.cpSync(canonical, root, { recursive: true, errorOnExist: true });
  return root;
}
function snapshot(root) {
  const result = {};
  function walk(directory, prefix = '') {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      assert.equal(entry.isSymbolicLink(), false);
      const relative = prefix + entry.name;
      if (entry.isDirectory()) walk(path.join(directory, entry.name), relative + '/');
      else result[relative] = hash(fs.readFileSync(path.join(directory, entry.name)));
    }
  }
  walk(root); return result;
}
function arrayBuffer(bytes) { return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength); }
function parseGlb(bytes) {
  assert.equal(bytes.readUInt32LE(0), 0x46546c67); assert.equal(bytes.readUInt32LE(4), 2);
  assert.equal(bytes.readUInt32LE(8), bytes.length); assert.equal(bytes.length % 4, 0);
  const jsonLength = bytes.readUInt32LE(12);
  assert.equal(jsonLength % 4, 0); assert.equal(bytes.readUInt32LE(16), 0x4e4f534a);
  const binaryStart = 20 + jsonLength;
  assert.equal(bytes.readUInt32LE(binaryStart + 4), 0x004e4942);
  const binary = bytes.subarray(binaryStart + 8);
  assert.equal(bytes.readUInt32LE(binaryStart), binary.length);
  return { gltf: JSON.parse(bytes.subarray(20, binaryStart).toString('utf8')), binary };
}
function repair(root) {
  const file = path.join(root, 'src/lifecycle.cjs');
  const before = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  const marker = '  scene.remove(route.group);';
  assert.equal(before.split(marker).length, 2, 'Only the fixed author source may be patched');
  fs.writeFileSync(file, before.replace(marker, marker + '\n  for (const resource of route.ownedResources) {\n    resource.dispose();\n    if (resource.isTexture && typeof resource.source?.data?.close === "function") resource.source.data.close();\n  }'));
}
function node(root, args, timeout = 15000) {
  const result = spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8', timeout, windowsHide: true });
  assert.ifError(result.error); assert.equal(result.signal, null); assert.equal(result.status, 0, result.stderr || result.stdout);
  return result;
}

try {
  const before = snapshot(canonical);
  test('pinned runtime lock and scenario do not claim browser, model or deployed outcomes', () => {
    const root = copy(), manifest = json(root, 'package.json'), lock = json(root, 'package-lock.json');
    assert.deepEqual(manifest.dependencies, { three: '0.180.0' });
    assert.deepEqual(manifest.devDependencies, { esbuild: '0.25.9' });
    assert.deepEqual(lock.packages[''].dependencies, manifest.dependencies);
    assert.deepEqual(lock.packages[''].devDependencies, manifest.devDependencies);
    for (const [name, version] of Object.entries({ ...manifest.dependencies, ...manifest.devDependencies })) assert.equal(lock.packages['node_modules/' + name].version, version);
    for (const [name, pkg] of Object.entries(lock.packages)) if (name) { assert.ok(pkg.resolved.startsWith('https://registry.npmjs.org/')); assert.match(pkg.integrity, /^sha512-/); }
    const scenario = json(root, 'scenario.json');
    assert.equal(scenario.fictional, true); assert.deepEqual(scenario.modelEvaluation, { status: 'not_run', attempts: 0 });
    assert.deepEqual(scenario.browserEvidence, { status: 'not_run' }); assert.deepEqual(scenario.networkServices, []);
    assert.deepEqual(scenario.ownership.absent, ['worker', 'skeleton', 'animation mixer', 'model cache']);
  });
  {
    const root = copy(); require(path.join(root, 'test/assets.test.cjs')).run();
    passed += 1; // The ordinary author check already printed its one PASS line.
  }
  test('authored GLB generator deterministically embeds valid bounded triangle and image buffer views', () => {
    const root = copy(), { makeGlb } = require(path.join(root, 'tools/generate-assets.cjs'));
    assert.deepEqual(makeGlb(), makeGlb());
    const bytes = makeGlb(), { gltf, binary } = parseGlb(bytes);
    assert.equal(gltf.buffers[0].byteLength, binary.length);
    assert.equal(gltf.scenes[0].nodes.length, 1); assert.equal(gltf.meshes.length, 1);
    assert.deepEqual(gltf.meshes[0].primitives[0].attributes, { POSITION: 0, TEXCOORD_0: 1 });
    assert.equal(gltf.accessors[0].count, 3); assert.equal(gltf.accessors[1].count, 3);
    assert.deepEqual(Array.from({ length: 9 }, (_, index) => Number(binary.readFloatLE(index * 4).toFixed(4))), [-0.7, -0.6, 0, 0.7, -0.6, 0, 0, 0.7, 0]);
    for (const view of gltf.bufferViews) assert.ok(view.byteOffset + view.byteLength <= binary.length);
    assert.equal(gltf.images[0].uri, undefined); assert.equal(gltf.buffers[0].uri, undefined);
    assert.ok(bytes.length < 2048);
  });
  test('generated PNG has correct CRCs, dimensions and decoded first-party pixel', () => {
    const root = copy(), { makePng, crc32 } = require(path.join(root, 'tools/generate-assets.cjs'));
    const image = makePng(); assert.deepEqual([...image.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
    let offset = 8; const data = []; const types = [];
    while (offset < image.length) {
      const size = image.readUInt32BE(offset), type = image.subarray(offset + 4, offset + 8).toString();
      const body = image.subarray(offset + 8, offset + 8 + size); types.push(type);
      assert.equal(image.readUInt32BE(offset + 8 + size), crc32(image.subarray(offset + 4, offset + 8 + size)));
      if (type === 'IHDR') { assert.equal(body.readUInt32BE(0), 1); assert.equal(body.readUInt32BE(4), 1); assert.equal(body[8], 8); assert.equal(body[9], 6); }
      if (type === 'IDAT') data.push(body);
      offset += 12 + size;
    }
    assert.equal(offset, image.length); assert.deepEqual(types, ['IHDR', 'IDAT', 'IEND']);
    assert.deepEqual([...zlib.inflateSync(Buffer.concat(data))], [0, 245, 140, 30, 255]);
  });
  test('corrupt input is a tiny invalid embedded PNG, not an allocation or decompression bomb', () => {
    const root = copy(), { makeGlb } = require(path.join(root, 'tools/generate-assets.cjs'));
    const valid = parseGlb(makeGlb()), corrupt = parseGlb(makeGlb(true));
    assert.deepEqual(corrupt.gltf.meshes, valid.gltf.meshes);
    assert.deepEqual(corrupt.binary.subarray(0, 60), valid.binary.subarray(0, 60));
    const image = corrupt.gltf.bufferViews[2];
    assert.equal(image.byteLength, 19);
    assert.equal(corrupt.binary.subarray(image.byteOffset, image.byteOffset + image.byteLength).toString(), 'bounded-invalid-png');
    assert.ok(makeGlb(true).length < 2048);
  });
  test('current envelope validation rejects malformed sizes/types but does not certify embedded images', () => {
    const root = copy(), { makeGlb } = require(path.join(root, 'tools/generate-assets.cjs'));
    const { validateContainer, MAX_BYTES } = require(path.join(root, 'src/asset-policy.cjs'));
    assert.equal(MAX_BYTES, 1024 * 1024);
    assert.throws(() => validateContainer(new ArrayBuffer(MAX_BYTES + 1)), /byte limit/);
    const version = makeGlb(); version.writeUInt32LE(1, 4);
    assert.throws(() => validateContainer(arrayBuffer(version)), /type or version/);
    const length = makeGlb(); length.writeUInt32LE(length.length + 4, 8);
    assert.throws(() => validateContainer(arrayBuffer(length)), /length mismatch/);
    // This acceptance is the current implementation's bounded validation gap,
    // not a passing hostile-texture safety assertion or a decoder execution.
    assert.doesNotThrow(() => validateContainer(arrayBuffer(makeGlb(true))));
  });
  test('source wiring uses actual Three APIs, explicit lifetime ownership and CPU-only labels', () => {
    const root = copy(), source = read(root, 'src/viewer.js');
    assert.match(source, /new THREE\.WebGLRenderer/); assert.match(source, /new GLTFLoader\(manager\)\.parseAsync/);
    assert.match(source, /renderer\.setRenderTarget\(route\.target\)/); assert.match(source, /renderer\.render\(scene, camera\)/);
    assert.match(source, /renderer\.info\.memory\.geometries/); assert.match(source, /renderer\.info\.memory\.textures/);
    assert.match(source, /renderer\.info\.programs\.length/); assert.match(source, /addEventListener\('dispose'/);
    assert.match(source, /new OrbitControls/); assert.match(source, /CPU wall-time, not GPU timer/);
    assert.match(source, /new THREE\.WebGLRenderTarget\(128, 128\)/);
    assert.match(read(root, 'tools/serve.cjs'), /listen\(port, '127\.0\.0\.1'/);
  });
  test('private repair changes only lifecycle source in its temporary copy', () => {
    const root = copy(), snapshotBefore = snapshot(root); repair(root); const snapshotAfter = snapshot(root);
    assert.deepEqual(Object.keys(snapshotBefore).filter(file => snapshotBefore[file] !== snapshotAfter[file]), ['src/lifecycle.cjs']);
    assert.equal(read(canonical, 'src/lifecycle.cjs').includes('resource.dispose()'), false);
  });
  if (buildRequested) {
    test('fresh temp npm ci compiles original and privately repaired real Three viewers', () => {
      const npmCli = process.env.CRAFTROSTER_NPM_CLI || process.env.npm_execpath;
      assert.ok(npmCli && fs.statSync(npmCli).isFile(), 'Set CRAFTROSTER_NPM_CLI to the installed npm CLI .js file');
      const candidate = copy('candidate'), fixed = copy('fixed');
      fs.writeFileSync(path.join(candidate, 'npm-user-config'), 'registry=https://registry.npmjs.org/\n');
      fs.writeFileSync(path.join(candidate, 'npm-global-config'), '');
      const lockBefore = fs.readFileSync(path.join(candidate, 'package-lock.json'));
      node(candidate, [npmCli, 'ci', '--ignore-scripts', '--no-audit', '--no-fund', '--userconfig', './npm-user-config', '--globalconfig', './npm-global-config', '--cache', './npm-cache'], 120000);
      assert.deepEqual(fs.readFileSync(path.join(candidate, 'package-lock.json')), lockBefore);
      assert.equal(json(candidate, 'node_modules/three/package.json').version, '0.180.0');
      fs.cpSync(path.join(candidate, 'node_modules'), path.join(fixed, 'node_modules'), { recursive: true });
      repair(fixed);
      for (const root of [candidate, fixed]) {
        node(root, ['tools/build.cjs']);
        const map = json(root, '.build/app.js.map');
        assert.ok(map.sources.some(file => file.includes('three/') && file.endsWith('GLTFLoader.js')));
        assert.ok(map.sources.some(file => file.includes('three/') && file.endsWith('OrbitControls.js')));
        assert.ok(map.sources.some(file => file.endsWith('src/lifecycle.cjs')));
        const { makeGlb } = require(path.join(root, 'tools/generate-assets.cjs'));
        assert.deepEqual(fs.readFileSync(path.join(root, '.build/assets/triangle.glb')), makeGlb());
        assert.deepEqual(fs.readFileSync(path.join(root, '.build/assets/corrupt-texture.glb')), makeGlb(true));
      }
      browserStage = { candidate, fixed, ports: [4174, 4175], browser: 'not_run', modelEvaluation: 'not_run' };
    });
    test('real Three resource events distinguish removal from disposal and preserve shared ownership', () => {
      const THREE = require(path.join(browserStage.candidate, 'node_modules/three/build/three.cjs'));
      for (const [name, root] of Object.entries({ candidate: browserStage.candidate, fixed: browserStage.fixed })) {
        const scene = new THREE.Scene(), group = new THREE.Group();
        const shared = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
        const texture = new THREE.DataTexture(new Uint8Array([255, 140, 0, 255]), 1, 1);
        const geometry = new THREE.BufferGeometry(), material = new THREE.MeshBasicMaterial({ map: texture });
        const target = new THREE.WebGLRenderTarget(128, 128);
        group.add(new THREE.Mesh(geometry, material)); scene.add(group, shared);
        const disposed = [], sharedDisposed = [];
        for (const [kind, resource] of Object.entries({ geometry, material, texture, target })) resource.addEventListener('dispose', () => disposed.push(kind));
        shared.geometry.addEventListener('dispose', () => sharedDisposed.push('geometry'));
        shared.material.addEventListener('dispose', () => sharedDisposed.push('material'));
        require(path.join(root, 'src/lifecycle.cjs')).releaseRoute({ group, ownedResources: [geometry, material, texture, target] }, scene);
        assert.equal(scene.children.includes(group), false); assert.equal(scene.children.includes(shared), true);
        assert.deepEqual(sharedDisposed, []);
        assert.deepEqual(disposed, name === 'fixed' ? ['geometry', 'material', 'texture', 'target'] : []);
        // These are actual Three event contracts without WebGL allocation; only
        // CUA/browser observations may establish renderer memory stabilization.
        for (const resource of [geometry, material, texture, target, shared.geometry, shared.material]) resource.dispose();
      }
    });
  } else console.log('NOT RUN dependency install/build/resource-event checks; use --build or --stage-browser with CRAFTROSTER_NPM_CLI');
  test('canonical bytes are preserved and no installed or compiled outputs enter public inputs', () => {
    assert.deepEqual(snapshot(canonical), before);
    for (const file of Object.keys(before)) assert.doesNotMatch(file, /(^|\/)(node_modules|\.build|\.git)(\/|$)|\.(glb|tmp)$/);
  });
  if (stageBrowser) { keepTemp = true; console.log(JSON.stringify({ browserStage, retainedTemp: temp, serve: 'node <candidate-or-fixed>/tools/serve.cjs <port>', fixedScope: 'route disposal only; hostile-asset policy and performance optimization are not repaired' })); }
  console.log(JSON.stringify({ authorChecksPassed: passed, build: buildRequested ? 'passed' : 'not_run', actualThreeEventsWithoutWebGL: buildRequested ? 'passed' : 'not_run', browser: 'not_run', modelEvaluation: 'not_run' }));
} catch (error) { console.error(error); process.exitCode = 1; }
finally {
  if (!keepTemp) {
    const resolved = path.resolve(temp);
    assert.equal(path.dirname(resolved), path.resolve(os.tmpdir())); assert.ok(path.basename(resolved).startsWith('craftroster-glb-author-'));
    fs.rmSync(resolved, { recursive: true, force: true });
  }
}
