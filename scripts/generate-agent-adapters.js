#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { readAgent, renderSkillGuidance } = require('./lib/agent-metadata');

const root = path.resolve(__dirname, '..');
const agentsRoot = path.join(root, 'agents');
const adaptersRoot = path.join(root, 'adapters');

function listAgents() {
  return fs.readdirSync(agentsRoot, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
    .map((entry) => ({
      role: path.basename(entry.name, '.md'),
      filePath: path.join(agentsRoot, entry.name)
    }))
    .sort((left, right) => left.role.localeCompare(right.role));
}

function renderCodex(fields, body) {
  const instructions = body.replace(/"""/g, '\\"\\"\\"');
  return [
    `name = ${JSON.stringify(fields.name)}`,
    `description = ${JSON.stringify(fields.description)}`,
    `sandbox_mode = ${JSON.stringify(fields.permission === 'read-only' ? 'read-only' : 'workspace-write')}`,
    'developer_instructions = """',
    instructions,
    '"""',
    ''
  ].join('\n');
}

function renderClaude(fields, body) {
  const lines = [
    '---',
    `name: ${fields.name}`,
    `description: ${JSON.stringify(fields.description)}`,
    'model: inherit',
    `permissionMode: ${fields.permission === 'read-only' ? 'plan' : 'default'}`
  ];
  const requiredSkills = fields['skill-dependencies'].filter((entry) => entry.kind === 'required').map((entry) => entry.name);
  if (requiredSkills.length > 0) {
    lines.push('skills:', ...requiredSkills.map((skill) => `  - ${skill}`));
  }
  lines.push('---', '', body, '');
  return lines.join('\n');
}

function renderCursor(fields, body) {
  return [
    '---',
    `name: ${fields.name}`,
    `description: ${JSON.stringify(fields.description)}`,
    'model: inherit',
    `readonly: ${fields.permission === 'read-only'}`,
    '---',
    '',
    body,
    ''
  ].join('\n');
}

function renderCopilot(fields, body) {
  const lines = [
    '---',
    `name: ${fields.name}`,
    `description: ${JSON.stringify(fields.description)}`
  ];
  if (fields.permission === 'read-only') {
    lines.push('tools:', '  - read', '  - search', '  - web', '  - agent');
  }
  lines.push('---', '', body, '');
  return lines.join('\n');
}

function renderOpenCode(fields, body) {
  const lines = [
    '---',
    `description: ${JSON.stringify(fields.description)}`,
    'mode: subagent',
    'permission:',
    `  edit: ${fields.permission === 'read-only' ? 'deny' : 'allow'}`
  ];
  if (fields.permission === 'read-only') lines.push('  bash: deny');
  lines.push('---', '', body, '');
  return lines.join('\n');
}

function resetGeneratedAdapters() {
  for (const platform of ['codex', 'claude', 'cursor', 'copilot', 'opencode']) {
    const platformRoot = path.join(adaptersRoot, platform);
    if (path.dirname(platformRoot) !== adaptersRoot) throw new Error(`Unsafe adapter output path: ${platformRoot}`);
    fs.rmSync(platformRoot, { recursive: true, force: true });
    fs.mkdirSync(platformRoot, { recursive: true });
  }
}

function main() {
  const agents = listAgents();
  if (agents.length === 0) throw new Error('No canonical Agents found');
  const uniqueRoles = new Set(agents.map((agent) => agent.role));
  if (uniqueRoles.size !== agents.length) {
    throw new Error(`Canonical Agent roles must be unique (${uniqueRoles.size}/${agents.length})`);
  }
  const knownSkills = new Set(JSON.parse(fs.readFileSync(path.join(root, 'skills.json'), 'utf8')).skills.map((skill) => skill.name));
  const prepared = agents.map((agent) => {
    const { fields, body: canonicalBody, skillDependencies } = readAgent(agent.filePath, knownSkills);
    const body = renderSkillGuidance(canonicalBody, skillDependencies);
    if (fields.id !== agent.role || fields.name !== agent.role || fields.role !== agent.role) {
      throw new Error(`${agent.role} has inconsistent canonical identity`);
    }
    if (!['read-only', 'workspace-write'].includes(fields.permission)) {
      throw new Error(`${agent.role} has unsupported permission: ${fields.permission}`);
    }
    return { agent, fields, body };
  });
  resetGeneratedAdapters();
  for (const { agent, fields, body } of prepared) {
    fs.writeFileSync(path.join(adaptersRoot, 'codex', `${agent.role}.toml`), renderCodex(fields, body), 'utf8');
    fs.writeFileSync(path.join(adaptersRoot, 'claude', `${agent.role}.md`), renderClaude(fields, body), 'utf8');
    fs.writeFileSync(path.join(adaptersRoot, 'cursor', `${agent.role}.md`), renderCursor(fields, body), 'utf8');
    fs.writeFileSync(path.join(adaptersRoot, 'copilot', `${agent.role}.agent.md`), renderCopilot(fields, body), 'utf8');
    fs.writeFileSync(path.join(adaptersRoot, 'opencode', `${agent.role}.md`), renderOpenCode(fields, body), 'utf8');
  }
  console.log(`Generated Codex, Claude, Cursor, GitHub Copilot, and OpenCode adapters for ${agents.length} Agents`);
}

main();
