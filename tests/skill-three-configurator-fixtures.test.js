'use strict';
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const assert = require('node:assert/strict'), crypto = require('node:crypto');
const { pathToFileURL } = require('node:url');
const { spawnSync } = require('node:child_process');
const canonical = path.resolve(__dirname, '../skills/threejs-development/evals/fixtures/legacy-furniture-configurator');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'craftroster-configurator-author-'));
const stage = process.argv.includes('--stage'), buildRequested = stage || process.argv.includes('--build');
let passed = 0, copies = 0, retain = false, staged = null;
const read = (root, file) => fs.readFileSync(path.join(root, file), 'utf8');
const json = (root, file) => JSON.parse(read(root, file));
async function test(name, fn) { await fn(); passed += 1; console.log('PASS ' + name); }
function snapshot(root) {
  const files = {};
  function walk(directory, prefix = '') {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((a,b) => a.name.localeCompare(b.name))) {
      assert.equal(entry.isSymbolicLink(), false);
      const relative = prefix + entry.name;
      if (entry.isDirectory()) walk(path.join(directory, entry.name), relative + '/');
      else files[relative] = crypto.createHash('sha256').update(fs.readFileSync(path.join(directory, entry.name))).digest('hex');
    }
  }
  walk(root); return files;
}
function copy(name = 'fixture-' + ++copies) { const root = path.join(temp, name); fs.cpSync(canonical, root, { recursive: true, errorOnExist: true }); return root; }
const moduleAt = (root, name) => import(pathToFileURL(path.join(root, name)).href);
async function load(root) {
  return { design: await moduleAt(root, 'src/design.js'), model: await moduleAt(root, 'src/model.js'), original: json(root, 'saved-designs/oak-chair.v1.json') };
}
function execute(root, args, timeout = 15000) {
  const result = spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8', timeout, windowsHide: true });
  assert.ifError(result.error); assert.equal(result.signal, null); assert.equal(result.status, 0, result.stderr || result.stdout); return result;
}
function replace(root, name, marker, replacement) {
  const file = path.join(root, name), source = fs.readFileSync(file, 'utf8');
  assert.equal(source.split(marker).length, 2, 'Fixed author regression patch must match once');
  fs.writeFileSync(file, source.replace(marker, replacement));
}

