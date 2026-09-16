const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const CLI_PATH = path.join(__dirname, '..', 'craftroster-cli.js');
const EXPECTED_SKILL_COUNT = require('../skills.json').skills.length;
const MISSING_NAME = 'definitely-not-a-craftroster-component';

function runCli(args, options = {}) {
  const cliPath = options.cliPath || CLI_PATH;
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd: path.dirname(CLI_PATH),
    encoding: 'utf8',
    env: options.env || process.env,
  });
}

function combinedOutput(result) {
  return `${result.stdout || ''}${result.stderr || ''}`;
}

function assertCliCase(testCase) {
  const result = runCli(testCase.args, testCase);
  const output = combinedOutput(result);

  assert.equal(result.status, testCase.status, output);
  if (testCase.stdout) assert.match(result.stdout, testCase.stdout);
  if (testCase.stderr) assert.match(result.stderr, testCase.stderr);
  if (testCase.output) assert.match(output, testCase.output);
  if (testCase.notOutput) assert.doesNotMatch(output, testCase.notOutput);
}

const successCases = [
  {
    name: 'shows help when no command is provided',
    args: [],
    status: 0,
    stdout: /CraftRoster/,
  },
  {
    name: 'supports the help command',
    args: ['help'],
    status: 0,
    stdout: /用法:/,
  },
  {
    name: 'supports the long help option',
    args: ['--help'],
    status: 0,
    stdout: /用法:/,
  },
  {
    name: 'supports the short help option',
    args: ['-h'],
    status: 0,
    stdout: /用法:/,
  },
  {
    name: 'supports help after a known command',
    args: ['list', '--help'],
    status: 0,
    stdout: /用法:/,
  },
  {
    name: 'defaults to the Skill catalog when --type is omitted',
    args: ['list'],
    status: 0,
    stdout: new RegExp(String(EXPECTED_SKILL_COUNT)),
  },
  {
    name: 'accepts a valid Skill category',
    args: ['list', '--type', 'skill', '--category', 'software-engineering'],
    status: 0,
    stdout: /\[SOFTWARE-ENGINEERING\]/,
  },
  {
    name: 'accepts a valid Agent category',
    args: ['list', '--type', 'agent', '--category', 'quality-assurance'],
    status: 0,
    stdout: /Agent/,
  },
  {
    name: 'preserves Skill search',
    args: ['search', 'python'],
    status: 0,
    stdout: /搜尋結果/,
  },
  {
    name: 'preserves Agent search',
    args: ['s', 'reviewer', '--type', 'agent'],
    status: 0,
    stdout: /Agent 搜尋結果/,
  },
  {
    name: 'preserves Skill info',
    args: ['info', 'todo-first'],
    status: 0,
    stdout: /todo-first/,
  },
  {
    name: 'shows required installation dependencies',
    args: ['info', 'python-backend-development'],
    status: 0,
    stdout: /\[必要，自動安裝\] python-development/,
  },
  {
    name: 'explains conditional dependencies without promising auto-installation',
    args: ['info', 'image-to-code'],
    status: 0,
    stdout: /\[條件，不自動安裝\] image-to-code-assets: Independent asset exports/,
  },
  {
    name: 'shows overlap routing for a routed Skill',
    args: ['info', 'image-to-code'],
    status: 0,
    stdout: /相近 Skill 選擇:[\s\S]*Frontend Design Source and Stage[\s\S]*判斷原則:[\s\S]*\[目前\] image-to-code:[\s\S]*\[替代\] figma-to-code:/,
  },
  {
    name: 'preserves Agent info',
    args: ['info', 'code-reviewer', '--type', 'agent'],
    status: 0,
    stdout: /code-reviewer/,
  },
  {
    name: 'allows an installed catalog target',
    args: ['list', '--installed', '--target', 'codex'],
    status: 0,
    stdout: /codex/,
  },
  {
    name: 'allows all installed catalog targets',
    args: ['list', '--installed', '--all'],
    status: 0,
    stdout: /codex/,
  },
];

