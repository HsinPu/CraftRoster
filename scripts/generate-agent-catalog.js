#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { readAgent } = require('./lib/agent-metadata');

const root = path.resolve(__dirname, '..');
const agentsRoot = path.join(root, 'agents');
const catalogPath = path.join(root, 'agents.json');
const readmePath = path.join(root, 'README.md');

const requiredFields = [
  'id',
  'name',
  'role',
  'description',
  'category',
  'author',
  'source',
  'license',
  'model',
  'permission',
  'skill-dependencies',
  'tags',
  'reference-repo',
  'reference-paths',
  'reference-tree'
];

function listAgentFiles() {
  if (!fs.existsSync(agentsRoot)) throw new Error('agents/ directory is missing');
  return fs.readdirSync(agentsRoot, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
    .map((entry) => path.join(agentsRoot, entry.name))
    .sort();
}

function readAgents() {
  const skillNames = new Set(JSON.parse(fs.readFileSync(path.join(root, 'skills.json'), 'utf8')).skills.map((skill) => skill.name));
  return listAgentFiles().map((filePath) => {
    const { fields, skillDependencies } = readAgent(filePath, skillNames);
    const relativePath = path.relative(root, filePath).replace(/\\/g, '/');
    for (const field of requiredFields) {
      if (!fields[field] || (field !== 'skill-dependencies' && Array.isArray(fields[field]) && fields[field].length === 0)) {
        throw new Error(`${relativePath} is missing required frontmatter field: ${field}`);
      }
    }

    const role = path.basename(filePath, '.md');
    if (fields.role !== role || fields.id !== role || fields.name !== role) {
      throw new Error(`${relativePath} does not match its flat role identity (${role})`);
    }

    return {
      id: fields.id,
      name: fields.name,
      role: fields.role,
      description: fields.description,
      category: fields.category,
      author: fields.author,
      source: fields.source,
      license: fields.license,
      model: fields.model,
      permission: fields.permission,
      skills: fields.skills,
      skillDependencies,
      tags: fields.tags,
      path: relativePath,
      references: {
        repo: fields['reference-repo'],
        paths: fields['reference-paths'],
        tree: fields['reference-tree']
      }
    };
  }).sort((left, right) => left.id.localeCompare(right.id));
}

function renderCategorySummary(agents) {
  const groups = new Map();
  for (const agent of agents) {
    const group = groups.get(agent.category) || [];
    group.push(agent);
    groups.set(agent.category, group);
  }
  const rows = [...groups.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([category, entries]) => {
    const links = entries.sort((left, right) => left.role.localeCompare(right.role))
      .map((agent) => `[\`${agent.role}\`](${agent.path})`).join(', ');
    return `| \`${category}\` | ${entries.length} | ${links} |`;
  });
  return [
    '<!-- AGENT_SUMMARY_START -->',
    '| Category | Count | Agents |',
    '|---|---:|---|',
    ...rows,
    '<!-- AGENT_SUMMARY_END -->'
  ].join('\n');
}

function updateReadme(agents) {
  if (!fs.existsSync(readmePath)) return;
  let readme = fs.readFileSync(readmePath, 'utf8');
  const categoryCount = new Set(agents.map((agent) => agent.category)).size;
  const allReferenceRepos = new Set();
  const allReferencePaths = new Set();
  const additionalReferenceRepos = new Set();
  const additionalReferencePaths = new Set();
  let additionalAgentCount = 0;
  for (const agent of agents) {
    const repo = agent.references && agent.references.repo;
    const paths = agent.references && Array.isArray(agent.references.paths) ? agent.references.paths : [];
    if (!repo) continue;
    allReferenceRepos.add(repo);
    for (const referencePath of paths) allReferencePaths.add(`${repo}\0${referencePath}`);
    if (repo !== 'wshobson/agents') {
      additionalAgentCount += 1;
      additionalReferenceRepos.add(repo);
      for (const referencePath of paths) additionalReferencePaths.add(`${repo}\0${referencePath}`);
    }
  }
  const countBlock = /<!-- AGENT_COUNT_START -->[\s\S]*?<!-- AGENT_COUNT_END -->/;
  const summaryBlock = /<!-- AGENT_SUMMARY_START -->[\s\S]*?<!-- AGENT_SUMMARY_END -->/;
  readme = readme.replace(/(badge\/Agents-)\d+(-2563eb)/, `$1${agents.length}$2`);
  readme = readme.replace(/(全部 \d+ 個 Skills、)\d+( 個 Agents)/, `$1${agents.length}$2`);
  readme = readme.replace(/\| Agents \| \d+／\d+ 類 \|/, `| Agents | ${agents.length}／${categoryCount} 類 |`);
  readme = readme.replace(
    /(\| (?:Codex|Claude|Cursor|Copilot|OpenCode) adapters \| )\d+( \|)/g,
    (_, prefix, suffix) => `${prefix}${agents.length}${suffix}`
  );
  readme = readme.replace(
    /(\| All pinned Agent references \| )\d+ paths／\d+ repositories( \|)/,
    `$1${allReferencePaths.size} paths／${allReferenceRepos.size} repositories$2`
  );
  readme = readme.replace(
    /(\| Additional Agent references \| )\d+ paths／\d+ repositories( \|)/,
    `$1${additionalReferencePaths.size} paths／${additionalReferenceRepos.size} repositories$2`
  );
  readme = readme.replace(
    /(另外 )\d+( 個 Agents 來自其餘 )\d+( 個 reference repositories)/,
    `$1${additionalAgentCount}$2${additionalReferenceRepos.size}$3`
  );
  readme = readme.replace(/(完成 )\d+／\d+( 類核心責任鏈覆蓋)/, `$1${categoryCount}／${categoryCount}$2`);
  readme = readme.replace(
    /(<summary><strong>展開 )\d+ 類、\d+ 個 Agents( 的完整索引<\/strong><\/summary>)/,
    `$1${categoryCount} 類、${agents.length} 個 Agents$2`
  );
  readme = readme.replace(/(audit:agent-originality` 會針對 )\d+( 個 canonical Agent prompt)/, `$1${agents.length}$2`);
  readme = readme.replace(/(Repository 與全部 )\d+( 個 Agents 採)/, `$1${agents.length}$2`);
  if (countBlock.test(readme)) {
    readme = readme.replace(
      countBlock,
      `<!-- AGENT_COUNT_START -->\n目前共收錄 **${agents.length}** 個不重複 Agents。\n<!-- AGENT_COUNT_END -->`
    );
  }
  if (summaryBlock.test(readme)) readme = readme.replace(summaryBlock, renderCategorySummary(agents));
  fs.writeFileSync(readmePath, readme, 'utf8');
}

const agents = readAgents();
const catalog = {
  version: '3.0.0',
  updated: new Date().toISOString(),
  total: agents.length,
  categories: new Set(agents.map((agent) => agent.category)).size,
  uniqueRoles: new Set(agents.map((agent) => agent.role)).size,
  agents
};

fs.writeFileSync(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8');
updateReadme(agents);
console.log(`Generated agents.json for ${agents.length} unique Agents across ${catalog.categories} categories`);
