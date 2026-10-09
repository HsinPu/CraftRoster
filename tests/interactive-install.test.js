#!/usr/bin/env node
'use strict';

// Integration tests use the real installers, a tiny catalog, and isolated homes.
// Only archive transport is replaced in the snapshot test; its contents still
// go through extraction, menu selection, and the unmodified installer backend.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const options = { shell: 'all', requirePty: false };
for (let index = 2; index < process.argv.length; index += 1) {
  const option = process.argv[index];
  if (option === '--require-pty') options.requirePty = true;
  else if (['--shell', '--powershell', '--bash', '--case'].includes(option)) {
    const value = process.argv[++index];
    assert(value && !value.startsWith('--'), `${option} requires a value`);
    options[option.slice(2)] = value;
  } else if (option === '--help') {
    console.log('Usage: node tests/interactive-install.test.js [--shell all|powershell|bash] [--powershell executable] [--bash executable] [--require-pty] [--case regex]');
    process.exit(0);
  } else throw new Error(`Unknown option: ${option}`);
}
assert(['all', 'powershell', 'bash'].includes(options.shell), '--shell must be all, powershell, or bash');
const caseFilter = options.case ? new RegExp(options.case) : null;
const installationLine = /^OK\s+(?:install|update|force-replace|repair|migrate-update) (?:Skill|Agent) /m;
const tempParent = fs.realpathSync.native(os.tmpdir());
const tempRoot = fs.mkdtempSync(path.join(tempParent, 'craftroster-interactive-'));
let passed = 0;
let skipped = 0;
let fixtureNumber = 0;
let ptyBootstrapExecuted = false;

function isPowerShell5(selectedRuntime) {
  return selectedRuntime.kind === 'powershell' && /^5\./.test(selectedRuntime.version);
}

function installerTimeout(selectedRuntime) {
  // PS5 cold starts on Windows runners can make several backend launches slow.
  if (isPowerShell5(selectedRuntime)) return 600000;
  // Git Bash ownership checks fork many utilities for each installed package.
  return process.platform === 'win32' && selectedRuntime.kind === 'bash' ? 600000 : 90000;
}

function execute(command, args, settings = {}) {
  const result = spawnSync(command, args, {
    encoding: 'utf8', maxBuffer: 4 * 1024 * 1024, timeout: 90000,
    windowsHide: true, shell: false, ...settings
  });
  result.output = `${result.stdout || ''}${result.stderr || ''}`;
  assert(!result.error, `${command} failed: ${result.error && result.error.message}\n${result.output}`);
  assert.equal(result.signal, null, `${command} terminated by ${result.signal}\n${result.output}`);
  return result;
}

function runtime(kind) {
  const explicit = options[kind];
  const failures = [];
  const candidates = explicit ? [explicit] : kind === 'powershell'
    ? (process.platform === 'win32' ? [
      'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe',
      'powershell.exe', 'pwsh.exe', 'pwsh',
      path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/native/powershell/pwsh.exe')
    ] : ['pwsh'])
    : (process.platform === 'win32' ? ['C:\\Program Files\\Git\\bin\\bash.exe', 'bash.exe', 'bash'] : ['bash']);
  for (const executable of candidates) {
    const probe = spawnSync(executable, kind === 'powershell'
      ? ['-NoProfile', '-NonInteractive', '-Command', '$PSVersionTable.PSVersion.ToString()']
      : ['-c', 'printf "%s" "$BASH_VERSION"'], {
      encoding: 'utf8', windowsHide: true, timeout: 10000, shell: false
    });
    if (!probe.error && probe.status === 0 && probe.stdout.trim()) {
      return { kind, executable, version: probe.stdout.trim() };
    }
    failures.push(`${executable}: ${probe.error ? `${probe.error.code} ${probe.error.message}` : `exit ${probe.status} ${(probe.stderr || '').trim()}`}`);
  }
  if (explicit || options.shell === kind || (kind === 'bash' && options.requirePty)) {
    throw new Error(`Required ${kind} runtime is unavailable:\n${failures.join('\n')}`);
  }
  console.log(`SKIP ${kind}: runtime unavailable`);
  skipped += 1;
  return null;
}

function shellPath(value, selectedRuntime) {
  if (selectedRuntime.kind !== 'bash' || process.platform !== 'win32') return value;
  return value.replace(/\\/g, '/').replace(/^([A-Za-z]):/, (_, drive) => `/${drive.toLowerCase()}`);
}

function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, 'utf8');
}

const skillNames = ['alpha', 'beta', 'base', 'deep-base', 'conditional', 'optional', 'standalone', 'subagent-architecture'];
const agentNames = ['alpha-agent', 'beta-agent', 'solo-agent'];
const requiredSkills = ['alpha', 'base', 'deep-base'];
const recommendedSkills = [...requiredSkills, 'beta', 'subagent-architecture'];
const profiles = [
  { adapter: 'codex', suffix: '.toml', project: '.codex/agents' },
  { adapter: 'claude', suffix: '.md', project: '.claude/agents' },
  { adapter: 'cursor', suffix: '.md', project: '.cursor/agents' },
  { adapter: 'copilot', suffix: '.agent.md', project: '.github/agents' },
  { adapter: 'opencode', suffix: '.md', project: '.opencode/agents' }
];

function fixture(selectedRuntime) {
  const directory = path.join(tempRoot, `${selectedRuntime.kind}-${++fixtureNumber}`);
  const current = {
    directory, source: path.join(directory, 'source'), home: path.join(directory, 'home'),
    destination: path.join(directory, 'destination'), cwd: path.join(directory, 'workspace'),
    temporary: path.join(directory, 'tmp'), selectedRuntime
  };
  for (const name of ['source', 'home', 'cwd', 'temporary']) fs.mkdirSync(current[name], { recursive: true });
  for (const filename of ['install.ps1', 'install.sh']) {
    write(path.join(current.source, 'scripts', filename), fs.readFileSync(path.join(root, 'scripts', filename), 'utf8'));
  }
  for (const name of skillNames) {
    write(path.join(current.source, 'skills', name, 'SKILL.md'),
      `---\nname: ${name}\ndescription: Interactive installer integration fixture.\nlicense: Apache-2.0\n---\n\n# ${name}\n`);
  }
  write(path.join(current.source, 'skills/base/references/proof.md'), 'Required dependency resource.\n');
  write(path.join(current.source, 'skills/subagent-architecture/references/global-auto-delegation.md'),
    'Delegate bounded independent tasks to matching available agents.\n');
  for (const name of agentNames) {
    write(path.join(current.source, 'agents', `${name}.md`), `---\nid: ${name}\nname: ${name}\nrole: ${name}\n---\n# Fixture\n`);
    for (const profile of profiles) {
      const text = profile.adapter === 'codex'
        ? `name = "${name}"\ndescription = "Fixture agent"\nsandbox_mode = "read-only"\ndeveloper_instructions = "Read fixture evidence."\n`
        : `---\nname: ${name}\ndescription: Fixture agent\n---\nRead fixture evidence.\n`;
      write(path.join(current.source, 'adapters', profile.adapter, `${name}${profile.suffix}`), text);
    }
  }
  // Intentionally unsorted rows make category-number assertions meaningful.
  write(path.join(current.source, 'scripts/data/install-category-index.tsv'),
    'type\tcategory\tname\n' + [
      'skill\tz-library\tsubagent-architecture', 'agent\tb-review\tbeta-agent',
      'skill\tb-second\tbeta', 'skill\tz-library\tbase', 'agent\ta-build\talpha-agent',
      'skill\tz-library\toptional', 'skill\ta-first\talpha', 'skill\tz-library\tconditional',
      'skill\tz-library\tdeep-base', 'skill\tz-library\tstandalone', 'agent\tz-library\tsolo-agent'
    ].join('\n') + '\n');
  write(path.join(current.source, 'scripts/data/install-skill-dependencies.tsv'),
    'skill\tdependency\tkind\twhen\nalpha\tbase\trequired\t-\nalpha\tconditional\tconditional\tOnly for a specialist task.\nalpha\toptional\toptional\t-\nbeta\tbase\trequired\t-\nbase\tdeep-base\trequired\t-\nsubagent-architecture\tbase\trequired\t-\n');
  write(path.join(current.source, 'scripts/data/install-agent-skill-dependencies.tsv'),
    'agent\tskill\tkind\twhen\treason\n' + [
      'alpha-agent\talpha\trequired\t-\tThe alpha role requires the alpha workflow.',
      'alpha-agent\tbeta\trecommended\t-\tBeta improves ordinary alpha work.',
      'alpha-agent\tsubagent-architecture\trecommended\t-\tShared delegation workflow.',
      'alpha-agent\tconditional\tconditional\tOnly for a specialist task.\tSpecialist workflow.',
      'alpha-agent\toptional\toptional\t-\tAn optional extension.',
      'beta-agent\tbeta\trequired\t-\tThe beta role requires the beta workflow.',
      'beta-agent\tsubagent-architecture\trecommended\t-\tShared delegation workflow.',
      'solo-agent\t-\tnone\t-\t-'
    ].join('\n') + '\n');
  const bundles = [
    ['a-first', 'Build', 'Alpha implementation.', 'skill', 'alpha'],
    ['a-first', 'Build', 'Alpha implementation.', 'agent', 'alpha-agent'],
    ['b-second', 'Review', 'Shared alpha workflow with beta review.', 'skill', 'alpha'],
    ['b-second', 'Review', 'Shared alpha workflow with beta review.', 'agent', 'beta-agent'],
    ...skillNames.filter(name => name !== 'alpha').map(name => ['z-library', 'Library', 'Complete standalone catalog.', 'skill', name]),
    ['z-library', 'Library', 'Complete standalone catalog.', 'agent', 'solo-agent']
  ];
  write(path.join(current.source, 'scripts/data/install-bundles.tsv'),
    'bundle\ttitle\tdescription\ttype\tname\n' + bundles.map(row => row.join('\t')).join('\n') + '\n');
  return current;
}

