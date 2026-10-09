#!/usr/bin/env node
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { parseAgentText, readAgent, validateAgentSkillDependencies } = require('../scripts/lib/agent-metadata');
const { validateBundleRegistry, buildBundleRows, buildAgentDependencyRows, renderRows } = require('../scripts/lib/install-bundles');
const { run } = require('../scripts/generate-install-bundles');

const root = path.resolve(__dirname, '..');
const temp = fs.mkdtempSync(path.join(fs.realpathSync.native(os.tmpdir()), 'craftroster-bundle-catalog-'));
const copy = (value) => JSON.parse(JSON.stringify(value));
const dependencies = [
  { name: 'need', kind: 'required', reason: 'Required package resource.' },
  { name: 'help', kind: 'recommended', reason: 'Ordinary task guidance.' },
  { name: 'context', kind: 'conditional', when: 'The task uses the specialist format.', reason: 'Specialist format guidance.' },
  { name: 'extra', kind: 'optional', reason: 'Additional output review.' }
];
const agents = { agents: [{ id: 'alpha', skills: dependencies.map((d) => d.name), skillDependencies: dependencies },
  { id: 'beta', skills: [], skillDependencies: [] }] };
const skills = { skills: ['need', 'help', 'context', 'extra', 'unreferenced'].map((name) => ({ name })) };
const registry = { version: 1, bundles: [
  { id: 'images', title: '畫圖', description: 'Image work.', agents: ['alpha'], skills: ['need', 'help', 'context', 'extra'] },
  { id: 'code', title: '程式', description: 'Code work.', agents: ['beta', 'alpha'], skills: ['need', 'unreferenced'] }
] };
let passed = 0;
function test(name, action) { action(); passed += 1; console.log(`PASS ${name}`); }
function write(name, text) { const file = path.join(temp, name); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, text, 'utf8'); }

function definition(id, support) {
  return `---\nid: ${id}\nname: ${id}\nrole: ${id}\ndescription: "A portable fixture: ${id}"\ncategory: fixtures\nauthor: HsinPu\nsource: HsinPu/CraftRoster\nlicense: Apache-2.0\nmodel: inherit\npermission: read-only\n` +
    (support.length ? 'skill-dependencies:\n' + support.map((entry) => `  - name: ${entry.name}\n    kind: ${entry.kind}\n    reason: ${JSON.stringify(entry.reason)}\n${entry.when ? `    when: ${JSON.stringify(entry.when)}\n` : ''}`).join('') : 'skill-dependencies: []\n') +
    'tags:\n  - fixtures\nreference-repo: wshobson/agents\nreference-paths:\n  - plugins/fixtures/agents/fixture.md\nreference-tree: deadb68423a57db5a1ab2afd50102be27df1744c\n---\n\n# Role\nFixture role.\n\n# Task\nRead evidence.\n\n# Constraints\nRemain read-only.\n\n# Output\nReport evidence.\n';
}

