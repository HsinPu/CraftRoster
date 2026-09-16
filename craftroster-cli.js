#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');

const SKILLS_JSON = path.join(__dirname, 'skills.json');
const AGENTS_JSON = path.join(__dirname, 'agents.json');
const REPOSITORY_ID = 'HsinPu/CraftRoster';
const homeDir = os.homedir();
const codexHome = process.env.CODEX_HOME || path.join(homeDir, '.codex');
const projectRoot = process.cwd();
const openCodeHome = process.env.OPENCODE_CONFIG_DIR ||
  (process.env.XDG_CONFIG_HOME
    ? path.join(process.env.XDG_CONFIG_HOME, 'opencode')
    : path.join(homeDir, '.config', 'opencode'));
const SUPPORTED_CATALOG_TYPES = ['skill', 'agent'];
const SUPPORTED_TARGETS = ['codex', 'claude', 'cursor', 'vscode', 'copilot', 'opencode', 'project'];
const ALL_TARGETS = ['codex', 'claude', 'cursor', 'copilot', 'opencode', 'project'];
const COMMAND_ALIASES = new Map([
  ['help', 'help'],
  ['info', 'info'],
  ['list', 'list'],
  ['ls', 'list'],
  ['search', 'search'],
  ['s', 'search'],
]);
const VALUE_OPTIONS = new Map([
  ['--agent', { key: 'target', label: '--target/--agent' }],
  ['--category', { key: 'category', label: '--category' }],
  ['--target', { key: 'target', label: '--target/--agent' }],
  ['--type', { key: 'catalogType', label: '--type' }],
]);
const FLAG_OPTIONS = new Map([
  ['--all', 'all'],
  ['--help', 'help'],
  ['--installed', 'installed'],
  ['-h', 'help'],
]);
const OPTION_LABELS = {
  all: '--all',
  category: '--category',
  help: '--help/-h',
  installed: '--installed',
  target: '--target/--agent',
};