function environment(current, extra = {}) {
  const convert = value => shellPath(value, current.selectedRuntime);
  const env = {
    ...process.env, HOME: convert(current.home), USERPROFILE: current.home,
    CODEX_HOME: convert(path.join(current.home, '.codex')),
    XDG_CONFIG_HOME: convert(path.join(current.home, '.config')),
    OPENCODE_CONFIG_DIR: convert(path.join(current.home, '.config/opencode')),
    TMPDIR: convert(current.temporary), TEMP: current.temporary, TMP: current.temporary,
    APPDATA: path.join(current.temporary, 'appdata/roaming'),
    LOCALAPPDATA: path.join(current.temporary, 'appdata/local'),
    POWERSHELL_TELEMETRY_OPTOUT: '1',
    PSModuleAnalysisCachePath: isPowerShell5(current.selectedRuntime)
      ? path.join(tempRoot, 'powershell-5-module-analysis-cache')
      : process.platform === 'win32' ? 'NUL' : '/dev/null',
    ...extra
  };
  delete env.CRAFTROSTER_INSTALL_TEST_MODE;
  delete env.CRAFTROSTER_INSTALL_TEST_FAULT;
  delete env.CRAFTROSTER_INSTALLER_TEST_MODE;
  delete env.CRAFTROSTER_INSTALLER_TEST_ACK;
  delete env.CRAFTROSTER_INSTALLER_TEST_FAULT;
  // An npm process launched by another PowerShell version can carry its module
  // search path into this runtime, including an incompatible Archive module.
  delete env.PSModulePath;
  return env;
}

function parameters(selectedRuntime, values) {
  const flags = selectedRuntime.kind === 'powershell'
    ? { source: '-SourceDir', dir: '-InstallDir', repo: '-Repo', branch: '-Branch', dry: '-DryRun', force: '-Force', target: '-Target', type: '-Type', name: '-Name', category: '-Category', projectPlatform: '-ProjectPlatform', bundle: '-Bundle', policy: '-AgentSkillPolicy', include: '-AgentSkillInclude', exclude: '-AgentSkillExclude' }
    : { source: '--source-dir', dir: '--dir', repo: '--repo', branch: '--branch', dry: '--dry-run', force: '--force', target: '--target', type: '--type', name: '--name', category: '--category', projectPlatform: '--project-platform', bundle: '--bundle', policy: '--agent-skill-policy', include: '--agent-skill-include', exclude: '--agent-skill-exclude' };
  return Object.entries(values).flatMap(([key, value]) => value === undefined || value === false ? []
    : value === true ? [flags[key]] : [flags[key], ['source', 'dir'].includes(key) ? shellPath(value, selectedRuntime) : value]);
}

function invoke(current, answers, values = {}, backend = false, settings = {}) {
  const selectedRuntime = current.selectedRuntime;
  const filename = `${backend ? 'install' : 'setup'}.${selectedRuntime.kind === 'powershell' ? 'ps1' : 'sh'}`;
  const script = shellPath(path.join(root, 'scripts', filename), selectedRuntime);
  const args = parameters(selectedRuntime, { source: current.source, dir: current.destination, ...values });
  return execute(selectedRuntime.executable, selectedRuntime.kind === 'powershell'
    ? ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', script, ...args]
    : [script, ...args], {
      cwd: current.cwd, env: environment(current), input: answers,
      timeout: installerTimeout(selectedRuntime), ...settings
    });
}

function successful(result) { assert.equal(result.status, 0, result.output); return result.output; }
function failed(result) { assert.notEqual(result.status, 0, result.output); return result.output; }
function emptyDestination(current) {
  assert(!fs.existsSync(current.destination), `Unexpected destination writes: ${current.destination}`);
  untouchedHome(current);
}
function untouchedHome(current) {
  // PowerShell 7/.NET may create their own AppData cache under USERPROFILE.
  // Installation directories and global config must still be completely absent.
  const entries = fs.readdirSync(current.home).filter(name => !(process.platform === 'win32' && name === 'AppData'));
  assert.deepEqual(entries, [], `Unexpected home installation writes: ${current.home}`);
}

function isolatedProject(current, expectedRoots) {
  assert.deepEqual(fs.readdirSync(current.destination).sort(), [...expectedRoots].sort(), 'Unexpected project profile writes');
  assert(!fs.existsSync(path.join(current.destination, '.codex/config.toml')), 'Unexpected project delegation config');
  assert(!fs.existsSync(path.join(current.destination, '.opencode/opencode.json')), 'Unexpected project delegation config');
  untouchedHome(current);
}