try {
  test('structured Agent metadata preserves conditions, quotes, and independent roles', () => {
    write('agents/alpha.md', definition('alpha', dependencies.map((entry) => entry.name === 'help'
      ? { ...entry, reason: 'Guidance: "quoted" # data' } : entry)));
    write('agents/beta.md', definition('beta', []));
    const parsed = readAgent(path.join(temp, 'agents/alpha.md'));
    assert.deepEqual(parsed.fields.skills, ['need', 'help', 'context', 'extra']);
    assert.equal(parsed.skillDependencies[1].reason, 'Guidance: "quoted" # data');
    assert.equal(parsed.skillDependencies[2].when, dependencies[2].when);
    assert.deepEqual(readAgent(path.join(temp, 'agents/beta.md')).skillDependencies, []);
    assert.throws(() => parseAgentText(definition('beta', []).replace('id: beta', 'id: beta\nid: beta')), /duplicate/);
    assert.throws(() => parseAgentText(definition('beta', []).replace('id: beta', '__proto__: bad')), /unsupported mapping key/);
    write('agents/legacy.md', definition('beta', []).replace('skill-dependencies: []', 'skills:\n  - help'));
    assert.throws(() => readAgent(path.join(temp, 'agents/legacy.md')), /not a second skills list/);
  });

  test('Agent relationships reject unknown Skills, duplicate edges, and unclear conditions', () => {
    const known = new Set(skills.skills.map((entry) => entry.name));
    assert.equal(validateAgentSkillDependencies('alpha', dependencies, known).length, 4);
    for (const [mutate, expected] of [
      [(list) => { list[0].name = 'missing'; }, /unknown or invalid/],
      [(list) => { list.push(copy(list[0])); }, /duplicate/],
      [(list) => { delete list[2].when; }, /single-line when/],
      [(list) => { list[0].when = 'Sometimes'; }, /must omit when/],
      [(list) => { list[1].kind = 'related'; }, /invalid.*kind/],
      [(list) => { list[1].reason = 'two\nlines'; }, /single-line reason/],
      [(list) => { list[1].reason = 'hidden\u000bcontrol'; }, /single-line reason/],
      [(list) => { list[2].when = 'hidden\u007fcontrol'; }, /single-line when/],
      [(list) => { list[1].extra = true; }, /unknown.*field/]
    ]) { const list = copy(dependencies); mutate(list); assert.throws(() => validateAgentSkillDependencies('alpha', list, known), expected); }
  });

  test('unified bundles cover unreferenced Skills and permit intentional cross-category sharing', () => {
    const result = validateBundleRegistry(registry, agents, skills);
    assert.equal(result.skills.size, 5);
    const rows = buildBundleRows(registry, agents, skills);
    assert.equal(rows.filter((row) => row.name === 'unreferenced').length, 1);
    assert.equal(rows.filter((row) => row.type === 'agent' && row.name === 'alpha').length, 2);
    assert.equal(rows[0].bundle, 'images');
    assert.match(renderRows(rows, ['bundle', 'title', 'description', 'type', 'name']), /^bundle\ttitle\tdescription\ttype\tname\n/);
  });

  test('bundle validation rejects missing coverage and unsafe or ambiguous memberships', () => {
    for (const [mutate, expected] of [
      [(r) => { r.bundles[1].skills = ['need']; }, /coverage is missing skills: unreferenced/],
      [(r) => { r.bundles[1].agents = ['alpha']; }, /coverage is missing agents: beta/],
      [(r) => { r.bundles[0].skills.push('missing'); }, /unknown skills/],
      [(r) => { r.bundles[0].agents.push('alpha'); }, /duplicate agents/],
      [(r) => { r.bundles[0].id = 'all'; }, /Invalid.*id/],
      [(r) => { r.bundles[0].title = 'two\nlines'; }, /single-line/],
      [(r) => { r.bundles[0].description = ''; }, /single-line/],
      [(r) => { r.bundles[0].skills = []; }, /nonempty array/]
    ]) { const data = copy(registry); mutate(data); assert.throws(() => validateBundleRegistry(data, agents, skills), expected); }
  });

  test('Agent index explicitly covers independent roles and rejects compatibility-list drift', () => {
    const rows = buildAgentDependencyRows(agents, skills);
    assert.deepEqual(rows.find((row) => row.agent === 'beta'), { agent: 'beta', skill: '-', kind: 'none', when: '-', reason: '-' });
    assert.equal(rows.find((row) => row.skill === 'context').when, dependencies[2].when);
    assert.equal(rows.find((row) => row.skill === 'help').kind, 'recommended');
    const changed = copy(agents); changed.agents[0].skills.pop();
    assert.throws(() => buildAgentDependencyRows(changed, skills), /compatibility list/);
  });

  test('generator detects stale output and rejects invalid source before changing either index', () => {
    write('agents.json', JSON.stringify(agents)); write('skills.json', JSON.stringify(skills));
    write('scripts/data/install-bundles.json', JSON.stringify(registry));
    write('README.md', '<!-- INSTALL_BUNDLES_START -->\nplaceholder\n<!-- INSTALL_BUNDLES_END -->\n');
    run(temp);
    assert.doesNotThrow(() => run(temp, true));
    const index = fs.readFileSync(path.join(temp, 'scripts/data/install-bundles.tsv'), 'utf8');
    const relation = fs.readFileSync(path.join(temp, 'scripts/data/install-agent-skill-dependencies.tsv'), 'utf8');
    write('scripts/data/install-bundles.tsv', index + 'bad\n');
    assert.throws(() => run(temp, true), /stale/);
    write('scripts/data/install-bundles.tsv', index);
    const bad = copy(registry); bad.bundles[1].skills = ['need'];
    write('scripts/data/install-bundles.json', JSON.stringify(bad));
    assert.throws(() => run(temp), /coverage/);
    assert.equal(fs.readFileSync(path.join(temp, 'scripts/data/install-bundles.tsv'), 'utf8'), index);
    assert.equal(fs.readFileSync(path.join(temp, 'scripts/data/install-agent-skill-dependencies.tsv'), 'utf8'), relation);
  });

  test('real adapter generation preloads only required support and keeps contextual guidance available', () => {
    write('scripts/generate-agent-adapters.js', fs.readFileSync(path.join(root, 'scripts/generate-agent-adapters.js'), 'utf8'));
    write('scripts/lib/agent-metadata.js', fs.readFileSync(path.join(root, 'scripts/lib/agent-metadata.js'), 'utf8'));
    // Role definitions come from canonical files, with Skill catalog membership checked.
    fs.unlinkSync(path.join(temp, 'agents/legacy.md'));
    const result = spawnSync(process.execPath, [path.join(temp, 'scripts/generate-agent-adapters.js')], { cwd: temp, encoding: 'utf8', windowsHide: true });
    assert(!result.error, `Could not start the adapter generator: ${result.error && result.error.message}`);
    assert.equal(result.status, 0, result.stdout + result.stderr);
    const claude = fs.readFileSync(path.join(temp, 'adapters/claude/alpha.md'), 'utf8');
    assert.match(claude.split('---')[1], /skills:\n  - need/);
    assert.doesNotMatch(claude.split('---')[1], /  - (?:help|context|extra)/);
    assert.match(claude, /context.*conditional.*specialist format/);
    assert.doesNotMatch(fs.readFileSync(path.join(temp, 'adapters/claude/beta.md'), 'utf8').split('---')[1], /skills:/);
    for (const [platform, file] of [['codex', 'alpha.toml'], ['cursor', 'alpha.md'], ['copilot', 'alpha.agent.md'], ['opencode', 'alpha.md']]) {
      assert.match(fs.readFileSync(path.join(temp, 'adapters', platform, file), 'utf8'), /Skill support/);
    }
  });
  test('invalid canonical metadata preserves the last complete adapter output', () => {
    const before = fs.readFileSync(path.join(temp, 'adapters/codex/alpha.toml'), 'utf8');
    write('agents/beta.md', definition('beta', [{ name: 'help', kind: 'conditional', reason: 'Missing condition.' }]));
    const result = spawnSync(process.execPath, [path.join(temp, 'scripts/generate-agent-adapters.js')], { cwd: temp, encoding: 'utf8', windowsHide: true });
    assert(!result.error, `Could not start the adapter generator: ${result.error && result.error.message}`);
    assert.notEqual(result.status, 0);
    assert.match(result.stdout + result.stderr, /single-line when/);
    assert.equal(fs.readFileSync(path.join(temp, 'adapters/codex/alpha.toml'), 'utf8'), before);
    assert(fs.existsSync(path.join(temp, 'adapters/claude/beta.md')));
    write('agents/beta.md', definition('beta', [{ name: 'missing', kind: 'required', reason: 'Unknown Skill.' }]));
    const unknown = spawnSync(process.execPath, [path.join(temp, 'scripts/generate-agent-adapters.js')], { cwd: temp, encoding: 'utf8', windowsHide: true });
    assert(!unknown.error, `Could not start the adapter generator: ${unknown.error && unknown.error.message}`);
    assert.notEqual(unknown.status, 0);
    assert.match(unknown.stdout + unknown.stderr, /unknown or invalid Skill/);
    assert.equal(fs.readFileSync(path.join(temp, 'adapters/codex/alpha.toml'), 'utf8'), before);
  });
  console.log(`Install bundle catalog tests passed: ${passed}`);
} finally {
  const resolved = path.resolve(temp);
  assert.equal(path.dirname(resolved), fs.realpathSync.native(os.tmpdir()));
  assert(path.basename(resolved).startsWith('craftroster-bundle-catalog-'));
  fs.rmSync(resolved, { recursive: true, force: true });
}
