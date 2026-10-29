#!/usr/bin/env node
'use strict';

// Catalog and real-installer regression checks. These do not execute a Skill
// model task, render a native UI, or establish native runtime accessibility.
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { readAgent } = require('../scripts/lib/agent-metadata');

const root = path.resolve(__dirname, '..');
const options = { shell: process.platform === 'win32' ? 'powershell' : 'bash' };
for (let index = 2; index < process.argv.length; index += 1) {
  const flag = process.argv[index];
  if (flag === '--definitions') options.definitions = true;
  else if (['--shell', '--powershell'].includes(flag)) {
    const value = process.argv[++index];
    assert(value && !value.startsWith('--'), `${flag} requires a value`);
    options[flag.slice(2)] = value;
  } else if (flag === '--help') {
    console.log('Usage: node tests/interface-quality.test.js [--definitions] [--shell powershell|bash] [--powershell executable]');
    process.exit(0);
  } else throw new Error(`Unknown option: ${flag}`);
}
assert(['powershell', 'bash'].includes(options.shell), 'Unsupported shell');
assert(!(process.platform === 'win32' && options.shell === 'bash'),
  'Use native Linux/macOS for Bash coverage; Windows coverage uses PowerShell');

// Captured from the real recommended web-interface installation plan before
// introducing ui-improvement (2026-10-29, 49f8aff). Preserve capabilities as a
// subset; legitimate later additions need not change this regression baseline.
const priorWebSkills = `accessibility-testing animation-best-practices browser-automation
chrome-devtools-debugging color-font-skill command-palette css-development dashboard-design
design-consultation design-intelligence-search design-system design-system-patterns figma-to-code
frontend-design frontend-design-review frontend-stack-inference frontend-testing hotkey
i18n-localization image-to-code image-to-code-assets image-utils interaction-patterns
javascript-development legacy-frontend-modernization lobe-icons-usage lobe-ui-development
nextjs-development nuxt-development pinia-state-management react-ui-patterns responsive-design
security-code-review shadcn-ui svg-animation svg-design svg-development svg-optimization
svg-visual-validation systematic-debugging tailwind-development tailwind-patterns taste-skill
typescript-development ui-styling ux-research ux-writing visual-regression-testing vite
vue-composition-api vue-development vue-router-patterns web-page-design-to-code webapp-testing
website-redesign-to-code`.split(/\s+/).sort();
const priorWebAgents = `accessibility-expert browser-runtime-debugger design-system-architect
frontend-developer frontend-security-coder internationalization-engineer ui-designer ui-ux-designer
ui-visual-validator ux-researcher ux-writer`.split(/\s+/).sort();
const core = 'ui-improvement';
const writer = 'ui-improvement-engineer';
const reviewers = ['ui-ux-designer', 'ui-visual-validator'];
const commonRoles = [writer, ...reviewers].sort();
const frameworkSkills = ['desktop-development', 'swiftui-development', 'flutter-development', 'react-native-expo'];
const profiles = [
  { platform: 'codex', directory: '.codex/agents', suffix: '.toml' },
  { platform: 'claude', directory: '.claude/agents', suffix: '.md' },
  { platform: 'cursor', directory: '.cursor/agents', suffix: '.md' },
  { platform: 'copilot', directory: '.github/agents', suffix: '.agent.md' },
  { platform: 'opencode', directory: '.opencode/agents', suffix: '.md' }
];
const tempParent = fs.realpathSync.native(os.tmpdir());
const temporary = fs.mkdtempSync(path.join(tempParent, 'craftroster-interface-quality-'));
const json = relative => JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
let passed = 0;
function test(name, action) { action(); passed += 1; console.log(`PASS ${name}`); }
function files(directory, relative = '') {
  return fs.readdirSync(path.join(directory, relative), { withFileTypes: true }).flatMap(entry => {
    assert(!entry.isSymbolicLink(), `Unexpected package link: ${entry.name}`);
    const child = path.join(relative, entry.name);
    return entry.isDirectory() ? files(directory, child) : [child];
  }).sort();
}
function packageMatches(name, destination) {
  const source = path.join(root, 'skills', name);
  for (const relative of files(source))
    assert.equal(hash(path.join(destination, name, relative)), hash(path.join(source, relative)), `${name}/${relative}`);
  const metadata = JSON.parse(fs.readFileSync(path.join(destination, name, '.skill-meta.json'), 'utf8'));
  assert.equal(metadata.component, 'skill');
  assert.equal(metadata.name, name);
  assert.equal(metadata.repo, 'HsinPu/CraftRoster');
  assert.equal(metadata.target, 'project');
}
function snapshot(directory) { return files(directory).map(relative => [relative, hash(path.join(directory, relative))]); }
function includesEvery(actual, expected, label) {
  for (const name of expected) assert(actual.includes(name), `${label} lost ${name}`);
}
function assertPermission(text, platform, writable) {
  const header = text.startsWith('---') ? text.split('---')[1] : text.split('developer_instructions')[0];
  if (platform === 'codex') assert.match(header, new RegExp(`sandbox_mode = "${writable ? 'workspace-write' : 'read-only'}"`));
  else if (platform === 'claude') assert.match(header, new RegExp(`permissionMode: ${writable ? 'default' : 'plan'}`));
  else if (platform === 'cursor') assert.match(header, new RegExp(`readonly: ${!writable}`));
  else if (platform === 'opencode') {
    assert.match(header, new RegExp(`edit: ${writable ? 'allow' : 'deny'}`));
    if (!writable) assert.match(header, /bash: deny/);
  } else if (!writable) {
    assert.match(header, /tools:\s*\n\s*- read/);
    assert.doesNotMatch(header, /\n\s*- (?:edit|execute|terminal)\b/);
  } else assert.doesNotMatch(header, /\ntools:/);
}

