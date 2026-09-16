'use strict';
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { createBroker, gradeArtifacts } = require('../scripts/lib/skill-eval-broker');
const { buildBundle } = require('../scripts/prepare-skill-pilot');
const fixture = path.resolve(__dirname, '../skills/threejs-development/evals/fixtures/unrelated-footer');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'craftroster-footer-fixtures-'));
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
function files(root, relative = '') {
  return fs.readdirSync(path.join(root, relative), { withFileTypes: true }).sort((a, b) => a.name < b.name ? -1 : 1).flatMap(entry => {
    assert(!entry.isSymbolicLink());
    const file = relative + entry.name;
    return entry.isDirectory() ? files(root, file + '/') : [{ path: file, bytes: fs.readFileSync(path.join(root, file)) }];
  });
}
const baseline = files(fixture);
const source = file => baseline.find(item => item.path === file).bytes.toString('utf8');
let passed = 0;
function test(name, fn) { fn(); passed++; console.log(`PASS ${name}`); }
function request(broker, tool, args) { return broker.call(JSON.stringify({ tool, arguments: args })); }
try {
  test('the real viewer dependency and lock agree on exact version and immutable integrity', () => {
    const pkg = JSON.parse(source('package.json')), lock = JSON.parse(source('package-lock.json'));
    assert.equal(pkg.dependencies.three, '0.180.0');
    assert.equal(lock.packages[''].dependencies.three, pkg.dependencies.three);
    assert.equal(lock.packages['node_modules/three'].version, pkg.dependencies.three);
    assert.match(lock.packages['node_modules/three'].integrity, /^sha512-[A-Za-z0-9+/]+={0,2}$/);
    assert.equal(lock.packages['node_modules/three'].resolved, 'https://registry.npmjs.org/three/-/three-0.180.0.tgz');
    assert(source('index.html').includes('./node_modules/three/build/three.module.js'));
    assert(source('src/viewer.js').includes("from 'three'"));
    assert(!baseline.some(file => file.path.startsWith('node_modules/')));
  });
  test('declared fixture prepares all nine public files and isolates them from private tests', () => {
    const bundle = buildBundle({ skill: 'threejs-development', caseId: 12 });
    assert.equal(bundle.privateRecord.fixture_manifest.length, baseline.length);
    assert.equal(baseline.length, 9);
    for (const file of baseline) assert.equal(bundle.publicFiles.find(item => item.path === `workspace/${file.path}`).bytes.compare(file.bytes), 0);
    assert(!bundle.publicFiles.some(file => file.path.includes('skill-footer-fixtures.test.js')));
    assert.equal(bundle.privateRecord.status, 'not_run');
  });
  test('an authored footer edit changes only its fragment and stylesheet in an isolated copy', () => {
    const candidate = path.join(temp, 'candidate'); fs.cpSync(fixture, candidate, { recursive: true });
    const before = source('index.html');
    const after = before.replace('>聯絡我們</a>', '>聯絡支援</a>');
    assert.notEqual(after, before);
    fs.writeFileSync(path.join(candidate, 'index.html'), after);
    const css = source('styles/footer.css').replace('gap: 8px;', 'gap: 16px;').replace('padding: 12px 24px;', 'padding: 24px 24px;');
    fs.writeFileSync(path.join(candidate, 'styles/footer.css'), css);
    const withoutFooter = text => text.replace(/<footer\b[^>]*>[\s\S]*?<\/footer>/, '<footer>');
    assert.equal(withoutFooter(before), withoutFooter(after));
    assert(after.includes('href="mailto:support@example.invalid">聯絡支援</a>'));
    assert(after.includes('href="privacy.html">隱私說明</a>'));
    const changed = files(candidate).filter(file => !file.bytes.equals(baseline.find(old => old.path === file.path).bytes)).map(file => file.path);
    assert.deepEqual(changed, ['index.html', 'styles/footer.css']);
    // Computed layout and WebGL are separately observed in a real browser; this check proves scope only.
  });
  test('case-scoped file grants deny scene, dependency, overlay and input source writes', () => {
    const broker = createBroker(baseline.map(file => ({ path: `workspace/${file.path}`, bytes: file.bytes })),
      { writable_paths: ['workspace/index.html', 'workspace/styles/footer.css'] });
    for (const file of ['src/viewer.js', 'styles/viewer.css', 'styles/page.css', 'package.json', 'package-lock.json']) {
      assert.equal(request(broker, 'write_file', { path: `workspace/${file}`, content: 'unauthorized' }).reason, 'write_not_granted');
    }
    assert.equal(gradeArtifacts(broker, [{ id: 'scene', type: 'file_unchanged', path: 'workspace/src/viewer.js' }]).status, 'passed');
    assert.equal(broker.inspect().trace.filter(event => event.decision === 'denied').length, 5);
  });
  test('a changed viewer fails preservation grading even when footer artifacts look correct', () => {
    const broker = createBroker(baseline.map(file => ({ path: `workspace/${file.path}`, bytes: file.bytes })), { writable_roots: ['workspace/'] });
    request(broker, 'write_file', { path: 'workspace/src/viewer.js', content: '// renderer removed' });
    assert.equal(gradeArtifacts(broker, [{ id: 'scene', type: 'file_unchanged', path: 'workspace/src/viewer.js' }]).status, 'failed');
  });
  test('normal author checks leave every canonical fixture byte unchanged', () => {
    assert.deepEqual(files(fixture).map(file => [file.path, digest(file.bytes)]), baseline.map(file => [file.path, digest(file.bytes)]));
  });
  console.log(`${passed} footer author-fixture checks passed; no model, browser, or GPU result claimed by this suite.`);
} finally {
  const resolved = path.resolve(temp);
  if (path.dirname(resolved) !== path.resolve(os.tmpdir()) || !path.basename(resolved).startsWith('craftroster-footer-fixtures-')) throw new Error('Unsafe cleanup');
  fs.rmSync(resolved, { recursive: true, force: true });
}