function uniquePaths(values) {
  const seen = new Set();
  return values.filter((value) => {
    const resolved = path.resolve(value);
    const key = process.platform === 'win32' ? resolved.toLowerCase() : resolved;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const codexSkillRoots = uniquePaths([
  path.join(codexHome, 'skills'),
  path.join(homeDir, '.agents', 'skills'),
  path.join(homeDir, '.codex', 'skills'),
]);

const SKILL_PROFILE_PATHS = {
  codex: codexSkillRoots.map((dir, index) => ({
    label: index === 0 ? 'codex' : 'codex (transition root)',
    dir,
    target: 'codex',
  })),
  claude: [{ label: 'claude', dir: path.join(homeDir, '.claude', 'skills'), target: 'claude' }],
  cursor: [{ label: 'cursor', dir: path.join(homeDir, '.cursor', 'skills'), target: 'cursor' }],
  copilot: [{ label: 'copilot', dir: path.join(homeDir, '.copilot', 'skills'), target: 'copilot' }],
  opencode: [{ label: 'opencode', dir: path.join(openCodeHome, 'skills'), target: 'opencode' }],
  project: [
    {
      label: 'project/shared (codex/cursor/copilot/opencode)',
      dir: path.join(projectRoot, '.agents', 'skills'),
      target: 'project',
    },
    { label: 'project/claude', dir: path.join(projectRoot, '.claude', 'skills'), target: 'project' },
  ],
};

const AGENT_PROFILE_PATHS = {
  codex: [{ label: 'codex', dir: path.join(codexHome, 'agents'), extension: '.toml', adapter: 'codex', target: 'codex' }],
  claude: [{ label: 'claude', dir: path.join(homeDir, '.claude', 'agents'), extension: '.md', adapter: 'claude', target: 'claude' }],
  cursor: [{ label: 'cursor', dir: path.join(homeDir, '.cursor', 'agents'), extension: '.md', adapter: 'cursor', target: 'cursor' }],
  copilot: [{ label: 'copilot', dir: path.join(homeDir, '.copilot', 'agents'), extension: '.agent.md', adapter: 'copilot', target: 'copilot' }],
  opencode: [{ label: 'opencode', dir: path.join(openCodeHome, 'agents'), extension: '.md', adapter: 'opencode', target: 'opencode' }],
  project: [
    { label: 'project/codex', dir: path.join(projectRoot, '.codex', 'agents'), extension: '.toml', adapter: 'codex', target: 'project' },
    { label: 'project/claude', dir: path.join(projectRoot, '.claude', 'agents'), extension: '.md', adapter: 'claude', target: 'project' },
    { label: 'project/cursor', dir: path.join(projectRoot, '.cursor', 'agents'), extension: '.md', adapter: 'cursor', target: 'project' },
    { label: 'project/copilot', dir: path.join(projectRoot, '.github', 'agents'), extension: '.agent.md', adapter: 'copilot', target: 'project' },
    { label: 'project/opencode', dir: path.join(projectRoot, '.opencode', 'agents'), extension: '.md', adapter: 'opencode', target: 'project' },
  ],
};

function canonicalizeTarget(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!SUPPORTED_TARGETS.includes(normalized)) return null;
  return normalized === 'vscode' ? 'copilot' : normalized;
}

function reportUnknownTarget(value) {
  reportUsageError(
    `不支援的 target: ${value || '(空白)'}`,
    `可用 targets: ${SUPPORTED_TARGETS.join(', ')}`,
  );
}

function reportUsageError(message, detail = null) {
  console.error(message);
  if (detail) console.error(detail);
  process.exitCode = 2;
  return false;
}

function reportNotFound(message) {
  console.error(message);
  process.exitCode = 1;
}

function parseCommandLine(values) {
  if (values.length === 0) {
    return {
      all: false,
      catalogType: 'skill',
      category: null,
      command: 'help',
      help: false,
      installed: false,
      positionals: [],
      provided: new Set(),
      target: 'codex',
    };
  }

  const commandToken = values[0];
  if (commandToken === '--help' || commandToken === '-h') {
    if (values.length > 1) {
      reportUsageError(`${commandToken} 不可與其他參數或選項併用。`);
      return null;
    }
    return {
      all: false,
      catalogType: 'skill',
      category: null,
      command: 'help',
      help: true,
      installed: false,
      positionals: [],
      provided: new Set(['help']),
      target: 'codex',
    };
  }

  const command = COMMAND_ALIASES.get(commandToken);
  if (!command) {
    const message = commandToken.startsWith('-')
      ? `未知選項: ${commandToken}`
      : `未知指令: ${commandToken}`;
    reportUsageError(message, '使用 craftroster help 查看可用指令。');
    return null;
  }

  const parsed = {
    all: false,
    catalogType: 'skill',
    category: null,
    command,
    help: false,
    installed: false,
    positionals: [],
    provided: new Set(),
    target: 'codex',
  };

  for (let index = 1; index < values.length; index += 1) {
    const token = values[index];
    const valueOption = VALUE_OPTIONS.get(token);
    if (valueOption) {
      if (parsed.provided.has(valueOption.key)) {
        reportUsageError(`不可重複使用 ${valueOption.label}。請只指定一個值。`);
        return null;
      }
      const optionValue = values[index + 1];
      if (!optionValue || optionValue.startsWith('-')) {
        reportUsageError(`缺少 ${valueOption.label} 的值。`);
        return null;
      }
      parsed.provided.add(valueOption.key);
      parsed[valueOption.key] = optionValue;
      index += 1;
      continue;
    }

    const flagKey = FLAG_OPTIONS.get(token);
    if (flagKey) {
      if (parsed.provided.has(flagKey)) {
        reportUsageError(`不可重複使用 ${OPTION_LABELS[flagKey]}。`);
        return null;
      }
      parsed.provided.add(flagKey);
      parsed[flagKey] = true;
      continue;
    }

    if (token.startsWith('-')) {
      reportUsageError(`未知選項: ${token}`);
      return null;
    }

    parsed.positionals.push(token);
  }

  if (!SUPPORTED_CATALOG_TYPES.includes(parsed.catalogType)) {
    reportUsageError(
      `無效的 --type 值: ${parsed.catalogType}`,
      `允許的值: ${SUPPORTED_CATALOG_TYPES.join(', ')}`,
    );
    return null;
  }

  if (parsed.provided.has('target') && !canonicalizeTarget(parsed.target)) {
    reportUnknownTarget(parsed.target);
    return null;
  }

  return parsed;
}

function getCatalogCategories(catalogType) {
  const items = catalogType === 'agent'
    ? (loadAgentsJson().agents || [])
    : (loadSkillsJson().skills || []);
  return [...new Set(items.map(item => item.category).filter(Boolean))].sort();
}

function validateCommandGrammar(parsed) {
  if (parsed.help) {
    const hasOtherOptions = [...parsed.provided].some(key => key !== 'help');
    if (hasOtherOptions || parsed.positionals.length > 0) {
      return reportUsageError('--help/-h 不可與其他參數或選項併用。');
    }
    return true;
  }

  if (parsed.command === 'help') {
    if (parsed.provided.size > 0 || parsed.positionals.length > 0) {
      return reportUsageError('help 指令不接受其他參數或選項。');
    }
    return true;
  }

  if (parsed.command === 'list') {
    if (parsed.positionals.length > 0) {
      return reportUsageError('list 指令不接受位置參數。');
    }
    if (parsed.all && parsed.provided.has('target')) {
      return reportUsageError('--all 與 --target/--agent 不可同時使用。');
    }
    if (parsed.all && !parsed.installed) {
      return reportUsageError('--all 只能搭配 list --installed 使用。');
    }
    if (parsed.provided.has('target') && !parsed.installed) {
      return reportUsageError('--target/--agent 只能搭配 list --installed 使用。');
    }
    if (parsed.installed && parsed.category) {
      return reportUsageError('--category 不可搭配 --installed 使用。');
    }
    if (parsed.category) {
      const categories = getCatalogCategories(parsed.catalogType);
      if (!categories.includes(parsed.category)) {
        return reportUsageError(
          `無效的 --category 值: ${parsed.category}`,
          `可用類別: ${categories.join(', ')}`,
        );
      }
    }
    return true;
  }

  const unsupportedOption = ['all', 'installed', 'target', 'category']
    .find(key => parsed.provided.has(key));
  if (unsupportedOption) {
    return reportUsageError(`${OPTION_LABELS[unsupportedOption]} 不可搭配 ${parsed.command} 指令。`);
  }

  if (parsed.command === 'search') {
    if (parsed.positionals.length === 0) {
      return reportUsageError('請指定搜尋關鍵字。', '用法: craftroster search <關鍵字>');
    }
    return true;
  }

  if (parsed.command === 'info') {
    if (parsed.positionals.length === 0) {
      return reportUsageError('請指定名稱。', '用法: craftroster info <名稱>');
    }
    if (parsed.positionals.length > 1) {
      return reportUsageError('info 指令只接受一個名稱。');
    }
  }

  return true;
}

function loadSkillsJson() {
  try {
    if (fs.existsSync(SKILLS_JSON)) {
      return JSON.parse(fs.readFileSync(SKILLS_JSON, 'utf8'));
    }
  } catch (e) {
    console.log(`警告: 無法讀取 skills.json: ${e.message}`);
  }
  return { skills: [] };
}

function loadAgentsJson() {
  try {
    if (fs.existsSync(AGENTS_JSON)) return JSON.parse(fs.readFileSync(AGENTS_JSON, 'utf8'));
  } catch (e) {
    console.log(`警告: 無法讀取 agents.json: ${e.message}`);
  }
  return { agents: [] };
}

function listAgents(category = null) {
  let agents = loadAgentsJson().agents || [];
  if (category) agents = agents.filter(agent => agent.category === category);
  if (agents.length === 0) {
    console.log('沒有找到任何 Agent');
    return;
  }
  console.log(`可用 Agent (${agents.length} 個):\n`);
  const byCategory = {};
  for (const agent of agents) (byCategory[agent.category] ||= []).push(agent);
  for (const categoryName of Object.keys(byCategory).sort()) {
    console.log(`[${categoryName}]`);
    for (const agent of byCategory[categoryName]) {
      console.log(`  ${agent.id}`);
      console.log(`    ${agent.description.slice(0, 80)}${agent.description.length > 80 ? '...' : ''}`);
    }
    console.log('');
  }
}

function rankMatches(items, query, fieldsFor) {
  const q = query.trim().toLowerCase();
  const terms = tokenizeSearchText(q);
  return items.map((item, index) => {
    const fields = fieldsFor(item).map(value => String(value).toLowerCase());
    const exact = fields.slice(0, 2);
    const haystack = fields.join(' ');
    const tokens = new Set(tokenizeSearchText(haystack));
    let score = 0;
    if (exact.includes(q)) score = 100;
    else if (exact.some(value => value.includes(q))) score = 90;
    else if (fields.some(value => value.includes(q))) score = 70;
    else if (terms.length > 0 && terms.every(term => tokens.has(term))) score = 30;
    return { item, score, index };
  }).filter(result => result.score > 0)
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .map(result => result.item);
}

function searchAgents(query) {
  const matches = rankMatches(loadAgentsJson().agents || [], query, agent => [
    agent.id, agent.name, agent.role, agent.category, agent.description, ...(agent.tags || [])
  ]);
  if (matches.length === 0) {
    reportNotFound(`沒有找到符合 "${query}" 的 Agent`);
    return;
  }
  console.log(`Agent 搜尋結果 (${matches.length} 個):\n`);
  for (const agent of matches) {
    console.log(`  ${agent.id} (${agent.permission})`);
    console.log(`    ${agent.description.slice(0, 90)}${agent.description.length > 90 ? '...' : ''}\n`);
  }
}

function listSkills(category = null) {
  const data = loadSkillsJson();
  let skills = data.skills || [];

  if (category) {
    skills = skills.filter(s => s.category === category);
  }

  if (skills.length === 0) {
    console.log('沒有找到任何技能');
    return;
  }

  console.log(`可用技能 (${skills.length} 個):\n`);

  const byCategory = {};
  skills.forEach(s => {
    const cat = s.category || 'other';
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(s);
  });

  Object.keys(byCategory).sort().forEach(cat => {
    console.log(`[${cat.toUpperCase()}]`);
    byCategory[cat].forEach(skill => {
      console.log(`  ${skill.name}`);
      console.log(`    ${skill.description.slice(0, 60)}${skill.description.length > 60 ? '...' : ''}`);
    });
    console.log('');
  });
}

function searchSkills(query) {
  const data = loadSkillsJson();
  const q = query.trim().toLowerCase();
  const terms = tokenizeSearchText(q);

  const matches = data.skills.map((skill, index) => {
    const name = skill.name.toLowerCase();
    const description = skill.description.toLowerCase();
    const tags = (skill.tags || []).map(tag => tag.toLowerCase());
    const haystack = [name, description, ...tags].join(' ');
    const nameTokens = new Set(tokenizeSearchText(name));
    const tagTokens = new Set(tokenizeSearchText(tags.join(' ')));
    const normalizedTokens = new Set(tokenizeSearchText(haystack));
    const nameAndTagTokens = new Set(tokenizeSearchText([name, ...tags].join(' ')));

    let score = 0;
    if (name === q || tags.includes(q)) score = 100;
    else if (name.includes(q)) score = 90;
    else if (tags.some(tag => tag.includes(q))) score = 80;
    else if (description.includes(q)) score = 70;
    else if (terms.length > 0 && terms.every(term => nameTokens.has(term))) score = 75;
    else if (terms.length > 0 && terms.every(term => nameAndTagTokens.has(term))) score = 60;
    else if (terms.length > 0 && terms.every(term => tagTokens.has(term))) score = 50;
    else if (terms.length > 0 && terms.every(term => normalizedTokens.has(term))) score = 30;

    return { skill, score, index };
  }).filter(result => result.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(result => result.skill);

  if (matches.length === 0) {
    reportNotFound(`沒有找到符合 "${query}" 的技能`);
    return;
  }

  console.log(`搜尋結果 (${matches.length} 個):\n`);
  matches.forEach(skill => {
    const tags = skill.tags ? ` [${skill.tags.slice(0, 3).join(', ')}]` : '';
    console.log(`  ${skill.name}${tags}`);
    console.log(`    ${skill.description.slice(0, 70)}${skill.description.length > 70 ? '...' : ''}`);
    console.log('');
  });
}

function tokenizeSearchText(value) {
  return value
    .replace(/[^a-z0-9+#\u3400-\u9fff]+/gi, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function readJsonFile(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''));
  } catch {
    return null;
  }
}

function isCraftRosterRepository(repositoryId) {
  return repositoryId === REPOSITORY_ID;
}

function findInstalledSkills(profile) {
  if (!fs.existsSync(profile.dir)) return [];
  try {
    return fs.readdirSync(profile.dir).filter((name) => {
      const skillPath = path.join(profile.dir, name);
      const metadataPath = path.join(skillPath, '.skill-meta.json');
      try {
        if (!fs.statSync(skillPath).isDirectory() || !fs.existsSync(path.join(skillPath, 'SKILL.md'))) return false;
      } catch {
        return false;
      }
      const metadata = readJsonFile(metadataPath);
      return isCraftRosterRepository(metadata?.repo) && metadata.component === 'skill' &&
        metadata.target === profile.target && metadata.name === name;
    }).sort();
  } catch {
    return [];
  }
}

function listInstalled(targetName) {
  const canonicalTarget = canonicalizeTarget(targetName);
  if (!canonicalTarget) {
    reportUnknownTarget(targetName);
    return;
  }
  const profiles = SKILL_PROFILE_PATHS[canonicalTarget];
  if (canonicalTarget === 'codex') {
    const installed = [...new Set(profiles.flatMap(findInstalledSkills))].sort();
    const label = targetName.toLowerCase();
    if (installed.length === 0) console.log(`${label}: 尚未安裝任何技能`);
    else {
      console.log(`${label} 已安裝 (${installed.length} 個):`);
      installed.forEach(name => console.log(`  ${name}`));
    }
    return;
  }
  for (const profile of profiles) {
    const label = canonicalTarget === 'project' ? profile.label : targetName.toLowerCase();
    const installed = findInstalledSkills(profile);
    if (installed.length === 0) console.log(`${label}: 尚未安裝任何技能`);
    else {
      console.log(`${label} 已安裝 (${installed.length} 個):`);
      installed.forEach(name => console.log(`  ${name}`));
    }
  }
}

function findInstalledAgents(profile) {
  if (!fs.existsSync(profile.dir)) return [];
  try {
    return fs.readdirSync(profile.dir)
      .filter((name) => {
        if (!name.endsWith(profile.extension)) return false;
        const role = path.basename(name, profile.extension);
        const metadata = readJsonFile(path.join(profile.dir, `${name}.craftroster.json`));
        return isCraftRosterRepository(metadata?.repo) && metadata.component === 'agent' &&
          metadata.target === profile.target && metadata.adapter === profile.adapter &&
          metadata.id === role && metadata.name === role;
      })
      .map(name => path.basename(name, profile.extension))
      .sort();
  } catch {
    return [];
  }
}

function listInstalledAgents(targetName) {
  const canonicalTarget = canonicalizeTarget(targetName);
  if (!canonicalTarget) {
    reportUnknownTarget(targetName);
    return;
  }
  const profiles = AGENT_PROFILE_PATHS[canonicalTarget];
  for (const profile of profiles) {
    const label = canonicalTarget === 'project' ? profile.label : targetName.toLowerCase();
    const installed = findInstalledAgents(profile);
    if (installed.length === 0) console.log(`${label}: 尚未安裝任何 Agent`);
    else {
      console.log(`${label} 已安裝 Agent (${installed.length} 個):`);
      installed.forEach(name => console.log(`  ${name}`));
    }
  }
}

function showInfo(skillName) {
  const data = loadSkillsJson();
  const skill = data.skills.find(s => s.name === skillName);

  if (!skill) {
    reportNotFound(`找不到技能 "${skillName}"`);
    return;
  }

  const routing = (data.routingGroups || [])
    .map((group) => {
      const selected = (group.skills || []).find((entry) => entry.name === skill.name);
      if (!selected) return null;

      const choices = (group.skills || [])
        .map((entry) => {
          const marker = entry.name === skill.name ? '[目前]' : '[替代]';
          return `    ${marker} ${entry.name}: ${entry.when}`;
        })
        .join('\n');
      return `  [${group.title}]\n  判斷原則: ${group.decision}\n${choices}`;
    })
    .filter(Boolean);
  const routingSection = routing.length > 0
    ? `\n相近 Skill 選擇:\n${routing.join('\n')}\n`
    : '';
  const dependencySection = (skill.dependencies || []).length
    ? `\n安裝依賴:\n${skill.dependencies.map((dependency) => dependency.kind === 'required'
      ? `  [必要，自動安裝] ${dependency.name}`
      : dependency.kind === 'conditional'
        ? `  [條件，不自動安裝] ${dependency.name}: ${dependency.when}`
        : dependency.kind === 'optional'
          ? `  [可選，不自動安裝] ${dependency.name}`
          : `  [未知依賴類型] ${dependency.name}`).join('\n')}\n`
    : '';

  console.log(`
${skill.name}
${skill.description}

類別: ${skill.category}
作者: ${skill.author}
來源: ${skill.source}
授權: ${skill.license}
標籤: ${skill.tags ? skill.tags.join(', ') : '無'}
${dependencySection}${routingSection}

免 Node 安裝:
  powershell -ExecutionPolicy Bypass -NoProfile -Command '$s = irm https://raw.githubusercontent.com/HsinPu/CraftRoster/main/scripts/install.ps1; & ([scriptblock]::Create($s)) -Agent codex -Skill ${skill.name}'
  curl -fsSL https://raw.githubusercontent.com/HsinPu/CraftRoster/main/scripts/install.sh | bash -s -- --agent codex --skill ${skill.name}
`);
}

function showAgentInfo(agentId) {
  const agent = (loadAgentsJson().agents || []).find(item => item.id === agentId || item.name === agentId);
  if (!agent) {
    reportNotFound(`找不到 Agent "${agentId}"；請使用角色名稱。`);
    return;
  }
  console.log(`
${agent.id}
${agent.description}

執行名稱: ${agent.name}
分類: ${agent.category}
角色: ${agent.role}
權限: ${agent.permission}
作者: ${agent.author}
來源: ${agent.source}
授權: ${agent.license}
相關 Skills: ${agent.skills.join(', ')}

Codex 安裝:
  powershell -ExecutionPolicy Bypass -NoProfile -Command '$s = irm https://raw.githubusercontent.com/HsinPu/CraftRoster/main/scripts/install.ps1; & ([scriptblock]::Create($s)) -Target codex -Type agent -Name ${agent.id}'

Claude Code 安裝:
  curl -fsSL https://raw.githubusercontent.com/HsinPu/CraftRoster/main/scripts/install.sh | bash -s -- --target claude --type agent --name ${agent.id}

OpenCode 安裝:
  curl -fsSL https://raw.githubusercontent.com/HsinPu/CraftRoster/main/scripts/install.sh | bash -s -- --target opencode --type agent --name ${agent.id}
`);
}

function showHelp() {
  console.log(`
CraftRoster - AI Agents, Skills & Workflows Catalog

用法:
  craftroster <指令> [選項]
  (或: node craftroster-cli.js <指令> [選項])

指令:
  list                  列出可用 Skills（加 --type agent 列出 Agents）
  list --installed      列出已安裝的元件
  search <關鍵字>       搜尋 catalog
  info <名稱>           顯示詳細資訊

選項:
  --type skill|agent    Catalog 類型（預設: skill）
  --target <名稱>       list --installed 的平台（--agent 為相容別名）
  --all                 list --installed 時列出該類型所有支援平台
  --category <類別>     依類別過濾

Skill 與 Agent targets:
  codex, claude, cursor, vscode, copilot, opencode, project

  vscode 是 copilot 的別名，兩者共用 ~/.copilot 的安裝位置。
  project 會檢查目前工作目錄中的各工具專案路徑。

範例:
  craftroster list
  craftroster search python
  craftroster info python-development
  craftroster list --type agent --category quality-assurance
  craftroster search reviewer --type agent
  craftroster info code-reviewer --type agent
  craftroster list --installed --type agent --target codex

安裝請使用免 Node installer:
  required（必要）依賴會自動安裝；conditional（條件）與 optional（可選）依賴不自動安裝。
  powershell -ExecutionPolicy Bypass -NoProfile -Command '$s = irm https://raw.githubusercontent.com/HsinPu/CraftRoster/main/scripts/install.ps1; & ([scriptblock]::Create($s)) -Agent codex'
`);
}

const cli = parseCommandLine(process.argv.slice(2));

if (cli && validateCommandGrammar(cli)) {
  const searchQuery = cli.positionals.join(' ');
  const param = cli.positionals[0];

  if (cli.command === 'help' || cli.help) {
    showHelp();
  } else if (cli.command === 'list') {
    if (cli.installed) {
      if (cli.all) {
        if (cli.catalogType === 'agent') ALL_TARGETS.forEach(name => listInstalledAgents(name));
        else ALL_TARGETS.forEach(name => listInstalled(name));
      } else if (cli.catalogType === 'agent') {
        listInstalledAgents(cli.target);
      } else {
        listInstalled(cli.target);
      }
    } else if (cli.catalogType === 'agent') {
      listAgents(cli.category);
    } else {
      listSkills(cli.category);
    }
  } else if (cli.command === 'search') {
    if (cli.catalogType === 'agent') searchAgents(searchQuery);
    else searchSkills(searchQuery);
  } else if (cli.catalogType === 'agent') {
    showAgentInfo(param);
  } else {
    showInfo(param);
  }
}