try {
  const source = json('scripts/data/skill-catalog.json');
  const catalog = json('skills.json');
  const agents = json('agents.json');
  const bundles = json('scripts/data/install-bundles.json').bundles;
  const bundle = id => {
    const value = bundles.find(entry => entry.id === id);
    assert(value, `Missing purpose ${id}`);
    return value;
  };
  test('shared entry and purpose preserve independent and scoped installation contracts', () => {
    assert(catalog.skills.some(entry => entry.name === core));
    assert(source.skills[core]);
    assert(!(source.skills[core].dependencies || []).some(edge => edge.kind === 'required'));
    assert.deepEqual(bundle('interface-quality').skills, [core]);
    assert.deepEqual([...bundle('interface-quality').agents].sort(), commonRoles);
    includesEvery(bundle('web-interface').skills, [core, 'frontend-design-review', 'visual-regression-testing'], 'Web direct membership');
    includesEvery(bundle('mobile-desktop-embedded').skills, [core], 'Mobile/desktop membership');
    includesEvery(bundle('mobile-desktop-embedded').agents, [writer], 'Mobile/desktop writer');
    includesEvery(bundle('testing-review').skills, [core], 'Review entry');
    assert(!bundle('testing-review').agents.includes(writer), 'Review purpose unexpectedly adds a native UI writer');
    for (const role of commonRoles) {
      const canonical = readAgent(path.join(root, 'agents', `${role}.md`));
      assert.equal(canonical.fields.permission, role === writer ? 'workspace-write' : 'read-only');
      assert(canonical.skillDependencies.some(edge => edge.name === core && edge.kind === 'recommended'));
      for (const name of frameworkSkills)
        assert(!canonical.skillDependencies.some(edge => edge.name === name && ['required', 'recommended'].includes(edge.kind)), `${role} pulls ${name} without stack selection`);
    }
    const validator = agents.agents.find(entry => entry.id === 'ui-visual-validator');
    for (const name of ['frontend-design-review', 'visual-regression-testing'])
      assert(validator.skillDependencies.some(edge => edge.name === name && edge.kind === 'conditional'));
  });
  test('all five generated adapters preserve writer and reviewer permissions', () => {
    for (const profile of profiles) for (const role of commonRoles) {
      const file = path.join(root, 'adapters', profile.platform, `${role}${profile.suffix}`);
      assertPermission(fs.readFileSync(file, 'utf8'), profile.platform, role === writer);
    }
  });

  if (!options.definitions) {
    const isolatedHome = path.join(temporary, 'isolated-home');
    const runtimeTemp = path.join(temporary, 'runtime-temp');
    fs.mkdirSync(isolatedHome); fs.mkdirSync(runtimeTemp);
    const environment = { ...process.env, HOME: isolatedHome, USERPROFILE: isolatedHome,
      CODEX_HOME: path.join(isolatedHome, '.codex'), XDG_CONFIG_HOME: path.join(isolatedHome, '.config'),
      OPENCODE_CONFIG_DIR: path.join(isolatedHome, '.config/opencode'), APPDATA: path.join(isolatedHome, 'AppData/Roaming'),
      LOCALAPPDATA: path.join(isolatedHome, 'AppData/Local'), TEMP: runtimeTemp, TMP: runtimeTemp, TMPDIR: runtimeTemp,
      POWERSHELL_TELEMETRY_OPTOUT: '1' };
    delete environment.PSModulePath;
    const executable = options.shell === 'powershell' ? options.powershell || 'powershell.exe' : 'bash';
    const script = path.join(root, 'scripts', options.shell === 'powershell' ? 'install.ps1' : 'install.sh');
    function invoke(project, type, selection, settings = {}) {
      const parameter = type === 'bundle' ? 'Bundle' : 'Name';
      const args = options.shell === 'powershell'
        ? ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', script, '-SourceDir', root,
          '-Target', 'project', '-ProjectPlatform', settings.platform || 'codex', '-InstallDir', project,
          '-Type', type, `-${parameter}`, selection,
          ...(settings.dry ? ['-DryRun'] : []), ...(settings.policy ? ['-AgentSkillPolicy', settings.policy] : [])]
        : [script, '--source-dir', root, '--target', 'project', '--project-platform', settings.platform || 'codex',
          '--dir', project, '--type', type, `--${parameter.toLowerCase()}`, selection,
          ...(settings.dry ? ['--dry-run'] : []), ...(settings.policy ? ['--agent-skill-policy', settings.policy] : [])];
      const result = spawnSync(executable, args, { cwd: root, env: environment, windowsHide: true, shell: false,
        encoding: 'utf8', maxBuffer: 12 * 1024 * 1024, timeout: 180000 });
      const output = `${result.stdout || ''}${result.stderr || ''}`;
      assert(!result.error, `${result.error && result.error.message}\n${output}`);
      assert.equal(result.signal, null, output);
      if (!settings.failure) assert.equal(result.status, 0, output);
      else assert.notEqual(result.status, 0, output);
      const rows = [...output.matchAll(/^DRY-RUN (\S+) (Skill|Agent) (\S+) -> (.+)$/gm)]
        .map(match => ({ action: match[1], type: match[2], name: match[3], destination: match[4].trim() }));
      return { output, rows };
    }
    function plan(label, type, selection, settings = {}) {
      const project = path.join(temporary, label);
      const result = invoke(project, type, selection, { ...settings, dry: true });
      assert(!fs.existsSync(project), 'Dry-run created an installation destination');
      assert(result.rows.length > 0, `No concrete plan rows:\n${result.output}`);
      return result;
    }
    test(`${options.shell}: core installs alone with every packaged reference and fixture`, () => {
      const project = path.join(temporary, 'independent');
      invoke(project, 'skill', core);
      const destination = path.join(project, '.agents/skills');
      assert.deepEqual(fs.readdirSync(destination), [core]);
      packageMatches(core, destination);
      assert(!fs.existsSync(path.join(project, '.codex')), 'Skill-only install added an Agent');
    });
    test(`${options.shell}: common bundle installs five adapters without unrelated framework packs`, () => {
      const project = path.join(temporary, 'all-adapters');
      invoke(project, 'bundle', 'interface-quality', { platform: 'all' });
      for (const relative of ['.agents/skills', '.claude/skills']) {
        const destination = path.join(project, relative);
        packageMatches(core, destination);
        for (const name of frameworkSkills) assert(!fs.existsSync(path.join(destination, name)), `Common bundle pulled ${name}`);
      }
      for (const profile of profiles) {
        const destination = path.join(project, profile.directory);
        assert.deepEqual(fs.readdirSync(destination).filter(name => name.endsWith(profile.suffix)).sort(),
          commonRoles.map(role => role + profile.suffix).sort());
        for (const role of commonRoles) {
          const target = path.join(destination, role + profile.suffix);
          assert.equal(hash(target), hash(path.join(root, 'adapters', profile.platform, role + profile.suffix)));
          assertPermission(fs.readFileSync(target, 'utf8'), profile.platform, role === writer);
          const metadata = JSON.parse(fs.readFileSync(`${target}.craftroster.json`, 'utf8'));
          assert.equal(metadata.id, role); assert.equal(metadata.adapter, profile.platform);
        }
      }
    });
    test(`${options.shell}: interactive category selection installs the shared Skill and related roles`, () => {
      const project = path.join(temporary, 'interactive-project');
      const categoryRows = fs.readFileSync(path.join(root, 'scripts/data/install-bundles.tsv'), 'utf8')
        .trimEnd().split(/\r?\n/).slice(1);
      const menuIds = [...new Set(categoryRows.map(row => row.split('\t')[0]))];
      const categoryNumber = menuIds.indexOf('interface-quality') + 1;
      assert(categoryNumber > 0, 'The interactive category index omits interface-quality');
      const setup = path.join(root, 'scripts', options.shell === 'powershell' ? 'setup.ps1' : 'setup.sh');
      const args = options.shell === 'powershell'
        ? ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', setup,
          '-SourceDir', root, '-InstallDir', project]
        : [setup, '--source-dir', root, '--dir', project];
      // Codex -> current project -> selected categories -> interface-quality ->
      // accept the complete preview. The explicit private path needs no prompt.
      const result = spawnSync(executable, args, { cwd: root, env: environment, windowsHide: true, shell: false,
        encoding: 'utf8', input: `1\n2\n2\n${categoryNumber}\ny\n`, maxBuffer: 12 * 1024 * 1024, timeout: 180000 });
      const output = `${result.stdout || ''}${result.stderr || ''}`;
      assert(!result.error, `${result.error && result.error.message}\n${output}`);
      assert.equal(result.signal, null, output);
      assert.equal(result.status, 0, output);
      assert.match(output, /interface-quality/);
      assert.match(output, /Installation scope: current project/);
      assert.match(output, /Install this plan\?/);
      assert.match(output, /CraftRoster setup complete/);
      assert.deepEqual(fs.readdirSync(project).sort(), ['.agents', '.codex'], 'Interactive Codex selection wrote other platform roots');
      const destination = path.join(project, '.agents/skills');
      assert.deepEqual(fs.readdirSync(destination).sort(), [core, 'ux-writing']);
      for (const name of [core, 'ux-writing']) packageMatches(name, destination);
      const agentRoot = path.join(project, '.codex/agents');
      assert.deepEqual(fs.readdirSync(agentRoot).filter(name => name.endsWith('.toml')).sort(),
        commonRoles.map(role => `${role}.toml`).sort());
      for (const role of commonRoles) {
        const target = path.join(agentRoot, `${role}.toml`);
        assert.equal(hash(target), hash(path.join(root, 'adapters/codex', `${role}.toml`)));
        assertPermission(fs.readFileSync(target, 'utf8'), 'codex', role === writer);
      }
    });
    test(`${options.shell}: default web final plan retains every prior Skill and Agent`, () => {
      const { rows } = plan('web-plan', 'bundle', 'web-interface');
      includesEvery(rows.filter(row => row.type === 'Skill').map(row => row.name), [...priorWebSkills, core], 'Default web Skill plan');
      includesEvery(rows.filter(row => row.type === 'Agent').map(row => row.name), priorWebAgents, 'Default web Agent plan');
    });
    test(`${options.shell}: four overlapping purposes deduplicate every concrete destination`, () => {
      const { rows } = plan('combined-plan', 'bundle', 'interface-quality,web-interface,mobile-desktop-embedded,testing-review');
      const destinations = rows.map(row => row.destination.toLowerCase());
      assert.equal(new Set(destinations).size, destinations.length, 'Combined plan repeats a destination');
      assert.equal(rows.filter(row => row.type === 'Skill' && row.name === core).length, 1);
      assert.equal(rows.filter(row => row.type === 'Agent' && row.name === writer).length, 1);
      includesEvery(rows.filter(row => row.type === 'Skill').map(row => row.name), priorWebSkills, 'Combined web capabilities');
    });
    test(`${options.shell}: individual recommended Agent plans keep native and review support scoped`, () => {
      for (const role of commonRoles) {
        const { rows } = plan(`role-${role}`, 'agent', role, { policy: 'recommended' });
        assert.deepEqual(rows.filter(row => row.type === 'Agent').map(row => row.name), [role]);
        const names = rows.filter(row => row.type === 'Skill').map(row => row.name);
        includesEvery(names, [core], `${role} recommended support`);
        for (const name of [...frameworkSkills, 'frontend-design-review', 'visual-regression-testing'])
          assert(!names.includes(name), `${role} default plan selected conditional ${name}`);
      }
    });
    test(`${options.shell}: owned updates retain user files and block modified Skill replacement`, () => {
      const project = path.join(temporary, 'update-protection');
      fs.mkdirSync(project);
      const marker = path.join(project, 'user-notes.txt');
      fs.writeFileSync(marker, 'User-owned project notes.\n');
      invoke(project, 'bundle', 'interface-quality');
      invoke(project, 'bundle', 'interface-quality');
      assert.equal(fs.readFileSync(marker, 'utf8'), 'User-owned project notes.\n');
      const packageRoot = path.join(project, '.agents/skills', core);
      fs.appendFileSync(path.join(packageRoot, 'SKILL.md'), '\nLocal customization to retain.\n');
      fs.writeFileSync(path.join(packageRoot, 'local-notes.md'), 'User-owned local addition.\n');
      const before = snapshot(project);
      const result = invoke(project, 'bundle', 'interface-quality', { failure: true });
      assert.match(result.output, /content has changed since|locally modified|modified.*content/i);
      assert.deepEqual(snapshot(project), before, 'Rejected update changed a package, sidecar, or user file');
    });
    test('project installation never changes isolated global configuration or installs global packages', () => {
      // A shell may create its own caches under the isolated home. Check the
      // actual package/config destinations, rather than unrelated runtime data.
      for (const relative of ['.codex/skills', '.codex/agents', '.codex/config.toml', '.agents/skills',
        '.claude/skills', '.claude/agents', '.cursor/skills', '.cursor/agents', '.copilot/skills',
        '.copilot/agents', '.config/opencode/skills', '.config/opencode/agents', '.config/opencode/opencode.json'])
        assert(!fs.existsSync(path.join(isolatedHome, relative)), `Project install touched global ${relative}`);
    });
  }
  console.log(`Interface-quality checks passed (${passed}); native UI runtime and model evaluations are separate.`);
} finally {
  assert.equal(path.dirname(temporary), tempParent);
  assert(path.basename(temporary).startsWith('craftroster-interface-quality-'));
  assert(!fs.lstatSync(temporary).isSymbolicLink());
  fs.rmSync(temporary, { recursive: true, force: true });
}
