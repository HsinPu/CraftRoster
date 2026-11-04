#!/usr/bin/env node
'use strict';
// Real catalog and isolated installer checks; no Blender/model/visual pass implied.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { readAgent } = require('../scripts/lib/agent-metadata');
const root = path.resolve(__dirname, '..');
const options = { shell: process.platform === 'win32' ? 'powershell' : 'bash' };
for (let i = 2; i < process.argv.length; i++) {
  const flag = process.argv[i];
  if (flag === '--definitions') options.definitions = true;
  else if (['--shell', '--powershell'].includes(flag)) {
    const value = process.argv[++i];
    assert(value && !value.startsWith('--'), `${flag} needs a value`);
    options[flag.slice(2)] = value;
  } else throw new Error(`Unknown argument: ${flag}`);
}
assert(['powershell', 'bash'].includes(options.shell));
assert(!(process.platform === 'win32' && options.shell === 'bash'), 'Use native Linux/macOS for Bash');
const names = ['blender-development', 'blender-modeling', 'blender-reference-modeling',
  'blender-materials-uv', 'blender-rigging-animation', 'blender-lookdev',
  'blender-game-optimization', 'blender-export', 'blender-asset-validation', 'blender-visual-review'].sort();
const roles = ['blender-artist', 'blender-asset-reviewer'].sort();
const json = p => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
const catalog = json('scripts/data/skill-catalog.json').skills;
const bundle = json('scripts/data/install-bundles.json').bundles.find(b => b.id === 'game-development');
let count = 0;
function test(label, action) { action(); count++; console.log(`PASS ${label}`); }
function required(name) { return (catalog[name].dependencies || []).filter(d => d.kind === 'required'); }
function closure(name, seen = new Set()) {
  assert(catalog[name], `Unknown dependency ${name}`);
  if (seen.has(name)) return seen;
  seen.add(name);
  for (const edge of required(name)) closure(edge.name, seen);
  return seen;
}
test('game purpose directly contains exactly ten Blender Skills and two roles', () => {
  assert(bundle);
  assert.deepEqual([...bundle.skills].sort(), names);
  assert.deepEqual([...bundle.agents].sort(), roles);
  for (const name of names) assert.equal(catalog[name].category, 'blender-creation');
});
test('foundation is standalone and specialists install shared resources without expanding every branch', () => {
  assert.deepEqual(required('blender-development'), []);
  for (const name of names.filter(n => n !== 'blender-development')) {
    assert(required(name).some(d => d.name === 'blender-development' && d.usage === 'resource'));
    const expected = [name, 'blender-development'];
    if (name === 'blender-export') expected.push('blender-asset-validation');
    assert.deepEqual([...closure(name)].sort(), expected.sort());
  }
});
test('bundle Agent support stays within Blender and reviewer retains read-only permissions', () => {
  for (const role of roles) {
    const agent = readAgent(path.join(root, 'agents', `${role}.md`));
    assert.equal(agent.fields.permission, role === 'blender-artist' ? 'workspace-write' : 'read-only');
    for (const edge of agent.skillDependencies.filter(d => ['required', 'recommended'].includes(d.kind)))
      for (const name of closure(edge.name)) assert(names.includes(name), `Default support pulls unrelated ${name}`);
  }
  const toml = fs.readFileSync(path.join(root, 'adapters/codex/blender-asset-reviewer.toml'), 'utf8');
  assert.match(toml, /sandbox_mode = "read-only"/);
  const opencode = fs.readFileSync(path.join(root, 'adapters/opencode/blender-asset-reviewer.md'), 'utf8');
  assert.match(opencode, /edit: deny/); assert.match(opencode, /bash: deny/);
});
if (!options.definitions) {
  const parent = fs.realpathSync.native(os.tmpdir());
  const temporary = fs.mkdtempSync(path.join(parent, 'craftroster-blender-series-'));
  const hash = p => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
  function files(dir, rel = '') {
    return fs.readdirSync(path.join(dir, rel), { withFileTypes: true }).flatMap(e => {
      assert(!e.isSymbolicLink());
      const p = path.join(rel, e.name);
      return e.isDirectory() ? files(dir, p) : [p];
    }).sort();
  }
  function snapshot(dir) {
    return files(dir).map(rel => {
      let data = fs.readFileSync(path.join(dir, rel));
      if (rel.endsWith('.json')) {
        const d = JSON.parse(data);
        if (d.component && d.updatedAt) {
          delete d.updatedAt;
          data = Buffer.from(JSON.stringify(Object.fromEntries(Object.entries(d).sort(([a], [b]) => a.localeCompare(b)))));
        }
      }
      return [rel, crypto.createHash('sha256').update(data).digest('hex')];
    });
  }
  const home = path.join(temporary, 'home'); fs.mkdirSync(home);
  const runtimeTemp = path.join(temporary, 'temp'); fs.mkdirSync(runtimeTemp);
  const environment = { ...process.env, HOME: home, USERPROFILE: home, CODEX_HOME: path.join(home, '.codex'),
    XDG_CONFIG_HOME: path.join(home, '.config'), APPDATA: path.join(home, 'AppData/Roaming'),
    LOCALAPPDATA: path.join(home, 'AppData/Local'), TMPDIR: runtimeTemp, TEMP: runtimeTemp, TMP: runtimeTemp,
    POWERSHELL_TELEMETRY_OPTOUT: '1' };
  delete environment.PSModulePath;
  function install(project, type, selection) {
    const ps = options.shell === 'powershell';
    const script = path.join(root, 'scripts', ps ? 'install.ps1' : 'install.sh');
    const args = ps ? ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', script,
      '-SourceDir', root, '-Target', 'project', '-ProjectPlatform', 'codex', '-InstallDir', project,
      '-Type', type, type === 'skill' ? '-Name' : '-Bundle', selection]
      : [script, '--source-dir', root, '--target', 'project', '--project-platform', 'codex', '--dir', project,
        '--type', type, type === 'skill' ? '--name' : '--bundle', selection];
    const result = spawnSync(ps ? options.powershell || 'powershell.exe' : 'bash', args,
      { cwd: root, env: environment, encoding: 'utf8', windowsHide: true, timeout: 600000, maxBuffer: 8 * 1024 * 1024 });
    assert.ifError(result.error);
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  }
  function matches(name, destination) {
    const source = path.join(root, 'skills', name);
    for (const rel of files(source))
      assert.equal(hash(path.join(destination, name, rel)), hash(path.join(source, rel)), `${name}/${rel}`);
  }
  try {
    for (const name of ['blender-development', 'blender-modeling', 'blender-export', 'blender-visual-review'])
      test(`${options.shell}: isolated ${name} installs exactly its resource closure`, () => {
        const project = path.join(temporary, name); install(project, 'skill', name);
        const dest = path.join(project, '.agents/skills');
        const expected = [...closure(name)].sort();
        assert.deepEqual(fs.readdirSync(dest).sort(), expected);
        for (const member of expected) matches(member, dest);
        assert(!fs.existsSync(path.join(project, '.codex/agents')));
      });
    test(`${options.shell}: game bundle installs complete payloads and updates idempotently`, () => {
      const project = path.join(temporary, 'bundle'); fs.mkdirSync(project);
      fs.writeFileSync(path.join(project, 'user.txt'), 'keep');
      install(project, 'bundle', 'game-development');
      const dest = path.join(project, '.agents/skills');
      assert.deepEqual(fs.readdirSync(dest).sort(), names);
      for (const name of names) matches(name, dest);
      const agentDir = path.join(project, '.codex/agents');
      assert.deepEqual(fs.readdirSync(agentDir).filter(n => n.endsWith('.toml')).sort(), roles.map(n => `${n}.toml`));
      for (const role of roles) assert.equal(hash(path.join(agentDir, `${role}.toml`)), hash(path.join(root, 'adapters/codex', `${role}.toml`)));
      const before = snapshot(project); install(project, 'bundle', 'game-development');
      assert.deepEqual(snapshot(project), before);
      assert.equal(fs.readFileSync(path.join(project, 'user.txt'), 'utf8'), 'keep');
      assert(!fs.existsSync(path.join(home, '.codex')));
      assert(!fs.existsSync(path.join(home, '.agents')));
    });
  } finally {
    assert.equal(path.dirname(temporary), parent);
    assert(path.basename(temporary).startsWith('craftroster-blender-series-'));
    assert(!fs.lstatSync(temporary).isSymbolicLink());
    fs.rmSync(temporary, { recursive: true, force: true });
  }
}
console.log(`Blender series checks passed (${count}); installer/catalog checks only.`);