async function main() {
  const before = snapshot(canonical);
  await test('legacy package lock and scene contract retain explicit unfinished capability boundaries', () => {
    const root = copy(), pkg = json(root, 'package.json'), lock = json(root, 'package-lock.json'), contract = json(root, 'contracts/scene-and-capture.json');
    assert.deepEqual(pkg.dependencies, { three: '0.152.2' }); assert.deepEqual(lock.packages[''].dependencies, pkg.dependencies);
    assert.equal(lock.packages['node_modules/three'].version, '0.152.2'); assert.equal(contract.legacyThree, '0.152.2');
    assert.equal(lock.packages['node_modules/three'].resolved, 'https://registry.npmjs.org/three/-/three-0.152.2.tgz');
    assert.match(lock.packages['node_modules/three'].integrity, /^sha512-/);
    assert.equal(contract.modelEvaluation, 'not_run'); assert.equal(contract.browserEvidence, 'not_run'); assert.equal(contract.physicalMobileEvidence, 'not_run');
    assert.equal(contract.raster.frameTimeBudgetMs, null);
    assert.deepEqual(contract.notImplemented, ['Boolean cutout editor','flexible upholstery simulation','path tracing','encoded image/video export with labels and audio','dependency modernization']);
    const palette = json(root, 'assets/materials.json'), schema = json(root, 'contracts/saved-design-v1.schema.json');
    assert.deepEqual(Object.keys(palette.frame), schema.properties.finish.properties.frame.enum);
    assert.deepEqual(Object.keys(palette.upholstery), schema.properties.finish.properties.upholstery.enum);
    assert.equal(json(root, 'assets/audio-cue.json').id, schema.properties.capture.properties.audioCue.const);
  });
  await test('ordinary saved compatibility and invalid samples execute in an isolated copy', async () => {
    const root = copy(); assert.match(await require(path.join(root, 'test/designs.test.cjs')).run(root), /checks passed; no browser execution/);
  });
  await test('change/save/load preserves legacy IDs, camera and capture while rejection leaves prior data intact', async () => {
    const root = copy(), { design, original } = await load(root), prior = JSON.stringify(original);
    let updated = design.changeDesign(original, 'dimensionsMm', 'width', 820);
    updated = design.changeDesign(updated, 'finish', 'frame', 'walnut');
    updated = design.changeDesign(updated, 'capture', 'label', 'Updated chair label');
    const restored = design.loadDesign(design.saveDesign(updated));
    assert.deepEqual(restored, updated); assert.equal(restored.id, original.id); assert.deepEqual(restored.camera, original.camera);
    assert.deepEqual(restored.capture, { ...original.capture, label: 'Updated chair label' });
    assert.equal(restored.dimensionsMm.width, 820); assert.equal(restored.finish.frame, 'walnut');
    assert.throws(() => design.changeDesign(updated, 'dimensionsMm', 'width', 8200), /Invalid width/);
    assert.throws(() => design.loadDesign('{bad json')); assert.equal(JSON.stringify(original), prior);
    assert.equal(updated.dimensionsMm.width, 820);
  });
  await test('runtime ranges agree with the v1 schema and reject semantic time, type and unknown-field changes', async () => {
    const root = copy(), { design, original } = await load(root), schema = json(root, 'contracts/saved-design-v1.schema.json');
    for (const section of ['dimensionsMm','camera']) for (const [key, field] of Object.entries(schema.properties[section].properties)) {
      assert.doesNotThrow(() => design.changeDesign(original, section, key, field.minimum));
      assert.doesNotThrow(() => design.changeDesign(original, section, key, field.maximum));
      assert.throws(() => design.changeDesign(original, section, key, field.minimum - 1));
      assert.throws(() => design.changeDesign(original, section, key, field.maximum + 1));
      assert.throws(() => design.changeDesign(original, section, key, String(field.minimum)));
    }
    assert.throws(() => design.changeDesign(original, 'dimensionsMm', 'width', 700.5));
    assert.throws(() => design.changeDesign(original, 'capture', 'timeSeconds', 4.01), /Invalid time/);
    assert.throws(() => design.changeDesign(original, 'capture', 'seed', 4294967296), /Invalid seed/);
    assert.throws(() => design.validateDesign({ ...original, unrecognized: 'field' }), /document fields/);
    assert.throws(() => design.validateDesign({ ...original, schemaVersion: 2 }), /Unsupported saved design version/);
  });
  await test('v1 text limits count Unicode code points and preserve exact-limit emoji through save/load', async () => {
    const root = copy(), { design, original } = await load(root), schema = json(root, 'contracts/saved-design-v1.schema.json');
    const nameLimit = schema.properties.name.maxLength, labelLimit = schema.properties.capture.properties.label.maxLength;
    const exact = { ...original, name: '\u{1F600}'.repeat(nameLimit), capture: { ...original.capture, label: '\u{1F600}'.repeat(labelLimit) } };
    assert.deepEqual(design.loadDesign(design.saveDesign(exact)), exact);
    assert.throws(() => design.validateDesign({ ...exact, name: '\u{1F600}'.repeat(nameLimit + 1) }), /Invalid name/);
    assert.throws(() => design.changeDesign(exact, 'capture', 'label', '\u{1F600}'.repeat(labelLimit + 1)), /Invalid label/);
    assert.throws(() => design.validateDesign({ ...exact, name: '' }), /Invalid name/);
    assert.throws(() => design.changeDesign(exact, 'capture', 'label', ''), /Invalid label/);
    assert.deepEqual(design.loadDesign(design.saveDesign(exact)), exact);
  });
  await test('furniture parts use millimeter-to-meter dimensions and independent material assignments', async () => {
    const root = copy(), { model, original } = await load(root);
    for (const item of [original, json(root,'saved-designs/wide-chair.v1.json')]) {
      const parts = model.chairParts(item); assert.equal(parts.length, 7); assert.equal(parts.filter(part => part.kind === 'leg').length, 4);
      assert.equal(parts.find(part => part.kind === 'cushion').size[0], item.dimensionsMm.width / 1000);
      assert.equal(parts.find(part => part.kind === 'cushion').size[2], item.dimensionsMm.depth / 1000);
      assert.equal(parts.find(part => part.kind === 'cushion').position[1], item.dimensionsMm.seatHeight / 1000);
      assert.equal(parts.find(part => part.kind === 'back').size[1], item.dimensionsMm.backHeight / 1000);
      assert.equal(parts.filter(part => part.material === 'upholstery').length, 2);
      assert.ok(parts.every(part => part.size.every(value => Number.isFinite(value) && value > 0)));
    }
  });
  await test('explicit seed and time deterministically drive authored pattern and camera pose', async () => {
    const root = copy(), { model, original, design } = await load(root);
    assert.deepEqual(model.patternBytes(17), model.patternBytes(17)); assert.notDeepEqual(model.patternBytes(17), model.patternBytes(42));
    const pixels = model.patternBytes(17); assert.equal(pixels.length, 64);
    for (let i = 0; i < pixels.length; i += 4) { assert.ok(pixels[i] >= 243); assert.equal(pixels[i+3], 255); }
    const start = model.cameraPose(original), middle = model.cameraPose(design.changeDesign(original,'capture','timeSeconds',2));
    const end = model.cameraPose(design.changeDesign(original,'capture','timeSeconds',4));
    assert.notDeepEqual(start, middle); start.forEach((value,index) => assert.ok(Math.abs(value - end[index]) < 1e-9));
    assert.ok(Math.abs(Math.hypot(start[0],start[1]-0.55,start[2]) - original.camera.distanceMeters) < 1e-9);
  });
  await test('mobile raster tier is bounded and follows viewport rather than a narrow desktop canvas', async () => {
    const root = copy(), { model } = await load(root);
    assert.deepEqual(model.rasterSize(350,300,3,'auto',375), { tier:'mobile',width:350,height:300,dpr:1 });
    assert.deepEqual(model.rasterSize(350,300,3,'auto',1280), { tier:'desktop',width:700,height:600,dpr:2 });
    assert.deepEqual(model.rasterSize(5000,5000,4,'mobile',1280), { tier:'mobile',width:768,height:768,dpr:1 });
    assert.deepEqual(model.rasterSize(5000,5000,4,'desktop',375), { tier:'desktop',width:1536,height:1536,dpr:2 });
    for (const args of [[0,300,1], [300,-1,1], [300,300,Infinity], [300,300,1,'pathtrace']]) assert.throws(() => model.rasterSize(...args), /Invalid raster/);
  });
  await test('first-party audio source produces bounded reproducible mono PCM without claiming video export', () => {
    const root = copy(), cue = json(root,'assets/audio-cue.json'), { makeWav } = require(path.join(root,'tools/audio.cjs'));
    const a = makeWav(cue); assert.deepEqual(a, makeWav(cue)); assert.equal(a.length, 8044);
    assert.equal(a.toString('ascii',0,4),'RIFF'); assert.equal(a.readUInt32LE(4)+8,a.length); assert.equal(a.toString('ascii',8,12),'WAVE');
    assert.equal(a.readUInt16LE(20),1); assert.equal(a.readUInt16LE(22),1); assert.equal(a.readUInt32LE(24),16000); assert.equal(a.readUInt16LE(34),16);
    assert.equal(a.readUInt32LE(40),8000); assert.ok(a.subarray(44).some(byte => byte !== 0));
    assert.throws(() => makeWav({ ...cue, seconds:10000 }), /fixed authored tone/);
  });
  await test('ordinary compatibility checks reject private wrong-unit and dropped-capture regressions', async () => {
    const wrongUnits = copy(); replace(wrongUnits,'src/model.js','value / 1000','value / 100');
    await assert.rejects(require(path.join(wrongUnits,'test/designs.test.cjs')).run(wrongUnits), /AssertionError|Expected values/);
    const droppedCapture = copy();
    replace(droppedCapture,'src/design.js','JSON.stringify(validateDesign(value), null, 2)','JSON.stringify({ ...validateDesign(value), capture: undefined }, null, 2)');
    await assert.rejects(require(path.join(droppedCapture,'test/designs.test.cjs')).run(droppedCapture), /Invalid document fields/);
  });
  if (buildRequested) {
    await test('fresh official npm ci stages the legacy raster build and first-party WAV only in temp', () => {
      const npmCli = process.env.CRAFTROSTER_NPM_CLI || process.env.npm_execpath;
      assert.ok(npmCli && fs.statSync(npmCli).isFile(), 'Set CRAFTROSTER_NPM_CLI to the installed npm CLI .js file');
      const root = copy('browser-stage');
      fs.writeFileSync(path.join(root,'npm-user-config'),'registry=https://registry.npmjs.org/\n'); fs.writeFileSync(path.join(root,'npm-global-config'),'');
      const lock = fs.readFileSync(path.join(root,'package-lock.json'));
      execute(root,[npmCli,'ci','--ignore-scripts','--no-audit','--no-fund','--userconfig','./npm-user-config','--globalconfig','./npm-global-config','--cache','./npm-cache'],120000);
      assert.deepEqual(fs.readFileSync(path.join(root,'package-lock.json')),lock); execute(root,['tools/build.cjs']);
      for (const file of ['index.html','style.css','src/app.js','src/design.js','src/model.js','src/renderer.js']) assert.deepEqual(fs.readFileSync(path.join(root,'dist',file)),fs.readFileSync(path.join(root,file)));
      assert.deepEqual(fs.readFileSync(path.join(root,'dist/vendor/three.module.js')),fs.readFileSync(path.join(root,'node_modules/three/build/three.module.js')));
      assert.deepEqual(fs.readFileSync(path.join(root,'dist/vendor/LICENSE')),fs.readFileSync(path.join(root,'node_modules/three/LICENSE')));
      const { makeWav } = require(path.join(root,'tools/audio.cjs'));
      assert.deepEqual(fs.readFileSync(path.join(root,'dist/assets/tone-a.wav')),makeWav(json(root,'assets/audio-cue.json')));
      assert.equal(json(root,'node_modules/three/package.json').version,'0.152.2'); staged = root;
    });
  } else console.log('NOT RUN dependency install/build/browser; opt in with --build or --stage and CRAFTROSTER_NPM_CLI');
  await test('all canonical inputs remain unchanged with no runtime, binary or private-regression leakage', () => {
    assert.deepEqual(snapshot(canonical),before);
    for (const file of Object.keys(before)) assert.doesNotMatch(file, /(^|\/)(node_modules|dist|\.git)(\/|$)|\.(wav|tmp)$/);
  });
  if (stage) { retain = true; console.log(JSON.stringify({ staged, retainedTemp:temp, command:'node tools/serve.cjs 4183', url:'http://127.0.0.1:4183/', browser:'not_run' })); }
  console.log(JSON.stringify({ authorChecksPassed:passed, build:buildRequested?'passed':'not_run', browser:'not_run', modelEvaluation:'not_run', modernization:'not_implemented' }));
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => {
  if (!retain) {
    const resolved = path.resolve(temp); assert.equal(path.dirname(resolved),path.resolve(os.tmpdir())); assert.ok(path.basename(resolved).startsWith('craftroster-configurator-author-'));
    fs.rmSync(resolved,{recursive:true,force:true});
  }
});