const usageErrorCases = [
  {
    name: 'rejects an unknown command',
    args: ['wat'],
    status: 2,
    stderr: /未知指令: wat/,
  },
  {
    name: 'rejects an unknown short option in command position',
    args: ['-x'],
    status: 2,
    stderr: /未知選項: -x/,
  },
  {
    name: 'rejects an unknown short option after a command',
    args: ['list', '-x'],
    status: 2,
    stderr: /未知選項: -x/,
  },
  {
    name: 'rejects an unknown long option',
    args: ['list', '--typ', 'agent'],
    status: 2,
    stderr: /未知選項: --typ/,
    notOutput: new RegExp(String(EXPECTED_SKILL_COUNT)),
  },
  {
    name: 'rejects unsupported --option=value syntax',
    args: ['list', '--type=agent'],
    status: 2,
    stderr: /未知選項: --type=agent/,
  },
  {
    name: 'rejects an unsupported catalog type',
    args: ['list', '--type', 'nonsense'],
    status: 2,
    stderr: /無效的 --type 值: nonsense/,
  },
  {
    name: 'rejects --type without a value',
    args: ['list', '--type'],
    status: 2,
    stderr: /缺少 --type 的值/,
  },
  {
    name: 'treats another option after --type as a missing value',
    args: ['list', '--type', '--all'],
    status: 2,
    stderr: /缺少 --type 的值/,
  },
  {
    name: 'rejects repeated --type values',
    args: ['list', '--type', 'agent', '--type', 'skill'],
    status: 2,
    stderr: /不可重複使用 --type/,
  },
  {
    name: 'rejects an unsupported target',
    args: ['list', '--installed', '--target', 'nonsense'],
    status: 2,
    stderr: /不支援的 target: nonsense/,
  },
  {
    name: 'rejects --target without a value',
    args: ['list', '--installed', '--target'],
    status: 2,
    stderr: /缺少 --target\/--agent 的值/,
  },
  {
    name: 'rejects duplicate target aliases',
    args: ['list', '--installed', '--target', 'codex', '--agent', 'claude'],
    status: 2,
    stderr: /不可重複使用 --target\/--agent/,
  },
  {
    name: 'rejects --category without a value',
    args: ['list', '--category'],
    status: 2,
    stderr: /缺少 --category 的值/,
  },
  {
    name: 'rejects duplicate categories',
    args: ['list', '--category', 'development', '--category', 'productivity'],
    status: 2,
    stderr: /不可重複使用 --category/,
  },
  {
    name: 'rejects an invalid Skill category',
    args: ['list', '--category', MISSING_NAME],
    status: 2,
    stderr: /無效的 --category 值/,
  },
  {
    name: 'rejects an invalid Agent category',
    args: ['list', '--type', 'agent', '--category', MISSING_NAME],
    status: 2,
    stderr: /無效的 --category 值/,
  },
  {
    name: 'rejects a positional argument for list',
    args: ['list', 'unexpected'],
    status: 2,
    stderr: /list 指令不接受位置參數/,
  },
  {
    name: 'requires a search query',
    args: ['search'],
    status: 2,
    stderr: /請指定搜尋關鍵字/,
  },
  {
    name: 'requires an info name',
    args: ['info'],
    status: 2,
    stderr: /請指定名稱/,
  },
  {
    name: 'rejects multiple info names',
    args: ['info', 'todo-first', 'another-name'],
    status: 2,
    stderr: /info 指令只接受一個名稱/,
  },
  {
    name: 'rejects --installed for search',
    args: ['search', 'python', '--installed'],
    status: 2,
    stderr: /--installed 不可搭配 search 指令/,
  },
  {
    name: 'rejects --category for search',
    args: ['search', 'python', '--category', 'development'],
    status: 2,
    stderr: /--category 不可搭配 search 指令/,
  },
  {
    name: 'rejects --installed for info',
    args: ['info', 'todo-first', '--installed'],
    status: 2,
    stderr: /--installed 不可搭配 info 指令/,
  },
  {
    name: 'requires --installed with --all',
    args: ['list', '--all'],
    status: 2,
    stderr: /--all 只能搭配 list --installed 使用/,
  },
  {
    name: 'requires --installed with --target',
    args: ['list', '--target', 'codex'],
    status: 2,
    stderr: /--target\/--agent 只能搭配 list --installed 使用/,
  },
  {
    name: 'rejects --category with --installed',
    args: ['list', '--installed', '--category', 'development'],
    status: 2,
    stderr: /--category 不可搭配 --installed 使用/,
  },
  {
    name: 'rejects --all with --target',
    args: ['list', '--installed', '--all', '--target', 'codex'],
    status: 2,
    stderr: /--all 與 --target\/--agent 不可同時使用/,
  },
];