function snapshot(directory) {
  if (!fs.existsSync(directory)) return [];
  const entries = [];
  function visit(relative) {
    for (const item of fs.readdirSync(path.join(directory, relative), { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const child = path.join(relative, item.name);
      assert(!item.isSymbolicLink(), `Unexpected fixture symlink: ${child}`);
      entries.push([child.split(path.sep).join('/'), item.isDirectory() ? 'directory' : fs.readFileSync(path.join(directory, child)).toString('base64')]);
      if (item.isDirectory()) visit(child);
    }
  }
  visit('');
  return entries;
}

function installedSkills(current, directory, expectedNames, target, repo = 'HsinPu/CraftRoster', branch = 'main') {
  assert.deepEqual(fs.readdirSync(directory, { withFileTypes: true }).filter(entry => entry.isDirectory()).map(entry => entry.name).sort(), [...expectedNames].sort());
  for (const name of expectedNames) {
    const installed = path.join(directory, name);
    assert.equal(fs.readFileSync(path.join(installed, 'SKILL.md'), 'utf8'), fs.readFileSync(path.join(current.source, 'skills', name, 'SKILL.md'), 'utf8'));
    const metadata = JSON.parse(fs.readFileSync(path.join(installed, '.skill-meta.json'), 'utf8'));
    for (const [key, value] of Object.entries({ source: 'local-checkout', repo, branch, component: 'skill', name, target })) assert.equal(metadata[key], value, `${name} metadata ${key}`);
    assert.match(metadata.contentSha256, /^[a-f0-9]{64}$/);
  }
}

function installedAgents(current, directory, expectedNames, profile, target, repo = 'HsinPu/CraftRoster', branch = 'main') {
  const names = fs.readdirSync(directory).filter(filename => filename.endsWith(profile.suffix));
  assert.deepEqual(names.sort(), expectedNames.map(name => `${name}${profile.suffix}`).sort());
  for (const name of expectedNames) {
    const filename = `${name}${profile.suffix}`;
    assert.equal(fs.readFileSync(path.join(directory, filename), 'utf8'), fs.readFileSync(path.join(current.source, 'adapters', profile.adapter, filename), 'utf8'));
    const metadata = JSON.parse(fs.readFileSync(path.join(directory, `${filename}.craftroster.json`), 'utf8'));
    for (const [key, value] of Object.entries({ source: 'local-checkout', repo, branch, component: 'agent', id: name, name, adapter: profile.adapter, target })) assert.equal(metadata[key], value, `${filename} metadata ${key}`);
  }
}

function preflightBeforeWrites(output) {
  const firstWrite = output.search(installationLine);
  const lastPreflight = output.lastIndexOf('DRY-RUN ');
  assert(firstWrite >= 0, `No actual backend installation was reported\n${output}`);
  assert(lastPreflight >= 0 && lastPreflight < firstWrite, `Not every backend batch was preflighted before writing\n${output}`);
}

function actionCounts(output, action, skillCount, agentCount, preview = false) {
  const prefix = preview ? 'DRY-RUN ' : 'OK\\s+';
  for (const [component, count] of [['Skill', skillCount], ['Agent', agentCount]]) {
    const actual = output.split(/\r?\n/).filter(line => new RegExp(`^${prefix}${action} ${component} `).test(line)).length;
    assert.equal(actual, count, `${action} ${component} count\n${output}`);
  }
}

function test(selectedRuntime, name, callback) {
  if (caseFilter && !caseFilter.test(name)) return;
  callback();
  passed += 1;
  console.log(`PASS ${selectedRuntime.kind}: ${name}`);
}

function commonCases(selectedRuntime) {
  if (selectedRuntime.kind === 'powershell') test(selectedRuntime, 'bundle paths with spaces and trailing backslashes preserve dry-run and exact overrides', () => {
    const current = fixture(selectedRuntime);
    const renamed = path.join(current.directory, 'source checkout with spaces');
    fs.renameSync(current.source, renamed);
    current.source = renamed;
    current.destination = path.join(current.directory, 'destination with spaces');
    const values = { source: `${current.source}\\`, dir: `${current.destination}\\` };
    const dry = successful(invoke(current, '2\n1\n2\n1\n', { ...values, dry: true }));
    actionCounts(dry, 'install', 5, 1, true);
    assert.doesNotMatch(dry, installationLine);
    emptyDestination(current);
    successful(invoke(current, '2\n1\n2\n1\ny\n', values));
    installedSkills(current, current.destination, recommendedSkills, 'claude');
    installedAgents(current, current.destination, ['alpha-agent'], profiles[1], 'claude');
    untouchedHome(current);
  });

  test(selectedRuntime, 'multiple usage categories install both types once with recursive required closure and forwarded ownership', () => {
    const current = fixture(selectedRuntime);
    const repo = 'FixtureOwner/Catalog';
    const branch = 'feature/interactive-fixture';
    const output = successful(invoke(current, '2\n1\n2\n2, 1 2\ny\n', { repo, branch }));
    installedSkills(current, current.destination, recommendedSkills, 'claude', repo, branch);
    installedAgents(current, current.destination, ['alpha-agent', 'beta-agent'], profiles[1], 'claude', repo, branch);
    actionCounts(output, 'install', 5, 2, true);
    actionCounts(output, 'install', 5, 2);
    assert.match(output, /conditional/i);
    assert(!fs.existsSync(path.join(current.destination, 'conditional')));
    assert(!fs.existsSync(path.join(current.destination, 'optional')));
    assert(!fs.existsSync(path.join(current.destination, 'standalone')));
    assert.equal(fs.readFileSync(path.join(current.destination, 'base/references/proof.md'), 'utf8'), 'Required dependency resource.\n');
    untouchedHome(current);
    preflightBeforeWrites(output);
  });

  test(selectedRuntime, 'all mode installs the entire Skill and Agent catalogs and reinstalls owned packages', () => {
    const current = fixture(selectedRuntime);
    const install = successful(invoke(current, '2\n1\n1\ny\n'));
    installedSkills(current, current.destination, skillNames, 'claude');
    installedAgents(current, current.destination, agentNames, profiles[1], 'claude');
    actionCounts(install, 'install', skillNames.length, agentNames.length);
    assert.doesNotMatch(install, /Usage categories \(|Content \[/);
    assert(fs.existsSync(path.join(current.destination, 'standalone/SKILL.md')), 'All omitted a Skill with no Agent relation');
    // Reinstall through the real backend to avoid repeating the same owned
    // digest preflight twice in the wrapper, particularly on Windows Git Bash.
    const update = successful(invoke(current, '', { target: 'claude', type: 'bundle', bundle: 'all' }, true));
    actionCounts(update, 'update', skillNames.length, agentNames.length);
    installedSkills(current, current.destination, skillNames, 'claude');
    installedAgents(current, current.destination, agentNames, profiles[1], 'claude');
    untouchedHome(current);
    preflightBeforeWrites(install);
  });

  test(selectedRuntime, 'Enter defaults select codex global all while dry-run writes nothing', () => {
    const current = fixture(selectedRuntime);
    const output = successful(invoke(current, '\n\n\n\n', { dry: true }));
    actionCounts(output, 'install', skillNames.length, agentNames.length, true);
    assert.match(output, /Installation scope: user global/);
    assert.doesNotMatch(output, /Usage categories \(|Content \[|Install this plan\?/);
    assert.doesNotMatch(output, installationLine);
    emptyDestination(current);
  });

  test(selectedRuntime, 'Codex global bundle delegation installs companions and updates managed config only after approval', () => {
    const current = fixture(selectedRuntime);
    const output = successful(invoke(current, '1\n1\n2\n1\ny\ny\n', { dir: undefined }));
    installedAgents(current, path.join(current.home, '.codex/agents'), ['alpha-agent'], profiles[0], 'codex');
    installedSkills(current, path.join(current.home, '.codex/skills'), recommendedSkills, 'codex');
    const config = fs.readFileSync(path.join(current.home, '.codex/config.toml'), 'utf8');
    assert.match(config, /CRAFTROSTER_AUTO_DELEGATION_START/);
    assert.match(config, /Delegate bounded independent tasks/);
    preflightBeforeWrites(output);
  });

  test(selectedRuntime, 'OpenCode companion installation does not imply delegation and explicit Y updates config', () => {
    const current = fixture(selectedRuntime);
    successful(invoke(current, '5\n1\n2\n1\n\ny\n', { dir: undefined }));
    const configRoot = path.join(current.home, '.config/opencode');
    installedAgents(current, path.join(configRoot, 'agents'), ['alpha-agent'], profiles[4], 'opencode');
    installedSkills(current, path.join(configRoot, 'skills'), recommendedSkills, 'opencode');
    assert(!fs.existsSync(path.join(configRoot, 'opencode.json')));
    successful(invoke(current, '5\n1\n2\n2\ny\ny\n', { dir: undefined }));
    installedAgents(current, path.join(configRoot, 'agents'), ['alpha-agent', 'beta-agent'], profiles[4], 'opencode');
    const config = JSON.parse(fs.readFileSync(path.join(configRoot, 'opencode.json'), 'utf8'));
    assert.deepEqual(config.instructions.map(item => item.replace(/\\/g, '/')), [shellPath(path.join(configRoot, 'skills/subagent-architecture/references/global-auto-delegation.md'), selectedRuntime).replace(/\\/g, '/')]);
  });

  test(selectedRuntime, 'confirmation blank n and q cancel the complete bundle without writes', () => {
    for (const answer of ['', 'n', 'q']) {
      const current = fixture(selectedRuntime);
      const output = successful(invoke(current, `2\n1\n2\n1\n${answer}\n`));
      actionCounts(output, 'install', 5, 1, true);
      assert.doesNotMatch(output, installationLine);
      emptyDestination(current);
    }
  });

  test(selectedRuntime, 'q cancels at platform scope root mode category and delegation prompts', () => {
    for (const answers of ['q\n', '1\nq\n', '1\n2\nq\n', '2\n1\nq\n', '2\n1\n2\nq\n', '1\n1\n2\n1\nq\n']) {
      const current = fixture(selectedRuntime);
      const output = successful(invoke(current, answers, { dir: undefined }));
      assert.doesNotMatch(output, /DRY-RUN |^OK\s+/m);
      assert.deepEqual(fs.readdirSync(current.cwd), []);
      emptyDestination(current);
    }
  });

  test(selectedRuntime, 'EOF never accepts all or confirmation and remains bounded at every input phase', () => {
    for (const answers of ['', '1\n', '1\n2\n', '2\n1\n', '2\n1\n2\n', '2\n1\n2\n1\n']) {
      const current = fixture(selectedRuntime);
      const confirmation = answers === '2\n1\n2\n1\n';
      const timeout = confirmation ? installerTimeout(selectedRuntime) : isPowerShell5(selectedRuntime) ? 60000 : 30000;
      const output = failed(invoke(current, answers, { dir: undefined }, false, { timeout }));
      assert.match(output, selectedRuntime.kind === 'powershell' ? /End of input while reading/ : /Input ended \(EOF\)/);
      assert.doesNotMatch(output, installationLine);
      if (!confirmation) assert.doesNotMatch(output, /DRY-RUN /);
      assert.deepEqual(fs.readdirSync(current.cwd), []);
      emptyDestination(current);
    }
  });

  test(selectedRuntime, 'specified categories reject blank zero and malformed selections with bounded retries', () => {
    const current = fixture(selectedRuntime);
    successful(invoke(current, '2\n1\n2\n99\n1,,2\n1\ny\n'));
    installedSkills(current, current.destination, recommendedSkills, 'claude');
    installedAgents(current, current.destination, ['alpha-agent'], profiles[1], 'claude');
    const rejected = fixture(selectedRuntime);
    const output = failed(invoke(rejected, '2\n1\n2\n\n0\n\n1\ny\n'));
    assert.doesNotMatch(output, /DRY-RUN |^OK\s+/m);
    emptyDestination(rejected);
  });

  test(selectedRuntime, 'confirmation accepts only y or n with a bounded retry', () => {
    const current = fixture(selectedRuntime);
    successful(invoke(current, '2\n1\n2\n1\nyes\ny\n'));
    installedSkills(current, current.destination, recommendedSkills, 'claude');
    const rejected = fixture(selectedRuntime);
    failed(invoke(rejected, '2\n1\n2\n1\nyes\nmaybe\nyes\ny\n'));
    emptyDestination(rejected);
  });

  test(selectedRuntime, 'any foreign Skill or Agent prevents every write in the complete bundle plan', () => {
    for (const conflict of [
      { path: 'base/SKILL.md', answers: '2\n1\n2\n1\ny\n' },
      { path: 'alpha-agent.md', answers: '2\n1\n2\n1\ny\n' },
      { path: '.codex/agents/alpha-agent.toml', answers: '1\n2\n2\n1\ny\n' },
      { path: '.github/agents/beta-agent.agent.md', answers: '6\n2\n1 2\ny\n' }
    ]) {
      const current = fixture(selectedRuntime);
      write(path.join(current.destination, conflict.path), 'FOREIGN selected component\n');
      const before = snapshot(current.destination);
      const output = failed(invoke(current, conflict.answers));
      assert.doesNotMatch(output, installationLine);
      assert.deepEqual(snapshot(current.destination), before);
      untouchedHome(current);
    }
  });

  test(selectedRuntime, 'force reaches required dependencies and preserves unselected foreign packages', () => {
    const current = fixture(selectedRuntime);
    write(path.join(current.destination, 'base/user.txt'), 'FOREIGN required dependency\n');
    write(path.join(current.destination, 'conditional/user.txt'), 'FOREIGN unselected conditional\n');
    const output = successful(invoke(current, '2\n1\n2\n1\ny\n', { force: true }));
    assert.match(output, /force-replace Skill base /);
    assert(!fs.existsSync(path.join(current.destination, 'base/user.txt')));
    assert.equal(fs.readFileSync(path.join(current.destination, 'conditional/user.txt'), 'utf8'), 'FOREIGN unselected conditional\n');
    assert(!fs.existsSync(path.join(current.destination, 'conditional/.skill-meta.json')));
    installedAgents(current, current.destination, ['alpha-agent'], profiles[1], 'claude');
    untouchedHome(current);
    preflightBeforeWrites(output);
  });

  test(selectedRuntime, 'malformed usage category source fails before installation', () => {
    const current = fixture(selectedRuntime);
    write(path.join(current.source, 'scripts/data/install-bundles.tsv'), 'bundle\twrong\ttype\tname\na-first\tBuild\tskill\talpha\n');
    failed(invoke(current, '2\n1\n2\n1\ny\n'));
    emptyDestination(current);
  });

  test(selectedRuntime, 'legacy CLI retains skill-only named category and full Agent behavior without bundle indexes', () => {
    const skill = fixture(selectedRuntime);
    for (const filename of ['install-bundles.tsv', 'install-agent-skill-dependencies.tsv']) fs.unlinkSync(path.join(skill.source, 'scripts/data', filename));
    const output = successful(invoke(skill, '', { target: 'claude', type: 'skill', name: 'alpha' }, true));
    installedSkills(skill, skill.destination, requiredSkills, 'claude');
    assert.equal(fs.readdirSync(skill.destination).filter(name => name.endsWith('.md')).length, 0);
    assert.doesNotMatch(output, /Platform \[|Installation mode \[|Usage categories \(/);
    const agent = fixture(selectedRuntime);
    successful(invoke(agent, '', { target: 'claude', type: 'agent', name: 'alpha-agent' }, true));
    installedAgents(agent, agent.destination, ['alpha-agent'], profiles[1], 'claude');
    assert.deepEqual(fs.readdirSync(agent.destination, { withFileTypes: true }).filter(entry => entry.isDirectory()), []);
    untouchedHome(agent);
    const category = fixture(selectedRuntime);
    successful(invoke(category, '', { target: 'claude', type: 'skill', category: 'a-first' }, true));
    installedSkills(category, category.destination, requiredSkills, 'claude');
    const all = fixture(selectedRuntime);
    const dry = successful(invoke(all, '', { target: 'codex', type: 'agent', dry: true }, true));
    actionCounts(dry, 'install', 3, agentNames.length, true);
    assert.match(dry, /subagent-architecture/);
    assert.match(dry, /legacy/i);
    emptyDestination(all);
  });
}

function projectScopeCases(selectedRuntime) {
  test(selectedRuntime, 'Codex project bundle uses cwd after scope retry and keeps both types and required resources local', () => {
    const current = fixture(selectedRuntime);
    current.destination = current.cwd;
    const output = successful(invoke(current, '1\n0\n2\n\n2\n1\ny\n', { dir: undefined }));
    installedSkills(current, path.join(current.destination, '.agents/skills'), recommendedSkills, 'project');
    installedAgents(current, path.join(current.destination, '.codex/agents'), ['alpha-agent'], profiles[0], 'project');
    assert.equal(fs.readFileSync(path.join(current.destination, '.agents/skills/base/references/proof.md'), 'utf8'), 'Required dependency resource.\n');
    assert.doesNotMatch(output, /Enable proactive Agent delegation\?/i);
    isolatedProject(current, ['.agents', '.codex']);
    preflightBeforeWrites(output);
  });

  test(selectedRuntime, 'Codex project root with spaces is requested before mode and multiple usage categories', () => {
    const current = fixture(selectedRuntime);
    current.destination = path.join(current.directory, 'codex project with spaces');
    const answerPath = shellPath(current.destination, selectedRuntime);
    const output = successful(invoke(current, `1\n2\n${answerPath}\n2\n2, 1\ny\n`, { dir: undefined }));
    installedSkills(current, path.join(current.destination, '.agents/skills'), recommendedSkills, 'project');
    installedAgents(current, path.join(current.destination, '.codex/agents'), ['alpha-agent', 'beta-agent'], profiles[0], 'project');
    assert.doesNotMatch(output, /Enable proactive Agent delegation\?/i);
    assert.deepEqual(fs.readdirSync(current.cwd), []);
    isolatedProject(current, ['.agents', '.codex']);
    preflightBeforeWrites(output);
  });

  test(selectedRuntime, 'Codex project all installs unreferenced Skills and every Agent without other profiles', () => {
    const current = fixture(selectedRuntime);
    const output = successful(invoke(current, '1\n2\n1\ny\n'));
    installedSkills(current, path.join(current.destination, '.agents/skills'), skillNames, 'project');
    installedAgents(current, path.join(current.destination, '.codex/agents'), agentNames, profiles[0], 'project');
    actionCounts(output, 'install', skillNames.length, agentNames.length);
    assert.doesNotMatch(output, /Enable proactive Agent delegation\?/i);
    isolatedProject(current, ['.agents', '.codex']);
  });

  test(selectedRuntime, 'other single-platform project profiles isolate bundled Skills Agents and the vscode alias', () => {
    for (let index = 1; index < profiles.length; index += 1) {
      const current = fixture(selectedRuntime);
      const profile = profiles[index];
      const output = successful(invoke(current, `${index + 1}\n2\n2\n1\ny\n`));
      const skillRoot = profile.adapter === 'claude' ? '.claude' : '.agents';
      installedSkills(current, path.join(current.destination, skillRoot, 'skills'), recommendedSkills, 'project');
      installedAgents(current, path.join(current.destination, profile.project), ['alpha-agent'], profile, 'project');
      assert.doesNotMatch(output, /Enable proactive Agent delegation\?/i);
      isolatedProject(current, [...new Set([skillRoot, profile.project.split('/')[0]])]);
      preflightBeforeWrites(output);
      if (profile.adapter === 'copilot') {
        const update = successful(invoke(current, '', { target: 'project', projectPlatform: 'vscode', type: 'bundle', bundle: 'a-first' }, true));
        actionCounts(update, 'update', 5, 1);
        installedAgents(current, path.join(current.destination, profile.project), ['alpha-agent'], profile, 'project');
        isolatedProject(current, ['.agents', '.github']);
      }
    }
  });

  test(selectedRuntime, 'legacy project all profiles support single-platform bundle updates without changing other copies', () => {
    const current = fixture(selectedRuntime);
    current.destination = path.join(current.directory, 'chosen project with spaces');
    const answerPath = shellPath(current.destination, selectedRuntime);
    const output = successful(invoke(current, `6\n${answerPath}\n2\n1 2\ny\n`, { dir: undefined }));
    for (const relative of ['.agents/skills', '.claude/skills']) installedSkills(current, path.join(current.destination, relative), recommendedSkills, 'project');
    for (const profile of profiles) installedAgents(current, path.join(current.destination, profile.project), ['alpha-agent', 'beta-agent'], profile, 'project');
    assert.doesNotMatch(output, /Installation scope \[1\]|Enable proactive Agent delegation\?/i);
    actionCounts(output, 'install', 10, 10);
    const other = ['.claude', '.cursor', '.github', '.opencode'].map(relative => [relative, snapshot(path.join(current.destination, relative))]);
    const update = successful(invoke(current, '', { target: 'project', projectPlatform: 'codex', type: 'bundle', bundle: 'a-first' }, true));
    actionCounts(update, 'update', 5, 1);
    installedSkills(current, path.join(current.destination, '.agents/skills'), recommendedSkills, 'project');
    installedAgents(current, path.join(current.destination, '.codex/agents'), ['alpha-agent', 'beta-agent'], profiles[0], 'project');
    for (const [relative, before] of other) assert.deepEqual(snapshot(path.join(current.destination, relative)), before);
    untouchedHome(current);
  });

  test(selectedRuntime, 'backend rejects global invalid and missing ProjectPlatform before writes', () => {
    for (const values of [
      { target: 'codex', projectPlatform: 'codex' }, { target: 'codex', projectPlatform: 'all' },
      { target: 'project', projectPlatform: 'unknown' }, { target: 'project', projectPlatform: true }
    ]) {
      const current = fixture(selectedRuntime);
      const output = failed(invoke(current, '', { type: 'bundle', bundle: 'a-first', ...values }, true));
      assert.match(output, /ProjectPlatform|project-platform|project platform/i);
      assert.doesNotMatch(output, installationLine);
      emptyDestination(current);
    }
  });

  test(selectedRuntime, 'stale source capability checks require real Bundle policy and project declarations without side effects', () => {
    for (const capability of ['help-only', 'bundle-only', 'bundle-and-policy']) {
      const current = fixture(selectedRuntime);
      const marker = path.join(current.source, 'backend-invocations.log');
      if (selectedRuntime.kind === 'powershell') {
        const added = capability === 'help-only' ? '' : capability === 'bundle-only'
          ? ', [string]$Bundle' : ', [string]$Bundle, [string]$AgentSkillPolicy';
        write(path.join(current.source, 'scripts/install.ps1'), `param([string]$SourceDir, [string]$InstallDir, [string]$Target, [string]$Type, [string]$Branch, [string]$Repo, [switch]$DryRun, [switch]$Force${added})\n` +
          `# Help: Bundle AgentSkillPolicy ProjectPlatform\n` +
          `Add-Content -LiteralPath (Join-Path $SourceDir 'backend-invocations.log') -Value "$Target|$Type|$($args.Count)"\n` +
          `if ($args.Count -ne 0 -or -not $DryRun) { throw 'Unexpected backend arguments.' }\nWrite-Output 'DRY-RUN compatible bundle backend'\n`);
      } else {
        const declared = capability === 'help-only' ? '' : capability === 'bundle-only'
          ? '    --bundle) shift 2 ;;\n' : '    --bundle) shift 2 ;;\n    --agent-skill-policy) shift 2 ;;\n';
        write(path.join(current.source, 'scripts/install.sh'), '#!/usr/bin/env bash\nset -euo pipefail\n' +
          '# Help: --bundle --agent-skill-policy --project-platform\n' +
          'printf "%s\\n" "$*" >> "$(dirname "$0")/../backend-invocations.log"\nwhile [[ "$#" -gt 0 ]]; do\n  case "$1" in\n' + declared +
          '    --source-dir|--dir|--target|--type|--branch|--repo) shift 2 ;;\n    --dry-run|--force) shift ;;\n    *) exit 1 ;;\n  esac\ndone\nprintf "DRY-RUN compatible bundle backend\\n"\n');
      }
      const answers = capability === 'bundle-and-policy' ? '1\n2\n1\n' : '2\n1\n1\n';
      const rejection = failed(invoke(current, answers, { dry: true }));
      assert.match(rejection, capability === 'bundle-and-policy' ? /ProjectPlatform|single project platform/i : /Bundle.*AgentSkillPolicy|bundled installation/i);
      assert(!fs.existsSync(marker), 'Capability detection executed an unaware source backend');
      emptyDestination(current);
      if (capability === 'bundle-and-policy') {
        const all = successful(invoke(current, '6\n1\n', { dry: true }));
        assert.match(all, /DRY-RUN compatible bundle backend/);
        const entries = fs.readFileSync(marker, 'utf8').trim().split(/\r?\n/);
        assert.equal(entries.length, 1);
        if (selectedRuntime.kind === 'powershell') assert.equal(entries[0], 'project|bundle|0');
        else {
          assert.match(entries[0], /--type bundle.*--bundle all.*--agent-skill-policy recommended/);
          assert.doesNotMatch(entries[0], /--project-platform/);
        }
        emptyDestination(current);
      }
    }
  });
}

function backendBundleCases(selectedRuntime) {
  test(selectedRuntime, 'advanced Agent policies distinguish legacy required recommended and a zero-relation role', () => {
    for (const policy of [undefined, 'required', 'recommended']) {
      const current = fixture(selectedRuntime);
      const output = successful(invoke(current, '', { target: 'claude', type: 'agent', name: 'alpha-agent', policy, dir: undefined }, true));
      const claude = path.join(current.home, '.claude');
      installedAgents(current, path.join(claude, 'agents'), ['alpha-agent'], profiles[1], 'claude');
      if (policy) installedSkills(current, path.join(claude, 'skills'), policy === 'required' ? requiredSkills : recommendedSkills, 'claude');
      else { assert(!fs.existsSync(path.join(claude, 'skills'))); assert.match(output, /legacy/i); }
      assert(!fs.existsSync(current.destination));
    }
    const solo = fixture(selectedRuntime);
    successful(invoke(solo, '', { target: 'claude', type: 'agent', name: 'solo-agent', policy: 'recommended', dir: undefined }, true));
    installedAgents(solo, path.join(solo.home, '.claude/agents'), ['solo-agent'], profiles[1], 'claude');
    assert(!fs.existsSync(path.join(solo.home, '.claude/skills')));
  });

  test(selectedRuntime, 'custom companions include explicit conditional optional and retain required or category reasons', () => {
    for (const selection of [
      { bundle: 'a-first', policy: 'required', include: 'conditional,optional', exclude: 'beta,subagent-architecture', skills: [...requiredSkills, 'conditional', 'optional'], agents: ['alpha-agent'] },
      { bundle: 'a-first', exclude: 'beta', skills: [...requiredSkills, 'subagent-architecture'], agents: ['alpha-agent'] },
      { bundle: 'a-first,b-second', exclude: 'beta', skills: recommendedSkills, agents: ['alpha-agent', 'beta-agent'] },
      { bundle: 'a-first,z-library', exclude: 'beta,subagent-architecture', skills: skillNames, agents: ['alpha-agent', 'solo-agent'] }
    ]) {
      const current = fixture(selectedRuntime);
      const { skills, agents, ...values } = selection;
      const output = successful(invoke(current, '', { target: 'project', projectPlatform: 'codex', type: 'bundle', ...values }, true));
      installedSkills(current, path.join(current.destination, '.agents/skills'), skills, 'project');
      installedAgents(current, path.join(current.destination, '.codex/agents'), agents, profiles[0], 'project');
      actionCounts(output, 'install', skills.length, agents.length);
      isolatedProject(current, ['.agents', '.codex']);
    }
  });

  test(selectedRuntime, 'invalid companion controls and bundle selections fail without destination writes', () => {
    for (const values of [
      { include: 'standalone' }, { exclude: 'alpha' }, { exclude: 'conditional' },
      { include: 'beta', exclude: 'beta' }, { policy: 'legacy' },
      { bundle: 'missing' }, { bundle: 'a-first,' }, { name: 'alpha' }
    ]) {
      const current = fixture(selectedRuntime);
      const output = failed(invoke(current, '', { target: 'project', projectPlatform: 'codex', type: 'bundle', bundle: 'a-first', ...values }, true));
      assert.doesNotMatch(output, installationLine);
      emptyDestination(current);
    }
  });

  test(selectedRuntime, 'missing malformed duplicate NUL unknown and incomplete bundle indexes cannot write any package', () => {
    const mutations = [
      ['missing bundles', 'install-bundles.tsv', null],
      ['missing Agent links', 'install-agent-skill-dependencies.tsv', null],
      ['duplicate bundle member', 'install-bundles.tsv', text => text + text.split('\n')[1] + '\n'],
      ['duplicate Agent link', 'install-agent-skill-dependencies.tsv', text => text + text.split('\n')[1] + '\n'],
      ['invalid bundle field', 'install-bundles.tsv', text => text.replace('\tskill\talpha', '\tplugin\talpha')],
      ['invalid Agent kind', 'install-agent-skill-dependencies.tsv', text => text.replace('\trequired\t', '\tmandatory\t')],
      ['invalid Agent when', 'install-agent-skill-dependencies.tsv', text => text.replace('\trequired\t-\t', '\trequired\twrong condition\t')],
      ['NUL bundle table', 'install-bundles.tsv', text => text + '\0'],
      ['NUL Agent table', 'install-agent-skill-dependencies.tsv', text => text + '\0'],
      ['uncovered bundled Agent', 'install-bundles.tsv', text => text.split('\n').filter(line => !line.endsWith('\tagent\tsolo-agent')).join('\n')],
      ['uncovered bundled Skill', 'install-bundles.tsv', text => text.split('\n').filter(line => !line.endsWith('\tskill\tstandalone')).join('\n')],
      ['uncovered Agent relation', 'install-agent-skill-dependencies.tsv', text => text.split('\n').filter(line => !line.startsWith('solo-agent\t')).join('\n')],
      ['unknown associated Skill', 'install-agent-skill-dependencies.tsv', text => text.replace('alpha-agent\talpha\t', 'alpha-agent\tunknown-skill\t')]
    ];
    for (const [label, filename, mutate] of mutations) {
      const current = fixture(selectedRuntime);
      const file = path.join(current.source, 'scripts/data', filename);
      if (mutate) fs.writeFileSync(file, mutate(fs.readFileSync(file, 'utf8')));
      else fs.unlinkSync(file);
      const output = failed(invoke(current, '', { target: 'project', projectPlatform: 'codex', type: 'bundle', bundle: 'all' }, true));
      assert.doesNotMatch(output, installationLine, label);
      assert.match(output, /index|catalog|bundle|relation|dependency|Agent Skill/i, label);
      emptyDestination(current);
    }
  });

  test(selectedRuntime, 'advanced skill-only install expands required Skills without pulling any reverse Agent relation', () => {
    const current = fixture(selectedRuntime);
    const output = successful(invoke(current, '', { target: 'project', projectPlatform: 'codex', type: 'skill', name: 'alpha' }, true));
    installedSkills(current, path.join(current.destination, '.agents/skills'), requiredSkills, 'project');
    actionCounts(output, 'install', 3, 0);
    isolatedProject(current, ['.agents']);
  });

  test(selectedRuntime, 'partial bundle failure preserves completed packages and restores the failed update', () => {
    const current = fixture(selectedRuntime);
    const dependencies = path.join(current.source, 'scripts/data/install-skill-dependencies.tsv');
    write(dependencies, 'skill\tdependency\tkind\twhen\n');
    successful(invoke(current, '', { target: 'claude', type: 'skill', name: 'alpha' }, true));
    installedSkills(current, current.destination, ['alpha'], 'claude');
    const alpha = path.join(current.destination, 'alpha');
    const originalAlpha = snapshot(alpha);
    write(dependencies, 'skill\tdependency\tkind\twhen\nalpha\tbase\trequired\t-\n');
    fs.appendFileSync(path.join(current.source, 'skills/alpha/SKILL.md'), '\nUpdated alpha fixture.\n');

    const fault = selectedRuntime.kind === 'powershell'
      ? { CRAFTROSTER_INSTALLER_TEST_MODE: 'skill-atomic-swap', CRAFTROSTER_INSTALLER_TEST_ACK: 'I_UNDERSTAND_THIS_IS_TEST_ONLY', CRAFTROSTER_INSTALLER_TEST_FAULT: 'after-backup' }
      : { CRAFTROSTER_INSTALL_TEST_MODE: 'enabled', CRAFTROSTER_INSTALL_TEST_FAULT: 'skill-commit-after-backup' };
    const output = failed(invoke(current, '', { target: 'claude', type: 'bundle', bundle: 'a-first', policy: 'required' }, true, {
      env: { ...environment(current), ...fault }
    }));
    assert.match(output, selectedRuntime.kind === 'powershell'
      ? /Injected test-only failure after Skill backup\./ : /Injected test-only Skill commit failure after backup\./);
    const report = output.match(/Completed(?: \(\d+\))?:([\s\S]*?)Pending(?: \(\d+\))?:([\s\S]*)/);
    assert(report, `Missing completed/pending failure report\n${output}`);
    const labels = text => [...text.matchAll(/((?:Skill|Agent) [a-z0-9-]+)(?: \(claude\))? ->/g)].map(match => match[1]);
    assert.deepEqual(labels(report[1]), ['Skill base'], output);
    assert.deepEqual(labels(report[2]), ['Skill alpha', 'Agent alpha-agent'], output);
    assert.deepEqual(fs.readdirSync(current.destination).sort(), ['alpha', 'base']);
    assert.deepEqual(snapshot(alpha), originalAlpha, 'The failed update did not restore the original content and ownership');
    assert.notEqual(fs.readFileSync(path.join(alpha, 'SKILL.md'), 'utf8'), fs.readFileSync(path.join(current.source, 'skills/alpha/SKILL.md'), 'utf8'));
    const base = path.join(current.destination, 'base');
    assert.equal(fs.readFileSync(path.join(base, 'SKILL.md'), 'utf8'), fs.readFileSync(path.join(current.source, 'skills/base/SKILL.md'), 'utf8'));
    assert.equal(fs.readFileSync(path.join(base, 'references/proof.md'), 'utf8'), 'Required dependency resource.\n');
    const metadata = JSON.parse(fs.readFileSync(path.join(base, '.skill-meta.json'), 'utf8'));
    for (const [key, value] of Object.entries({ source: 'local-checkout', repo: 'HsinPu/CraftRoster', branch: 'main', component: 'skill', name: 'base', target: 'claude' })) assert.equal(metadata[key], value, `base metadata ${key}`);
    assert.match(metadata.contentSha256, /^[a-f0-9]{64}$/);
    untouchedHome(current);
  });
}

function snapshotCase(selectedRuntime) {
  test(selectedRuntime, 'remote acquisition downloads exactly one snapshot for both component types', () => {
    const current = fixture(selectedRuntime);
    const archive = path.join(current.directory, selectedRuntime.kind === 'powershell' ? 'fixture.zip' : 'fixture.tar.gz');
    const log = path.join(current.directory, 'fetch.log');
    const args = parameters(selectedRuntime, { dir: current.destination, repo: 'FixtureOwner/Catalog', branch: 'feature/snapshot', dry: true });
    let result;
    if (selectedRuntime.kind === 'bash') {
      successful(execute(selectedRuntime.executable, ['-c', 'tar -czf "$1" -C "$2" source', 'fixture-archive', shellPath(archive, selectedRuntime), shellPath(current.directory, selectedRuntime)], { env: environment(current) }));
      const bin = path.join(current.directory, 'bin');
      write(path.join(bin, 'curl'), '#!/usr/bin/env bash\nset -euo pipefail\nprintf "%s\\n" "$*" >> "$CRAFTROSTER_FETCH_LOG"\noutput=""\nwhile [[ "$#" -gt 0 ]]; do\n  if [[ "$1" == "-o" ]]; then output="$2"; shift 2; else shift; fi\ndone\n[[ -n "$output" ]]\ncp "$CRAFTROSTER_ARCHIVE_FIXTURE" "$output"\n');
      fs.chmodSync(path.join(bin, 'curl'), 0o755);
      // Git's bin/bash.exe launcher reconstructs PATH. Resolve the underlying
      // shell inside its first process so the transport fixture stays first.
      const launch = 'PATH="$1:$PATH"; export PATH; [[ "$(command -v curl)" == "$1/curl" ]] || { printf "Fixture curl was not selected\\n" >&2; exit 99; }; exec "$BASH" "$2" "${@:3}"';
      result = execute(selectedRuntime.executable, ['-c', launch, 'fixture-transport',
        shellPath(bin, selectedRuntime),
        shellPath(path.join(root, 'scripts/setup.sh'), selectedRuntime), ...args], {
        cwd: current.cwd, input: '1\n2\n2\n1\n', env: environment(current, {
          CRAFTROSTER_ARCHIVE_FIXTURE: shellPath(archive, selectedRuntime), CRAFTROSTER_FETCH_LOG: shellPath(log, selectedRuntime)
        })
      });
    } else {
      // ZIP construction is one auxiliary process, not an installer batch.
      successful(execute(selectedRuntime.executable, ['-NoProfile', '-NonInteractive', '-Command', 'Add-Type -AssemblyName System.IO.Compression.FileSystem; [IO.Compression.ZipFile]::CreateFromDirectory($env:CRAFTROSTER_FIXTURE_SOURCE, $env:CRAFTROSTER_ARCHIVE_FIXTURE, [IO.Compression.CompressionLevel]::Optimal, $true)'], {
        env: environment(current, { CRAFTROSTER_FIXTURE_SOURCE: current.source, CRAFTROSTER_ARCHIVE_FIXTURE: archive })
      }));
      const command = 'function global:Invoke-WebRequest { param([string]$Uri, [string]$OutFile) Add-Content -LiteralPath $env:CRAFTROSTER_FETCH_LOG -Value $Uri; Copy-Item -LiteralPath $env:CRAFTROSTER_ARCHIVE_FIXTURE -Destination $OutFile }; $setupText = [IO.File]::ReadAllText($env:CRAFTROSTER_SETUP); & ([scriptblock]::Create($setupText)) -Repo FixtureOwner/Catalog -Branch feature/snapshot -InstallDir $env:CRAFTROSTER_DESTINATION -DryRun';
      result = execute(selectedRuntime.executable, ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', command], {
        cwd: current.cwd, input: '1\n2\n2\n1\n', timeout: installerTimeout(selectedRuntime), env: environment(current, {
          CRAFTROSTER_ARCHIVE_FIXTURE: archive, CRAFTROSTER_FETCH_LOG: log,
          CRAFTROSTER_SETUP: path.join(root, 'scripts/setup.ps1'), CRAFTROSTER_DESTINATION: current.destination
        })
      });
    }
    const output = successful(result);
    const requests = fs.readFileSync(log, 'utf8').trim().split(/\r?\n/);
    assert.equal(requests.length, 1, `Expected one snapshot acquisition, got ${requests.length}`);
    assert.match(requests[0], /codeload\.github\.com\/FixtureOwner\/Catalog\/(?:zip|tar\.gz)\/refs\/heads\/feature\/snapshot/);
    assert.match(output, /DRY-RUN install Skill alpha /);
    assert.match(output, /DRY-RUN install Agent alpha-agent /);
    actionCounts(output, 'install', 5, 1, true);
    const paths = output.replace(/\\/g, '/');
    assert.match(paths, /\.agents\/skills\/alpha/);
    assert.match(paths, /\.codex\/agents\/alpha-agent\.toml/);
    assert.doesNotMatch(paths, /\.claude\/|\.cursor\/|\.github\/agents|\.opencode\//);
    emptyDestination(current);
  });
}

// pty.fork creates a real controlling terminal; the bootstrap script itself is
// piped to Bash. The trailing sentinel detects accidental reads from its stdin.
const ptyDriver = String.raw`
import errno, json, os, pty, select, signal, sys, time
spec = json.loads(sys.argv[1])
pid, master = pty.fork()
if pid == 0:
    os.chdir(spec['cwd'])
    os.execve(spec['bash'], [spec['bash'], '-c', 'cat "$1" | "$2" -s -- --source-dir "$3" --dir "$4" --dry-run', 'bootstrap', spec['script'], spec['bash'], spec['source'], spec['destination']], spec['env'])
output = bytearray()
sent = False
status = None
deadline = time.monotonic() + 40
try:
    while time.monotonic() < deadline:
        readable, _, _ = select.select([master], [], [], 0.1)
        if readable:
            try:
                chunk = os.read(master, 65536)
            except OSError as error:
                if error.errno != errno.EIO: raise
                chunk = b''
            output.extend(chunk)
            if not sent and b'Platform [1]' in output:
                os.write(master, spec['answers'].encode())
                sent = True
        waited, exit_status = os.waitpid(pid, os.WNOHANG)
        if waited == pid:
            status = os.waitstatus_to_exitcode(exit_status)
            os.set_blocking(master, False)
            while True:
                try:
                    remainder = os.read(master, 65536)
                    if not remainder: break
                    output.extend(remainder)
                except BlockingIOError:
                    break
                except OSError as error:
                    if error.errno != errno.EIO: raise
                    break
            break
    if status is None:
        os.killpg(pid, signal.SIGKILL)
        os.waitpid(pid, 0)
        raise RuntimeError('PTY bootstrap timed out')
finally:
    os.close(master)
print(json.dumps({'status': status, 'output': output.decode('utf-8', 'replace'), 'sent': sent}))
`;

function bashCases(selectedRuntime) {
  test(selectedRuntime, 'stdin-script bootstrap fails without a controlling terminal', () => {
    const current = fixture(selectedRuntime);
    const result = execute(selectedRuntime.executable, ['-s', '--', ...parameters(selectedRuntime, { source: current.source, dir: current.destination })], {
      input: fs.readFileSync(path.join(root, 'scripts/setup.sh'), 'utf8'),
      cwd: current.cwd, env: environment(current), detached: process.platform !== 'win32'
    });
    assert.match(failed(result), /terminal|tty/i);
    emptyDestination(current);
  });

  if (process.platform === 'win32') {
    assert(!options.requirePty, '--require-pty needs a POSIX host with Python 3');
    console.log('SKIP bash: POSIX controlling-terminal tests require a POSIX host');
    skipped += 1;
    return;
  }
  let python;
  for (const command of ['python3', 'python']) {
    const probe = spawnSync(command, ['-c', 'import pty, sys; assert sys.version_info >= (3, 9)'], { encoding: 'utf8', timeout: 10000 });
    if (!probe.error && probe.status === 0) { python = command; break; }
  }
  if (!python) {
    assert(!options.requirePty, '--require-pty requested but Python 3 with stdlib pty is unavailable');
    console.log('SKIP bash: Python 3 stdlib pty unavailable');
    skipped += 1;
    return;
  }
  const executable = successful(execute(selectedRuntime.executable, ['-c', 'printf "%s" "$BASH"'])).trim();
  for (const scenario of [
    { name: 'PTY pipeline keeps script payload intact and reads terminal answers', answers: '2\n1\n2\n1\n', status: 0, sentinel: true },
    { name: 'PTY pipeline q cancels cleanly', answers: 'q\n', status: 0 },
    { name: 'PTY pipeline EOF fails promptly', answers: '\x04', failure: true },
    { name: 'PTY pipeline Ctrl+C cancels without writes', answers: '\x03', failure: true }
  ]) test(selectedRuntime, scenario.name, () => {
    const current = fixture(selectedRuntime);
    const bootstrap = path.join(current.directory, 'bootstrap.sh');
    write(bootstrap, `${fs.readFileSync(path.join(root, 'scripts/setup.sh'), 'utf8')}\nprintf '__BOOTSTRAP_SCRIPT_PAYLOAD_REMAINS__\\n'\n`);
    const child = execute(python, ['-c', ptyDriver, JSON.stringify({
      bash: executable, script: bootstrap, source: current.source,
      destination: current.destination, cwd: current.cwd,
      env: environment(current), answers: scenario.answers
    })], { timeout: 50000 });
    successful(child);
    const result = JSON.parse(child.stdout);
    assert(result.sent, `No bootstrap menu appeared\n${result.output}`);
    if (scenario.failure) assert.notEqual(result.status, 0, result.output);
    else assert.equal(result.status, scenario.status, result.output);
    if (scenario.sentinel) {
      assert.match(result.output, /DRY-RUN install Skill alpha /);
      assert.match(result.output, /DRY-RUN install Agent alpha-agent /);
      assert.match(result.output, /__BOOTSTRAP_SCRIPT_PAYLOAD_REMAINS__/);
      ptyBootstrapExecuted = true;
    }
    emptyDestination(current);
  });
}

let testFailure;
try {
  const kinds = options.shell === 'all' ? ['powershell', 'bash'] : [options.shell];
  const runtimes = kinds.map(runtime).filter(Boolean);
  assert(runtimes.length > 0, 'No supported shell runtime found');
  if (options.requirePty) assert(runtimes.some(item => item.kind === 'bash'), '--require-pty requires Bash tests');
  for (const selectedRuntime of runtimes) {
    console.log(`Runtime ${selectedRuntime.kind}: ${selectedRuntime.executable} (${selectedRuntime.version})`);
    commonCases(selectedRuntime);
    projectScopeCases(selectedRuntime);
    backendBundleCases(selectedRuntime);
    snapshotCase(selectedRuntime);
    if (selectedRuntime.kind === 'bash') bashCases(selectedRuntime);
  }
  assert(passed > 0, 'No tests matched the requested filter');
  if (options.requirePty) assert(ptyBootstrapExecuted, '--require-pty requires the PTY bootstrap test to actually run');
} catch (error) {
  testFailure = error;
  console.error(error.stack || String(error));
} finally {
  try {
    const resolved = path.resolve(tempRoot);
    assert.equal(path.dirname(resolved), tempParent, 'Refusing unsafe fixture cleanup');
    assert(path.basename(resolved).startsWith('craftroster-interactive-'), 'Refusing unexpected fixture cleanup');
    assert(!fs.lstatSync(resolved).isSymbolicLink(), 'Refusing fixture symlink cleanup');
    fs.rmSync(resolved, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  } catch (error) {
    if (!testFailure) throw error;
    console.error(`Cleanup warning: ${error.stack || String(error)}`);
  }
}
if (testFailure) process.exitCode = 1;
else console.log(`Interactive installer tests passed: ${passed}; skipped: ${skipped}`);
