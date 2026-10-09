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
  return isPowerShell5(selectedRuntime) ? 600000 : 90000;
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

const skillNames = ['alpha', 'beta', 'base', 'conditional', 'optional', 'subagent-architecture'];
const agentNames = ['alpha-agent', 'beta-agent'];
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
      'skill\tz-library\toptional', 'skill\ta-first\talpha', 'skill\tz-library\tconditional'
    ].join('\n') + '\n');
  write(path.join(current.source, 'scripts/data/install-skill-dependencies.tsv'),
    'skill\tdependency\tkind\twhen\nalpha\tbase\trequired\t-\nalpha\tconditional\tconditional\tOnly for a specialist task.\nalpha\toptional\toptional\t-\nbeta\tbase\trequired\t-\n');
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
  // An npm process launched by another PowerShell version can carry its module
  // search path into this runtime, including an incompatible Archive module.
  delete env.PSModulePath;
  return env;
}

function parameters(selectedRuntime, values) {
  const flags = selectedRuntime.kind === 'powershell'
    ? { source: '-SourceDir', dir: '-InstallDir', repo: '-Repo', branch: '-Branch', dry: '-DryRun', force: '-Force', target: '-Target', type: '-Type', name: '-Name', category: '-Category' }
    : { source: '--source-dir', dir: '--dir', repo: '--repo', branch: '--branch', dry: '--dry-run', force: '--force', target: '--target', type: '--type', name: '--name', category: '--category' };
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

function installedAgents(current, directory, expectedNames, profile, target) {
  const names = fs.readdirSync(directory).filter(filename => filename.endsWith(profile.suffix));
  assert.deepEqual(names.sort(), expectedNames.map(name => `${name}${profile.suffix}`).sort());
  for (const name of expectedNames) {
    const filename = `${name}${profile.suffix}`;
    assert.equal(fs.readFileSync(path.join(directory, filename), 'utf8'), fs.readFileSync(path.join(current.source, 'adapters', profile.adapter, filename), 'utf8'));
    const metadata = JSON.parse(fs.readFileSync(path.join(directory, `${filename}.craftroster.json`), 'utf8'));
    for (const [key, value] of Object.entries({ source: 'local-checkout', repo: 'HsinPu/CraftRoster', branch: 'main', component: 'agent', id: name, name, adapter: profile.adapter, target })) assert.equal(metadata[key], value, `${filename} metadata ${key}`);
  }
}

function preflightBeforeWrites(output) {
  const firstWrite = output.search(installationLine);
  const lastPreflight = output.lastIndexOf('DRY-RUN ');
  assert(firstWrite >= 0, `No actual backend installation was reported\n${output}`);
  assert(lastPreflight >= 0 && lastPreflight < firstWrite, `Not every backend batch was preflighted before writing\n${output}`);
}

function test(selectedRuntime, name, callback) {
  if (caseFilter && !caseFilter.test(name)) return;
  callback();
  passed += 1;
  console.log(`PASS ${selectedRuntime.kind}: ${name}`);
}

function commonCases(selectedRuntime) {
  if (selectedRuntime.kind === 'powershell') test(selectedRuntime, 'paths with spaces and trailing backslashes preserve dry-run and the exact destination', () => {
    const current = fixture(selectedRuntime);
    const renamedSource = path.join(current.directory, 'source checkout with spaces');
    fs.renameSync(current.source, renamedSource);
    current.source = renamedSource;
    current.destination = path.join(current.directory, 'destination with spaces');
    const values = { source: `${current.source}\\`, dir: `${current.destination}\\` };
    const output = successful(invoke(current, '2\n1\n1\n', { ...values, dry: true }));
    assert.match(output, /DRY-RUN install Skill alpha /);
    assert.doesNotMatch(output, installationLine);
    emptyDestination(current);
    successful(invoke(current, '2\n1\n1\ny\n', values));
    installedSkills(current, current.destination, ['alpha', 'base'], 'claude');
  });

  test(selectedRuntime, 'multi-category Skills preserve required closure and forwarded repo/branch', () => {
    const current = fixture(selectedRuntime);
    const output = successful(invoke(current, '2\n1\n2, 1 2\ny\n', { repo: 'FixtureOwner/Catalog', branch: 'feature/interactive-fixture' }));
    installedSkills(current, current.destination, ['alpha', 'beta', 'base'], 'claude', 'FixtureOwner/Catalog', 'feature/interactive-fixture');
    assert.match(output, /conditional/i);
    assert(!fs.existsSync(path.join(current.destination, 'conditional')));
    assert(!fs.existsSync(path.join(current.destination, 'optional')));
    preflightBeforeWrites(output);
  });

  test(selectedRuntime, 'both modes and prompted project path install every project profile', () => {
    const current = fixture(selectedRuntime);
    current.destination = path.join(current.directory, 'chosen project with spaces');
    const answerPath = shellPath(current.destination, selectedRuntime);
    const output = successful(invoke(current, `6\n3\n1\n2,1\n${answerPath}\ny\n`, { dir: undefined }));
    for (const relative of ['.agents/skills', '.claude/skills']) installedSkills(current, path.join(current.destination, relative), ['alpha', 'base'], 'project');
    for (const profile of profiles) installedAgents(current, path.join(current.destination, profile.project), agentNames, profile, 'project');
    assert.doesNotMatch(output, /Enable proactive Agent delegation\?/i);
    preflightBeforeWrites(output);
  });

  test(selectedRuntime, 'Enter defaults select codex, both and all while dry-run writes nothing', () => {
    const current = fixture(selectedRuntime);
    const output = successful(invoke(current, '\n\n\n\n\n', { dry: true }));
    assert.match(output, /DRY-RUN install Skill alpha /);
    assert.match(output, /DRY-RUN install Skill conditional /);
    assert.match(output, /DRY-RUN install Agent alpha-agent .*alpha-agent\.toml/);
    assert.match(output, /DRY-RUN install Agent beta-agent .*beta-agent\.toml/);
    assert.doesNotMatch(output, /Install this plan\?/i);
    assert.doesNotMatch(output, installationLine);
    emptyDestination(current);
  });

  test(selectedRuntime, 'all Agents and explicit Codex delegation install companion and managed config', () => {
    const current = fixture(selectedRuntime);
    const output = successful(invoke(current, '1\n2\n0\ny\ny\n', { dir: undefined }));
    installedAgents(current, path.join(current.home, '.codex/agents'), agentNames, profiles[0], 'codex');
    installedSkills(current, path.join(current.home, '.codex/skills'), ['subagent-architecture'], 'codex');
    const config = fs.readFileSync(path.join(current.home, '.codex/config.toml'), 'utf8');
    assert.match(config, /CRAFTROSTER_AUTO_DELEGATION_START/);
    assert.match(config, /Delegate bounded independent tasks/);
    preflightBeforeWrites(output);
  });

  test(selectedRuntime, 'OpenCode delegation defaults to N and explicit Y updates its config', () => {
    const current = fixture(selectedRuntime);
    successful(invoke(current, '5\n2\n1\n\ny\n', { dir: undefined }));
    const configRoot = path.join(current.home, '.config/opencode');
    installedAgents(current, path.join(configRoot, 'agents'), ['alpha-agent'], profiles[4], 'opencode');
    assert(!fs.existsSync(path.join(configRoot, 'opencode.json')));
    assert(!fs.existsSync(path.join(configRoot, 'skills')));
    successful(invoke(current, '5\n2\n2\ny\ny\n', { dir: undefined }));
    installedAgents(current, path.join(configRoot, 'agents'), agentNames, profiles[4], 'opencode');
    installedSkills(current, path.join(configRoot, 'skills'), ['subagent-architecture'], 'opencode');
    const config = JSON.parse(fs.readFileSync(path.join(configRoot, 'opencode.json'), 'utf8'));
    assert.deepEqual(config.instructions.map(item => item.replace(/\\/g, '/')), [shellPath(path.join(configRoot, 'skills/subagent-architecture/references/global-auto-delegation.md'), selectedRuntime).replace(/\\/g, '/')]);
  });

  test(selectedRuntime, 'confirmation defaults to N and q cancels after a complete preflight', () => {
    for (const answer of ['', 'n', 'q']) {
      const current = fixture(selectedRuntime);
      const output = successful(invoke(current, `2\n1\n1\n${answer}\n`));
      assert.match(output, /DRY-RUN install Skill alpha /);
      assert.doesNotMatch(output, installationLine);
      emptyDestination(current);
    }
  });

  test(selectedRuntime, 'q cancels at platform, category and delegation prompts', () => {
    for (const answers of ['q\n', '2\n1\nq\n', '1\n2\n1\nq\n']) {
      const current = fixture(selectedRuntime);
      successful(invoke(current, answers));
      emptyDestination(current);
    }
  });

  test(selectedRuntime, 'EOF at selection and confirmation fails promptly without writes', () => {
    for (const answers of ['', '2\n1\n', '2\n1\n1\n']) {
      const current = fixture(selectedRuntime);
      // Confirmation follows a real backend preflight; its cost is not input
      // waiting. Earlier EOF cases never launch a backend and retain a short cap.
      const timeout = answers === '2\n1\n1\n' ? installerTimeout(selectedRuntime)
        : isPowerShell5(selectedRuntime) ? 60000 : 30000;
      const eofMessage = selectedRuntime.kind === 'powershell'
        ? /End of input while reading/ : /Input ended \(EOF\)/;
      assert.match(failed(invoke(current, answers, {}, false, { timeout })), eofMessage);
      emptyDestination(current);
    }
  });

  test(selectedRuntime, 'invalid category retries preserve the valid selection and retry bound', () => {
    const current = fixture(selectedRuntime);
    successful(invoke(current, '2\n1\n99\n1,,2\n1\ny\n'));
    installedSkills(current, current.destination, ['alpha', 'base'], 'claude');
    const rejected = fixture(selectedRuntime);
    failed(invoke(rejected, '2\n1\n99\n0 1\n,\ny\n'));
    emptyDestination(rejected);
  });

  test(selectedRuntime, 'confirmation accepts only y or n with a bounded retry', () => {
    const current = fixture(selectedRuntime);
    successful(invoke(current, '2\n1\n1\nyes\ny\n'));
    installedSkills(current, current.destination, ['alpha', 'base'], 'claude');
    const rejected = fixture(selectedRuntime);
    failed(invoke(rejected, '2\n1\n1\nyes\nmaybe\nyes\ny\n'));
    emptyDestination(rejected);
  });

  test(selectedRuntime, 'a selected foreign component in a later batch prevents every write', () => {
    const current = fixture(selectedRuntime);
    write(path.join(current.destination, 'beta/SKILL.md'), 'FOREIGN selected component\n');
    const before = snapshot(current.destination);
    const output = failed(invoke(current, '2\n1\n1 2\ny\n'));
    assert.match(output, /DRY-RUN install Skill alpha /);
    assert.doesNotMatch(output, installationLine);
    assert.deepEqual(snapshot(current.destination), before);
    untouchedHome(current);
  });

  test(selectedRuntime, 'a later project Agent profile blocks earlier Skill and Agent batches', () => {
    const current = fixture(selectedRuntime);
    write(path.join(current.destination, '.github/agents/beta-agent.agent.md'), 'FOREIGN Agent profile\n');
    const before = snapshot(current.destination);
    const output = failed(invoke(current, '6\n3\n1\n2\ny\n'));
    assert.match(output, /DRY-RUN install Skill alpha /);
    assert.doesNotMatch(output, installationLine);
    assert.deepEqual(snapshot(current.destination), before);
    untouchedHome(current);
  });

  test(selectedRuntime, 'force is forwarded to required dependencies and preserves unselected foreign content', () => {
    const current = fixture(selectedRuntime);
    write(path.join(current.destination, 'base/user.txt'), 'FOREIGN required dependency\n');
    write(path.join(current.destination, 'conditional/user.txt'), 'FOREIGN unselected conditional\n');
    const output = successful(invoke(current, '2\n1\n1\ny\n', { force: true }));
    assert.match(output, /force-replace Skill base /);
    assert(!fs.existsSync(path.join(current.destination, 'base/user.txt')));
    assert.equal(fs.readFileSync(path.join(current.destination, 'conditional/user.txt'), 'utf8'), 'FOREIGN unselected conditional\n');
    assert(!fs.existsSync(path.join(current.destination, 'conditional/.skill-meta.json')));
    const metadata = JSON.parse(fs.readFileSync(path.join(current.destination, 'base/.skill-meta.json'), 'utf8'));
    assert.equal(metadata.component, 'skill');
    assert.equal(metadata.name, 'base');
    assert.equal(metadata.target, 'claude');
    preflightBeforeWrites(output);
  });

  test(selectedRuntime, 'malformed category source fails before installation', () => {
    const current = fixture(selectedRuntime);
    write(path.join(current.source, 'scripts/data/install-category-index.tsv'), 'type\twrong\tname\nskill\ta-first\talpha\n');
    failed(invoke(current, '2\n1\n1\ny\n'));
    emptyDestination(current);
  });

  test(selectedRuntime, 'legacy noninteractive CLI keeps named install and full Agent behavior', () => {
    const current = fixture(selectedRuntime);
    const output = successful(invoke(current, '', { target: 'claude', type: 'skill', name: 'alpha' }, true));
    installedSkills(current, current.destination, ['alpha', 'base'], 'claude');
    assert.doesNotMatch(output, /Platform \[|Content \[|categories \[|Install this plan\?/);
    const all = fixture(selectedRuntime);
    const dryOutput = successful(invoke(all, '', { target: 'codex', type: 'agent', dry: true }, true));
    assert.match(dryOutput, /DRY-RUN install Skill subagent-architecture /);
    assert.match(dryOutput, /DRY-RUN install Agent beta-agent /);
    assert.doesNotMatch(dryOutput, /Platform \[|Content \[|categories \[|Install this plan\?/);
    emptyDestination(all);
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
        cwd: current.cwd, input: '6\n3\n1\n1\n', env: environment(current, {
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
        cwd: current.cwd, input: '6\n3\n1\n1\n', timeout: installerTimeout(selectedRuntime), env: environment(current, {
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
    { name: 'PTY pipeline keeps script payload intact and reads terminal answers', answers: '2\n1\n1\n', status: 0, sentinel: true },
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