const notFoundCases = [
  {
    name: 'returns not found for missing Skill info',
    args: ['info', MISSING_NAME],
    status: 1,
    stderr: /找不到技能/,
  },
  {
    name: 'returns not found for missing Agent info',
    args: ['info', MISSING_NAME, '--type', 'agent'],
    status: 1,
    stderr: /找不到 Agent/,
  },
  {
    name: 'returns not found for a Skill search without matches',
    args: ['search', MISSING_NAME],
    status: 1,
    stderr: /沒有找到符合.*的技能/,
  },
  {
    name: 'returns not found for an Agent search without matches',
    args: ['search', MISSING_NAME, '--type', 'agent'],
    status: 1,
    stderr: /沒有找到符合.*的 Agent/,
  },
];

const tests = [...successCases, ...usageErrorCases, ...notFoundCases];
let failures = 0;

function writeInstalledSkillRoot(skillRoot, name, repo) {
  const skillDir = path.join(skillRoot, name);
  fs.mkdirSync(skillDir, { recursive: true });
  fs.writeFileSync(path.join(skillDir, 'SKILL.md'), `# ${name}\n`, 'utf8');
  fs.writeFileSync(path.join(skillDir, '.skill-meta.json'), JSON.stringify({
    repo,
    component: 'skill',
    target: 'codex',
    name,
  }), 'utf8');
}

function writeInstalledSkill(codexHome, name, repo) {
  writeInstalledSkillRoot(path.join(codexHome, 'skills'), name, repo);
}

function writeInstalledAgent(codexHome, name, repo) {
  const agentDir = path.join(codexHome, 'agents');
  const agentFile = `${name}.toml`;
  fs.mkdirSync(agentDir, { recursive: true });
  fs.writeFileSync(path.join(agentDir, agentFile), `name = "${name}"\n`, 'utf8');
  fs.writeFileSync(path.join(agentDir, `${agentFile}.craftroster.json`), JSON.stringify({
    repo,
    component: 'agent',
    target: 'codex',
    adapter: 'codex',
    id: name,
    name,
  }), 'utf8');
}

function assertOwnershipFiltering() {
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'craftroster-cli-ownership-'));
  const codexHome = path.join(fixtureRoot, 'custom-codex-home');
  const userHome = path.join(fixtureRoot, 'user-home');
  try {
    writeInstalledSkill(codexHome, 'canonical-skill', 'HsinPu/CraftRoster');
    writeInstalledSkill(codexHome, 'foreign-skill', 'SomeoneElse/CraftRoster');
    writeInstalledAgent(codexHome, 'canonical-agent', 'HsinPu/CraftRoster');
    writeInstalledAgent(codexHome, 'foreign-agent', 'SomeoneElse/CraftRoster');
    writeInstalledSkillRoot(path.join(userHome, '.agents', 'skills'), 'transition-root-skill', 'HsinPu/CraftRoster');
    writeInstalledSkillRoot(path.join(userHome, '.agents', 'skills'), 'unmigrated-legacy-skill', 'HsinPu/Autoverse-Ai-Agent-Skills');

    const env = {
      ...process.env,
      CODEX_HOME: codexHome,
      HOME: userHome,
      USERPROFILE: userHome,
    };
    const skills = runCli(['list', '--installed', '--target', 'codex'], { env });
    assert.equal(skills.status, 0, combinedOutput(skills));
    assert.match(skills.stdout, /canonical-skill/);
    assert.match(skills.stdout, /transition-root-skill/);
    assert.doesNotMatch(skills.stdout, /foreign-skill/);
    assert.doesNotMatch(skills.stdout, /unmigrated-legacy-skill/);

    const agents = runCli(['list', '--installed', '--type', 'agent', '--target', 'codex'], { env });
    assert.equal(agents.status, 0, combinedOutput(agents));
    assert.match(agents.stdout, /canonical-agent/);
    assert.doesNotMatch(agents.stdout, /foreign-agent/);
  } finally {
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
  }
}

function assertOptionalDependencyInfo() {
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'craftroster-cli-optional-'));
  try {
    const cliPath = path.join(fixtureRoot, 'craftroster-cli.js');
    fs.copyFileSync(CLI_PATH, cliPath);
    fs.writeFileSync(path.join(fixtureRoot, 'skills.json'), JSON.stringify({ routingGroups: [], skills: [{
      name: 'root-skill', description: 'Isolated optional dependency fixture.', category: 'fixtures',
      author: 'Fixture', source: 'Fixture/Repository', license: 'Apache-2.0', tags: ['fixture'],
      dependencies: [{ name: 'base-skill', kind: 'required' },
        { name: 'conditional-skill', kind: 'conditional', when: 'Only for this feature.' },
        { name: 'optional-skill', kind: 'optional' }],
    }] }));
    const result = runCli(['info', 'root-skill'], { cliPath });
    assert.equal(result.status, 0, combinedOutput(result));
    assert.match(result.stdout, /\[必要，自動安裝\] base-skill/);
    assert.match(result.stdout, /\[條件，不自動安裝\] conditional-skill: Only for this feature\./);
    assert.match(result.stdout, /\[可選，不自動安裝\] optional-skill/);
    assert.doesNotMatch(result.stdout, /undefined|\[條件，不自動安裝\] optional-skill/);
    const help = runCli(['--help'], { cliPath });
    assert.equal(help.status, 0, combinedOutput(help));
    assert.match(help.stdout, /required（必要）依賴會自動安裝；conditional（條件）與 optional（可選）依賴不自動安裝/);
  } finally {
    const resolved = path.resolve(fixtureRoot);
    if (path.dirname(resolved) !== path.resolve(os.tmpdir()) || !path.basename(resolved).startsWith('craftroster-cli-optional-')) throw new Error('Unsafe fixture cleanup');
    fs.rmSync(resolved, { recursive: true, force: true });
  }
}

for (const testCase of tests) {
  try {
    assertCliCase(testCase);
    console.log(`PASS ${testCase.name}`);
  } catch (error) {
    failures += 1;
    console.error(`FAIL ${testCase.name}`);
    console.error(error.stack || error.message);
  }
}

try {
  assertOwnershipFiltering();
  console.log('PASS scans the Codex transition root but accepts only CraftRoster ownership');
} catch (error) {
  failures += 1;
  console.error('FAIL scans the Codex transition root but accepts only CraftRoster ownership');
  console.error(error.stack || error.message);
}

try {
  assertOptionalDependencyInfo();
  console.log('PASS distinguishes required, conditional and optional dependencies in an isolated catalog');
} catch (error) {
  failures += 1;
  console.error('FAIL distinguishes required, conditional and optional dependencies in an isolated catalog');
  console.error(error.stack || error.message);
}

if (failures > 0) {
  console.error(`CLI tests failed: ${failures}/${tests.length + 2}`);
  process.exit(1);
}

console.log(`CLI tests passed: ${tests.length + 2}`);
