#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { parseYamlFrontmatter } = require('./generate-skill-catalog');
const { validateDependencies, validateSiblingLinks } = require('./lib/skill-dependencies');

const root = path.resolve(__dirname, '..');
const skillsRoot = path.join(root, 'skills');
const skillsJsonPath = path.join(root, 'skills.json');
const agentsRoot = path.join(root, 'agents');
const adaptersRoot = path.join(root, 'adapters');
const agentsJsonPath = path.join(root, 'agents.json');
const agentReferencePath = path.join(root, 'scripts', 'data', 'wshobson-agent-inventory.json');
const agentReferenceSourcesPath = path.join(root, 'scripts', 'data', 'agent-reference-sources.json');
const readmePath = path.join(root, 'README.md');

const errors = [];
const canonicalSkillSource = 'HsinPu/CraftRoster';
const canonicalSkillAuthor = 'HsinPu';
const componentNamePattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const officialSkillFrontmatterFields = new Set([
  'name',
  'description',
  'license',
  'compatibility',
  'metadata',
  'allowed-tools'
]);
const canonicalAgentMetadata = {
  author: 'HsinPu',
  source: 'HsinPu/CraftRoster',
  license: 'Apache-2.0'
};

function fail(message) {
  errors.push(message);
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    fail(`Unable to read JSON: ${path.relative(root, filePath)} (${error.message})`);
    return null;
  }
}

const agentReferenceSources = readJson(agentReferenceSourcesPath);
const allowedAgentReferenceTrees = new Map(
  agentReferenceSources && Array.isArray(agentReferenceSources.repositories)
    ? agentReferenceSources.repositories.map((entry) => [entry.repo, entry.tree])
    : []
);

function parseFrontmatter(filePath) {
  try {
    return parseYamlFrontmatter(filePath);
  } catch (error) {
    const absolutePrefix = `${filePath}: `;
    const detail = error.message.startsWith(absolutePrefix)
      ? error.message.slice(absolutePrefix.length)
      : error.message;
    fail(`${path.relative(root, filePath)} has invalid YAML frontmatter: ${detail}`);
    return {};
  }
}

function parseOpenCodeFrontmatter(filePath) {
  const fields = parseFrontmatter(filePath);
  if (fields.permission && typeof fields.permission === 'object' && !Array.isArray(fields.permission)) {
    for (const [name, value] of Object.entries(fields.permission)) {
      fields[`permission.${name}`] = value;
    }
  }
  return fields;
}

function compare(name, field, expected, actual, expectedLabel, actualLabel) {
  if (JSON.stringify(expected) !== JSON.stringify(actual)) {
    fail(`${name}: ${field} mismatch. ${expectedLabel}=${JSON.stringify(expected)} ${actualLabel}=${JSON.stringify(actual)}`);
  }
}

function normalizeNewlines(value) {
  return typeof value === 'string' ? value.replace(/\r\n/g, '\n') : value;
}

const skillCatalog = readJson(skillsJsonPath);
const skills = skillCatalog && Array.isArray(skillCatalog.skills) ? skillCatalog.skills : [];
const skillCategories = skillCatalog && Array.isArray(skillCatalog.categories) ? skillCatalog.categories : [];
if (!skillCatalog || !Array.isArray(skillCatalog.skills)) fail('skills.json must contain a skills array');
if (!skillCatalog || !Array.isArray(skillCatalog.categories)) fail('skills.json must contain a categories array');
if (skillCatalog && skillCatalog.total !== skills.length) {
  fail(`skills.json total (${skillCatalog.total}) does not match skills.length (${skills.length})`);
}

const declaredSkillCategories = new Set();
for (const category of skillCategories) {
  const label = category && category.id ? category.id : '(unknown-category)';
  if (!category || typeof category !== 'object') {
    fail('skills.json contains a non-object category entry');
    continue;
  }
  for (const field of ['id', 'name', 'description']) {
    if (!category[field]) fail(`${label} is missing Skill category field: ${field}`);
  }
  if (!componentNamePattern.test(category.id || '')) fail(`${label}: invalid Skill category id`);
  if (declaredSkillCategories.has(category.id)) fail(`Duplicate Skill category id: ${category.id}`);
  declaredSkillCategories.add(category.id);
}

const skillNames = new Set();
const usedSkillCategories = new Set();
const validSkills = [];
for (let index = 0; index < skills.length; index += 1) {
  const skill = skills[index];
  if (!skill || typeof skill !== 'object' || Array.isArray(skill)) {
    fail(`skills.json skills[${index}] must be an object`);
    continue;
  }
  validSkills.push(skill);
  if (!skill.name) fail('A catalog entry is missing name');
  if (!componentNamePattern.test(skill.name || '')) fail(`${skill.name || '(unknown)'}: invalid skill name`);
  if (skillNames.has(skill.name)) fail(`Duplicate catalog skill name: ${skill.name}`);
  skillNames.add(skill.name);
  for (const field of ['description', 'category', 'author', 'source', 'license']) {
    if (!skill[field]) fail(`${skill.name || '(unknown)'} is missing catalog field: ${field}`);
  }
  if (skill.source !== canonicalSkillSource) {
    fail(`${skill.name || '(unknown)'} source must be ${canonicalSkillSource}`);
  }
  if (skill.author !== canonicalSkillAuthor) {
    fail(`${skill.name || '(unknown)'} author must be ${canonicalSkillAuthor}`);
  }
  if (!declaredSkillCategories.has(skill.category)) {
    fail(`${skill.name || '(unknown)'} uses undeclared Skill category: ${skill.category}`);
  }
  usedSkillCategories.add(skill.category);
  if (skill.reference) {
    if (!skill.reference.source) fail(`${skill.name || '(unknown)'} reference.source is required`);
    if (!skill.reference.license) fail(`${skill.name || '(unknown)'} reference.license is required`);
    if (Object.prototype.hasOwnProperty.call(skill.reference, 'revision')) {
      if (!skill.reference.revision) fail(`${skill.name || '(unknown)'} reference.revision is required when declared`);
      if (!/^[0-9a-f]{40}$/i.test(skill.reference.revision || '')) {
        fail(`${skill.name || '(unknown)'} reference.revision must be a full 40-character Git commit SHA`);
      }
    }
  }
  if (!Array.isArray(skill.tags)) fail(`${skill.name || '(unknown)'} tags must be an array`);
}
for (const category of declaredSkillCategories) {
  if (!usedSkillCategories.has(category)) fail(`Declared Skill category is unused: ${category}`);
}

if (!fs.existsSync(skillsRoot)) fail('skills/ directory is missing');
const rootSkillDirs = fs.readdirSync(root, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && entry.name !== 'skills' && fs.existsSync(path.join(root, entry.name, 'SKILL.md')))
  .map((entry) => entry.name);
for (const name of rootSkillDirs) fail(`Skill directory must live under skills/: ${name}`);

const skillDirs = fs.existsSync(skillsRoot)
  ? fs.readdirSync(skillsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && fs.existsSync(path.join(skillsRoot, entry.name, 'SKILL.md')))
    .map((entry) => entry.name)
    .sort()
  : [];
for (const name of [...skillNames].sort()) {
  if (!skillDirs.includes(name)) fail(`Catalog entry has no matching skill directory: ${name}`);
}
for (const name of skillDirs) {
  if (!skillNames.has(name)) fail(`Skill directory is missing from skills.json: ${name}`);
}

const skillsByName = new Map(validSkills.filter((skill) => skill.name).map((skill) => [skill.name, skill]));
try {
  const dependencyEntries = Object.fromEntries(skillsByName);
  validateDependencies(dependencyEntries);
  validateSiblingLinks(root, dependencyEntries);
} catch (error) {
  fail(`Skill dependency validation: ${error.message}`);
}
const canonicalAgentRoleNames = new Set(
  fs.existsSync(agentsRoot)
    ? fs.readdirSync(agentsRoot, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
      .map((entry) => path.basename(entry.name, '.md'))
    : []
);
const allowedHandoffExternalTargets = new Set(['gh', 'nodejs']);
for (const name of skillDirs) {
  const skillFile = path.join(skillsRoot, name, 'SKILL.md');
  const skillText = fs.readFileSync(skillFile, 'utf8');
  const frontmatter = parseFrontmatter(skillFile);
  const catalogEntry = skillsByName.get(name);

  for (const field of Object.keys(frontmatter)) {
    if (!officialSkillFrontmatterFields.has(field)) {
      fail(`${name}: SKILL.md contains unknown top-level frontmatter field: ${field}`);
    }
  }

  if (typeof frontmatter.name !== 'string' || frontmatter.name.length < 1 || frontmatter.name.length > 64) {
    fail(`${name}: SKILL.md name must be a string between 1 and 64 characters`);
  } else if (!componentNamePattern.test(frontmatter.name)) {
    fail(`${name}: SKILL.md name must contain only lowercase letters, digits, and single hyphens, with no leading or trailing hyphen`);
  }
  if (
    typeof frontmatter.description !== 'string'
    || frontmatter.description.length < 1
    || frontmatter.description.length > 1024
  ) {
    fail(`${name}: SKILL.md description must be a string between 1 and 1024 characters`);
  }
  if (typeof frontmatter.license !== 'string' || frontmatter.license.length < 1) {
    fail(`${name}: SKILL.md is missing frontmatter field: license`);
  }
  if (
    Object.prototype.hasOwnProperty.call(frontmatter, 'compatibility')
    && (
      typeof frontmatter.compatibility !== 'string'
      || frontmatter.compatibility.length < 1
      || frontmatter.compatibility.length > 500
    )
  ) {
    fail(`${name}: SKILL.md compatibility must be a string between 1 and 500 characters when declared`);
  }
  if (
    Object.prototype.hasOwnProperty.call(frontmatter, 'allowed-tools')
    && typeof frontmatter['allowed-tools'] !== 'string'
  ) {
    fail(`${name}: SKILL.md allowed-tools must be a space-separated string when declared`);
  }

  const metadata = frontmatter.metadata;
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    fail(`${name}: SKILL.md metadata must be a string-to-string mapping`);
  } else {
    for (const [field, value] of Object.entries(metadata)) {
      if (typeof field !== 'string' || typeof value !== 'string') {
        fail(`${name}: SKILL.md metadata must be a string-to-string mapping (${field})`);
      }
    }
    if (!metadata.author) fail(`${name}: SKILL.md metadata.author is required`);
    if (!metadata.source) fail(`${name}: SKILL.md metadata.source is required`);
  }

  compare(name, 'name', name, frontmatter.name, 'directory', 'SKILL.md');
  if (catalogEntry) {
    compare(name, 'description', catalogEntry.description, frontmatter.description, 'skills.json', 'SKILL.md');
    compare(name, 'author', catalogEntry.author, metadata && metadata.author, 'skills.json', 'SKILL.md metadata');
    compare(name, 'source', catalogEntry.source, metadata && metadata.source, 'skills.json', 'SKILL.md metadata');
    compare(name, 'license', catalogEntry.license, frontmatter.license, 'skills.json', 'SKILL.md');

    if (catalogEntry.reference) {
      compare(name, 'reference.source', catalogEntry.reference.source, metadata && metadata['reference-source'], 'skills.json', 'SKILL.md metadata');
      compare(name, 'reference.license', catalogEntry.reference.license, metadata && metadata['reference-license'], 'skills.json', 'SKILL.md metadata');
    }
    const skillHasReferenceMetadata = ['reference-source', 'reference-license', 'reference-revision']
      .some((field) => metadata && Object.prototype.hasOwnProperty.call(metadata, field));
    if (!catalogEntry.reference && skillHasReferenceMetadata) {
      fail(`${name}: SKILL.md metadata declares reference metadata but skills.json has no reference entry`);
    }
    const catalogReferenceRevision = catalogEntry.reference && catalogEntry.reference.revision;
    const skillReferenceRevision = metadata && metadata['reference-revision'];
    if (catalogReferenceRevision || skillReferenceRevision) {
      compare(name, 'reference.revision', catalogReferenceRevision, skillReferenceRevision, 'skills.json', 'SKILL.md metadata');
      if (!/^[0-9a-f]{40}$/i.test(skillReferenceRevision || '')) {
        fail(`${name}: metadata.reference-revision must be a full 40-character Git commit SHA`);
      }
    }
  }

  const secondLevelHeadings = [...skillText.matchAll(/^ {0,3}##(?!#)[ \t]+([^\r\n]*?)(?:[ \t]+#+)?[ \t]*\r?$/gm)];
  const handoffHeadings = secondLevelHeadings.filter((match) => /^handoffs?$/i.test(match[1]));
  const setextHandoffHeadings = [...skillText.matchAll(/^ {0,3}Handoffs?[ \t]*\r?\n {0,3}-{3,}[ \t]*\r?$/gmi)];
  for (const heading of setextHandoffHeadings) {
    fail(`${name}: Handoff headings must use canonical "## Handoff" or "## Handoffs" syntax: ${heading[0].split(/\r?\n/, 1)[0].trim()}`);
  }
  if (handoffHeadings.length > 1) fail(`${name}: SKILL.md contains multiple Handoff sections`);
  for (const handoffHeading of handoffHeadings) {
    const rawHeading = handoffHeading[0].replace(/\r$/, '');
    if (!/^## Handoffs?$/.test(rawHeading)) {
      fail(`${name}: Handoff headings must use canonical "## Handoff" or "## Handoffs" syntax: ${rawHeading.trim()}`);
    }
    const headingIndex = secondLevelHeadings.indexOf(handoffHeading);
    const sectionStart = handoffHeading.index + handoffHeading[0].length;
    const sectionEnd = secondLevelHeadings[headingIndex + 1]
      ? secondLevelHeadings[headingIndex + 1].index
      : skillText.length;
    const handoffBody = skillText.slice(sectionStart, sectionEnd);
    for (const line of handoffBody.split(/\r?\n/)) {
      if (!/^\s*-\s+/.test(line)) continue;

      const inlineCode = [...line.matchAll(/`([^`\r\n]+)`/g)];
      let previousTarget = null;
      for (const target of inlineCode) {
        if (componentNamePattern.test(target[1])) {
          if (
            !skillNames.has(target[1])
            && !canonicalAgentRoleNames.has(target[1])
            && !allowedHandoffExternalTargets.has(target[1])
          ) {
            fail(`${name}: Handoff references unknown Skill, Agent, or allowed external target: ${target[1]}`);
          }
          previousTarget = target;
          continue;
        }

        const prefix = line.slice(0, target.index);
        const primaryTarget = /(?:\buse|\busing|\bprefer|\bhandoff|\bhand off|\broute|\breturn|\bpair|\bdelegate)(?:\s+(?:to|with|via|through|a|an|the|discovered|available|relevant|matching|appropriate|dedicated|specialized))*\s*$/i.test(prefix)
          || /(?:使用|用|交給|轉交給|搭配|委派給)\s*$/u.test(prefix);
        const separator = previousTarget
          ? line.slice(previousTarget.index + previousTarget[0].length, target.index)
          : '';
        const continuedTargetList = previousTarget !== null
          && /^\s*(?:(?:,\s*)?(?:and|or)|,|\/)\s*(?:(?:a|an|the|another|discovered|available|relevant|matching|appropriate|dedicated|specialized)\s+)*$/i.test(separator);

        if (primaryTarget || continuedTargetList) {
          fail(`${name}: Handoff target must use a lowercase kebab-case component name: ${target[1]}`);
          previousTarget = target;
        } else {
          previousTarget = null;
        }
      }
    }
  }

  for (const link of skillText.matchAll(/\[[^\]]+\]\(((?:references?|scripts|assets)[\\/][^)#]+)(?:#[^)]+)?\)/g)) {
    const rawPath = link[1];
    if (rawPath.includes('\\')) {
      fail(`${name}: bundled resource links must use forward slashes: ${rawPath}`);
      continue;
    }

    const relativePath = path.posix.normalize(rawPath);
    if (
      relativePath !== rawPath
      || relativePath.startsWith('../')
      || path.posix.isAbsolute(relativePath)
    ) {
      fail(`${name}: bundled resource link must stay within the Skill package: ${link[1]}`);
      continue;
    }

    const packageRoot = path.resolve(skillsRoot, name);
    const resourcePath = path.resolve(packageRoot, ...relativePath.split('/'));
    const relativeToPackage = path.relative(packageRoot, resourcePath);
    if (
      relativeToPackage === '..'
      || relativeToPackage.startsWith(`..${path.sep}`)
      || path.isAbsolute(relativeToPackage)
    ) {
      fail(`${name}: bundled resource link must stay within the Skill package: ${link[1]}`);
      continue;
    }

    if (!fs.existsSync(resourcePath)) fail(`${name}: bundled resource link does not exist: ${link[1]}`);
  }
}

const agentCatalog = readJson(agentsJsonPath);
const agents = agentCatalog && Array.isArray(agentCatalog.agents) ? agentCatalog.agents : [];
if (!agentCatalog || !Array.isArray(agentCatalog.agents)) fail('agents.json must contain an agents array');
if (agentCatalog && agentCatalog.version !== '3.0.0') fail('agents.json version must be 3.0.0');
if (agentCatalog && agentCatalog.total !== agents.length) {
  fail(`agents.json total (${agentCatalog.total}) does not match agents.length (${agents.length})`);
}
if (agentCatalog && agentCatalog.uniqueRoles !== agents.length) {
  fail(`agents.json uniqueRoles (${agentCatalog.uniqueRoles}) must equal total (${agents.length})`);
}

const allowedPermissions = new Set(['read-only', 'workspace-write']);
const agentIds = new Set();
const referencePaths = new Set();
const wshobsonReferencePaths = new Set();
for (const agent of agents) {
  const label = agent.id || agent.name || '(unknown)';
  for (const field of ['id', 'name', 'role', 'path', 'description', 'category', 'author', 'source', 'license', 'model', 'permission']) {
    if (!agent[field]) fail(`${label} is missing agent catalog field: ${field}`);
  }
  if (agentIds.has(agent.id)) fail(`Duplicate catalog Agent: ${agent.id}`);
  agentIds.add(agent.id);
  if (!componentNamePattern.test(agent.role || '')) fail(`${label}: invalid role name`);
  if (agent.id !== agent.role || agent.name !== agent.role) fail(`${label}: id and name must equal role`);
  if (agent.path !== `agents/${agent.role}.md`) fail(`${label}: path must equal agents/role.md`);
  for (const [field, expected] of Object.entries(canonicalAgentMetadata)) {
    if (agent[field] !== expected) fail(`${label} ${field} must be ${expected}`);
  }
  if (!allowedPermissions.has(agent.permission)) fail(`${label}: invalid permission ${agent.permission}`);
  if (!Array.isArray(agent.skills)) fail(`${label}: skills must be an array`);
  if (!Array.isArray(agent.tags)) fail(`${label}: tags must be an array`);
  for (const skillName of Array.isArray(agent.skills) ? agent.skills : []) {
    if (!skillNames.has(skillName)) fail(`${label} references unknown skill: ${skillName}`);
  }

  if (!agent.references || typeof agent.references !== 'object') {
    fail(`${label}: references must be an object`);
  } else {
    const expectedReferenceTree = allowedAgentReferenceTrees.get(agent.references.repo);
    if (!expectedReferenceTree) {
      fail(`${label}: unsupported references.repo ${agent.references.repo}`);
    }
    if (!/^[0-9a-f]{40}$/.test(agent.references.tree || '')) {
      fail(`${label}: references.tree must be a 40-character lowercase Git SHA`);
    } else if (expectedReferenceTree && agent.references.tree !== expectedReferenceTree) {
      fail(`${label}: references.tree must match the verified tree for ${agent.references.repo}`);
    }
    if (!Array.isArray(agent.references.paths) || agent.references.paths.length === 0) {
      fail(`${label}: references.paths must be a non-empty array`);
    } else {
      for (const referencePath of agent.references.paths) {
        const normalizedPath = path.posix.normalize(referencePath);
        const referenceSegments = referencePath.split('/');
        if (
          !/^[A-Za-z0-9._-]+(?:\/[A-Za-z0-9._-]+)*$/.test(referencePath)
          || normalizedPath !== referencePath
          || referenceSegments.some((segment) => segment === '.' || segment === '..')
        ) {
          fail(`${label}: reference path must be a normalized repository-relative path: ${referencePath}`);
        }
        if (
          agent.references.repo === 'wshobson/agents'
          && !/^plugins\/[^/]+\/agents\/[^/]+\.md$/.test(referencePath)
        ) {
          fail(`${label}: invalid wshobson reference path ${referencePath}`);
        }
        const referenceKey = `${agent.references.repo}:${referencePath}`;
        if (referencePaths.has(referenceKey)) fail(`Duplicate upstream reference path: ${referenceKey}`);
        referencePaths.add(referenceKey);
        if (agent.references.repo === 'wshobson/agents') wshobsonReferencePaths.add(referencePath);
      }
    }
  }
}

if (!fs.existsSync(agentsRoot)) fail('agents/ directory is missing');
const agentEntries = fs.existsSync(agentsRoot) ? fs.readdirSync(agentsRoot, { withFileTypes: true }) : [];
const agentFiles = [];
for (const entry of agentEntries) {
  if (!entry.isFile() || path.extname(entry.name) !== '.md') {
    fail(`Agent definitions must be direct Markdown files under agents/: ${entry.name}`);
    continue;
  }
  const role = path.basename(entry.name, '.md');
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(role)) fail(`Invalid Agent filename: ${entry.name}`);
  agentFiles.push({ role, path: path.join(agentsRoot, entry.name), relativePath: `agents/${entry.name}` });
}
agentFiles.sort((left, right) => left.role.localeCompare(right.role));
compare('agents/', 'count', agents.length, agentFiles.length, 'agents.json', 'filesystem');

const agentsById = new Map(agents.map((agent) => [agent.id, agent]));
for (const agent of agents) {
  if (!agentFiles.some((file) => file.role === agent.id)) fail(`${agent.id}: catalog entry has no matching Markdown file`);
}

for (const agentFile of agentFiles) {
  const text = fs.readFileSync(agentFile.path, 'utf8');
  const frontmatter = parseFrontmatter(agentFile.path);
  const catalogEntry = agentsById.get(agentFile.role);
  if (!catalogEntry) fail(`${agentFile.role}: Markdown file is missing from agents.json`);
  for (const field of ['id', 'name', 'role', 'description', 'category', 'author', 'source', 'license', 'model', 'permission', 'reference-repo', 'reference-tree']) {
    if (!frontmatter[field]) fail(`${agentFile.role}: Agent Markdown is missing frontmatter field: ${field}`);
  }
  for (const field of ['skills', 'tags', 'reference-paths']) {
    if (!Array.isArray(frontmatter[field]) || frontmatter[field].length === 0) {
      fail(`${agentFile.role}: ${field} must be a non-empty YAML list`);
    }
  }
  compare(agentFile.role, 'id', agentFile.role, frontmatter.id, 'filename', 'Agent Markdown');
  compare(agentFile.role, 'name', agentFile.role, frontmatter.name, 'filename', 'Agent Markdown');
  compare(agentFile.role, 'role', agentFile.role, frontmatter.role, 'filename', 'Agent Markdown');
  if (catalogEntry) {
    for (const field of ['name', 'role', 'description', 'category', 'author', 'source', 'license', 'model', 'permission', 'skills', 'tags']) {
      compare(agentFile.role, field, catalogEntry[field], frontmatter[field], 'agents.json', 'Agent Markdown');
    }
    compare(agentFile.role, 'references.repo', catalogEntry.references.repo, frontmatter['reference-repo'], 'agents.json', 'Agent Markdown');
    compare(agentFile.role, 'references.paths', catalogEntry.references.paths, frontmatter['reference-paths'], 'agents.json', 'Agent Markdown');
    compare(agentFile.role, 'references.tree', catalogEntry.references.tree, frontmatter['reference-tree'], 'agents.json', 'Agent Markdown');
  }

  const requiredHeadings = ['# Role', '# Task', '# Constraints', '# Output'];
  const topLevelHeadings = [...text.matchAll(/^# .+$/gm)].map((match) => match[0]);
  compare(agentFile.role, 'top-level headings', requiredHeadings, topLevelHeadings, 'required Agent structure', 'Agent Markdown');
  const canonicalBody = text.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '').trim();

  const codexPath = path.join(adaptersRoot, 'codex', `${agentFile.role}.toml`);
  if (!fs.existsSync(codexPath)) {
    fail(`${agentFile.role}: missing Codex adapter`);
  } else if (catalogEntry) {
    const codex = fs.readFileSync(codexPath, 'utf8');
    const nameMatch = codex.match(/^name = (.+)$/m);
    const descriptionMatch = codex.match(/^description = (.+)$/m);
    const sandboxMatch = codex.match(/^sandbox_mode = (.+)$/m);
    const instructionsMatch = codex.match(/developer_instructions = """\r?\n([\s\S]*?)\r?\n"""\r?\n?$/);
    try {
      compare(agentFile.role, 'Codex name', catalogEntry.name, nameMatch ? JSON.parse(nameMatch[1]) : null, 'agents.json', 'adapter');
      compare(agentFile.role, 'Codex description', catalogEntry.description, descriptionMatch ? JSON.parse(descriptionMatch[1]) : null, 'agents.json', 'adapter');
      compare(agentFile.role, 'Codex sandbox', catalogEntry.permission, sandboxMatch ? JSON.parse(sandboxMatch[1]) : null, 'agents.json', 'adapter');
    } catch (error) {
      fail(`${agentFile.role}: invalid Codex adapter scalar (${error.message})`);
    }
    compare(agentFile.role, 'Codex instructions', normalizeNewlines(canonicalBody), instructionsMatch ? normalizeNewlines(instructionsMatch[1].trim()) : null, 'canonical Agent', 'adapter');
  }

  const claudePath = path.join(adaptersRoot, 'claude', `${agentFile.role}.md`);
  if (!fs.existsSync(claudePath)) {
    fail(`${agentFile.role}: missing Claude adapter`);
  } else if (catalogEntry) {
    const claudeText = fs.readFileSync(claudePath, 'utf8');
    const claudeFrontmatter = parseFrontmatter(claudePath);
    const claudeBody = claudeText.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '').trim();
    compare(agentFile.role, 'Claude name', catalogEntry.name, claudeFrontmatter.name, 'agents.json', 'adapter');
    compare(agentFile.role, 'Claude description', catalogEntry.description, claudeFrontmatter.description, 'agents.json', 'adapter');
    compare(agentFile.role, 'Claude model', 'inherit', claudeFrontmatter.model, 'required adapter value', 'adapter');
    compare(agentFile.role, 'Claude permissionMode', catalogEntry.permission === 'read-only' ? 'plan' : 'default', claudeFrontmatter.permissionMode, 'agents.json mapping', 'adapter');
    compare(agentFile.role, 'Claude skills', catalogEntry.skills, claudeFrontmatter.skills, 'agents.json', 'adapter');
    compare(agentFile.role, 'Claude instructions', normalizeNewlines(canonicalBody), normalizeNewlines(claudeBody), 'canonical Agent', 'adapter');
  }

  const cursorPath = path.join(adaptersRoot, 'cursor', `${agentFile.role}.md`);
  if (!fs.existsSync(cursorPath)) {
    fail(`${agentFile.role}: missing Cursor adapter`);
  } else if (catalogEntry) {
    const cursorText = fs.readFileSync(cursorPath, 'utf8');
    const cursorFrontmatter = parseFrontmatter(cursorPath);
    const cursorBody = cursorText.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '').trim();
    compare(agentFile.role, 'Cursor name', catalogEntry.name, cursorFrontmatter.name, 'agents.json', 'adapter');
    compare(agentFile.role, 'Cursor description', catalogEntry.description, cursorFrontmatter.description, 'agents.json', 'adapter');
    compare(agentFile.role, 'Cursor model', 'inherit', cursorFrontmatter.model, 'required adapter value', 'adapter');
    compare(agentFile.role, 'Cursor readonly', catalogEntry.permission === 'read-only', cursorFrontmatter.readonly, 'agents.json mapping', 'adapter');
    compare(agentFile.role, 'Cursor instructions', normalizeNewlines(canonicalBody), normalizeNewlines(cursorBody), 'canonical Agent', 'adapter');
  }

  const copilotPath = path.join(adaptersRoot, 'copilot', `${agentFile.role}.agent.md`);
  if (!fs.existsSync(copilotPath)) {
    fail(`${agentFile.role}: missing GitHub Copilot adapter`);
  } else if (catalogEntry) {
    const copilotText = fs.readFileSync(copilotPath, 'utf8');
    const copilotFrontmatter = parseFrontmatter(copilotPath);
    const copilotBody = copilotText.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '').trim();
    compare(agentFile.role, 'GitHub Copilot name', catalogEntry.name, copilotFrontmatter.name, 'agents.json', 'adapter');
    compare(agentFile.role, 'GitHub Copilot description', catalogEntry.description, copilotFrontmatter.description, 'agents.json', 'adapter');
    compare(
      agentFile.role,
      'GitHub Copilot tools',
      catalogEntry.permission === 'read-only' ? ['read', 'search', 'web', 'agent'] : undefined,
      copilotFrontmatter.tools,
      'agents.json mapping',
      'adapter'
    );
    compare(agentFile.role, 'GitHub Copilot instructions', normalizeNewlines(canonicalBody), normalizeNewlines(copilotBody), 'canonical Agent', 'adapter');
  }

  const openCodePath = path.join(adaptersRoot, 'opencode', `${agentFile.role}.md`);
  if (!fs.existsSync(openCodePath)) {
    fail(`${agentFile.role}: missing OpenCode adapter`);
  } else if (catalogEntry) {
    const openCodeText = fs.readFileSync(openCodePath, 'utf8');
    const openCodeFrontmatter = parseOpenCodeFrontmatter(openCodePath);
    const openCodeBody = openCodeText.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '').trim();
    compare(agentFile.role, 'OpenCode description', catalogEntry.description, openCodeFrontmatter.description, 'agents.json', 'adapter');
    compare(agentFile.role, 'OpenCode mode', 'subagent', openCodeFrontmatter.mode, 'required adapter value', 'adapter');
    compare(agentFile.role, 'OpenCode permission.edit', catalogEntry.permission === 'read-only' ? 'deny' : 'allow', openCodeFrontmatter['permission.edit'], 'agents.json mapping', 'adapter');
    compare(agentFile.role, 'OpenCode permission.bash', catalogEntry.permission === 'read-only' ? 'deny' : undefined, openCodeFrontmatter['permission.bash'], 'agents.json mapping', 'adapter');
    compare(agentFile.role, 'OpenCode instructions', normalizeNewlines(canonicalBody), normalizeNewlines(openCodeBody), 'canonical Agent', 'adapter');
  }
}

const adapterExtensions = {
  codex: '.toml',
  claude: '.md',
  cursor: '.md',
  copilot: '.agent.md',
  opencode: '.md'
};
if (!fs.existsSync(adaptersRoot)) {
  fail('adapters/ directory is missing');
} else {
  const expectedPlatforms = new Set(Object.keys(adapterExtensions));
  for (const entry of fs.readdirSync(adaptersRoot, { withFileTypes: true })) {
    if (!entry.isDirectory() || !expectedPlatforms.has(entry.name)) {
      fail(`Unexpected entry under adapters/: ${entry.name}`);
    }
  }
}
for (const platform of Object.keys(adapterExtensions)) {
  const platformRoot = path.join(adaptersRoot, platform);
  if (!fs.existsSync(platformRoot)) {
    fail(`adapters/${platform}/ directory is missing`);
    continue;
  }
  const extension = adapterExtensions[platform];
  const files = fs.readdirSync(platformRoot, { withFileTypes: true });
  const adapterRoles = [];
  for (const entry of files) {
    if (!entry.isFile() || !entry.name.endsWith(extension)) {
      fail(`Adapters must be direct ${extension} files under adapters/${platform}/: ${entry.name}`);
      continue;
    }
    const role = entry.name.slice(0, -extension.length);
    if (!componentNamePattern.test(role) || entry.name !== `${role}${extension}`) {
      fail(`Invalid adapter filename under adapters/${platform}/: ${entry.name}`);
      continue;
    }
    adapterRoles.push(role);
  }
  compare(`adapters/${platform}`, 'count', agents.length, adapterRoles.length, 'agents.json', 'filesystem');
  for (const role of adapterRoles) {
    if (!agentIds.has(role)) fail(`adapters/${platform}/${role}: no matching canonical Agent`);
  }
}

const inventory = readJson(agentReferencePath);
if (inventory) {
  const definitions = Array.isArray(inventory.definitions) ? inventory.definitions : [];
  const totals = inventory.totals || {};
  const consolidated = definitions.filter((definition) => definition.status === 'consolidated');
  const excluded = definitions.filter((definition) => definition.status === 'excluded');
  const pending = definitions.filter((definition) => definition.status === 'pending');
  const uniqueRoleNames = new Set(definitions.map((definition) => definition.sourceName));
  const roleCounts = new Map();
  for (const definition of definitions) roleCounts.set(definition.sourceName, (roleCounts.get(definition.sourceName) || 0) + 1);
  compare('Agent reference', 'definitions', definitions.length, totals.definitions, 'computed', 'inventory totals');
  compare('Agent reference', 'uniqueRoleNames', uniqueRoleNames.size, totals.uniqueRoleNames, 'computed', 'inventory totals');
  compare('Agent reference', 'repeatedRoleNames', [...roleCounts.values()].filter((count) => count > 1).length, totals.repeatedRoleNames, 'computed', 'inventory totals');
  compare('Agent reference', 'repeatedDefinitions', definitions.length - uniqueRoleNames.size, totals.repeatedDefinitions, 'computed', 'inventory totals');
  compare('Agent reference', 'uniqueSourceBlobs', new Set(definitions.map((definition) => definition.sourceBlobSha)).size, totals.uniqueSourceBlobs, 'computed', 'inventory totals');
  compare('Agent reference', 'consolidated', consolidated.length, totals.consolidated, 'computed', 'inventory totals');
  compare('Agent reference', 'excluded', excluded.length, totals.excluded, 'computed', 'inventory totals');
  compare('Agent reference', 'remaining', pending.length, totals.remaining, 'computed', 'inventory totals');

  const definitionIds = new Set();
  const sourcePaths = new Set();
  const agentsByReferencePath = new Map(
    agents
      .filter((agent) => agent.references.repo === inventory.sourceRepo)
      .flatMap((agent) => agent.references.paths.map((referencePath) => [referencePath, agent]))
  );
  for (const definition of definitions) {
    for (const field of ['id', 'plugin', 'sourceName', 'runtimeName', 'status', 'sourcePath', 'sourceBlobSha', 'targetPath']) {
      if (!definition[field]) fail(`Agent reference definition is missing ${field}`);
    }
    if (!['pending', 'consolidated', 'excluded'].includes(definition.status)) fail(`${definition.id}: invalid status ${definition.status}`);
    if (definition.status === 'excluded' && !definition.exclusionReason) fail(`${definition.id}: excluded definition is missing exclusionReason`);
    if (definitionIds.has(definition.id)) fail(`Duplicate Agent reference id: ${definition.id}`);
    if (sourcePaths.has(definition.sourcePath)) fail(`Duplicate upstream source path: ${definition.sourcePath}`);
    definitionIds.add(definition.id);
    sourcePaths.add(definition.sourcePath);
    const catalogEntry = agentsByReferencePath.get(definition.sourcePath);
    if (definition.status === 'consolidated' && !catalogEntry) fail(`${definition.id}: consolidated reference has no canonical Agent`);
    if (definition.status === 'pending' && catalogEntry) fail(`${definition.id}: canonical Agent exists but reference is pending`);
    if (definition.status === 'excluded' && catalogEntry) fail(`${definition.id}: excluded reference must not map to a canonical Agent`);
    if (catalogEntry) {
      compare(definition.id, 'runtimeName', definition.runtimeName, catalogEntry.name, 'inventory', 'agents.json');
      compare(definition.id, 'targetPath', definition.targetPath, catalogEntry.path, 'inventory', 'agents.json');
      compare(
        definition.id,
        'sourceName',
        definition.sourceName,
        path.basename(definition.sourcePath, '.md'),
        'inventory',
        'source path'
      );
      compare(definition.id, 'sourceTree', inventory.sourceTreeSha, catalogEntry.references.tree, 'inventory', 'agents.json');
    }
  }
  for (const referencePath of wshobsonReferencePaths) {
    if (!sourcePaths.has(referencePath)) fail(`${referencePath}: canonical Agent reference is missing from inventory`);
  }
}

if (fs.existsSync(readmePath)) {
  const readme = fs.readFileSync(readmePath, 'utf8');
  const skillCategoryCounts = new Map();
  for (const skill of validSkills) {
    skillCategoryCounts.set(skill.category, (skillCategoryCounts.get(skill.category) || 0) + 1);
  }
  const skillCategoryCount = skillCategoryCounts.size;
  const agentCategoryCount = new Set(agents.map((agent) => agent.category)).size;
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
  function checkReadmeNumbers(label, pattern, expected) {
    const match = readme.match(pattern);
    if (!match) {
      fail(`README is missing ${label}`);
      return;
    }
    expected.forEach((value, index) => {
      if (Number(match[index + 1]) !== value) {
        fail(`README ${label} (${match[index + 1]}) does not match expected value (${value})`);
      }
    });
  }
  const skillCountMatch = readme.match(/\*\*(\d+) Skills\*\*/i);
  if (skillCountMatch && Number(skillCountMatch[1]) !== skills.length) {
    fail(`README skill count (${skillCountMatch[1]}) does not match skills.length (${skills.length})`);
  }
  const agentCountMatch = readme.match(/目前共收錄 \*\*(\d+)\*\* 個不重複 Agents/i);
  if (agentCountMatch && Number(agentCountMatch[1]) !== agents.length) {
    fail(`README Agent count (${agentCountMatch[1]}) does not match agents.length (${agents.length})`);
  }
  checkReadmeNumbers('Skill badge count', /badge\/Skills-(\d+)-7c3aed/, [skills.length]);
  checkReadmeNumbers('Agent badge count', /badge\/Agents-(\d+)-2563eb/, [agents.length]);
  checkReadmeNumbers('install-all component counts', /全部 (\d+) 個 Skills、(\d+) 個 Agents/, [skills.length, agents.length]);
  checkReadmeNumbers(
    'catalog Skill and category counts',
    /\| Skills \| \*\*(\d+) Skills\*\*／(\d+) 類 \|/,
    [skills.length, skillCategoryCount]
  );
  checkReadmeNumbers('catalog Agent and category counts', /\| Agents \| (\d+)／(\d+) 類 \|/, [agents.length, agentCategoryCount]);
  checkReadmeNumbers(
    'Skill section total and category counts',
    /^(\d+) 個 Skills 分成 (\d+) 類。/m,
    [skills.length, skillCategoryCount]
  );

  const skillHeading = readme.match(/^## Skills\r?$/m);
  if (!skillHeading) {
    fail('README is missing the Skills section');
  } else {
    const sectionStart = skillHeading.index + skillHeading[0].length;
    const remaining = readme.slice(sectionStart);
    const nextHeadingOffset = remaining.search(/\r?\n## /);
    const skillSection = nextHeadingOffset === -1 ? remaining : remaining.slice(0, nextHeadingOffset);
    const readmeCategoryCounts = new Map();
    for (const match of skillSection.matchAll(/^\| `([^`]+)` \| (\d+) \|/gm)) {
      if (readmeCategoryCounts.has(match[1])) {
        fail(`README Skill category table contains a duplicate row: ${match[1]}`);
      }
      readmeCategoryCounts.set(match[1], Number(match[2]));
    }
    for (const [category, expectedCount] of skillCategoryCounts) {
      if (!readmeCategoryCounts.has(category)) {
        fail(`README Skill category table is missing: ${category}`);
      } else if (readmeCategoryCounts.get(category) !== expectedCount) {
        fail(`README Skill category ${category} (${readmeCategoryCounts.get(category)}) does not match expected value (${expectedCount})`);
      }
    }
    for (const category of readmeCategoryCounts.keys()) {
      if (!skillCategoryCounts.has(category)) fail(`README Skill category table contains an unknown category: ${category}`);
    }
  }
  for (const adapter of ['Codex', 'Claude', 'Cursor', 'Copilot', 'OpenCode']) {
    checkReadmeNumbers(`${adapter} adapter count`, new RegExp(`\\| ${adapter} adapters \\| (\\d+) \\|`), [agents.length]);
  }
  checkReadmeNumbers(
    'all Agent reference path and repository counts',
    /\| All pinned Agent references \| (\d+) paths／(\d+) repositories \|/,
    [allReferencePaths.size, allReferenceRepos.size]
  );
  checkReadmeNumbers(
    'additional Agent reference path and repository counts',
    /\| Additional Agent references \| (\d+) paths／(\d+) repositories \|/,
    [additionalReferencePaths.size, additionalReferenceRepos.size]
  );
  checkReadmeNumbers(
    'additional Agent and repository counts',
    /另外 (\d+) 個 Agents 來自其餘 (\d+) 個 reference repositories/,
    [additionalAgentCount, additionalReferenceRepos.size]
  );
  checkReadmeNumbers('coverage matrix category counts', /完成 (\d+)／(\d+) 類核心責任鏈覆蓋/, [agentCategoryCount, agentCategoryCount]);
  checkReadmeNumbers(
    'expanded index category and Agent counts',
    /展開 (\d+) 類、(\d+) 個 Agents 的完整索引/,
    [agentCategoryCount, agents.length]
  );
  checkReadmeNumbers('originality audit Agent count', /audit:agent-originality` 會針對 (\d+) 個 canonical Agent prompt/, [agents.length]);
  checkReadmeNumbers('repository license Agent count', /Repository 與全部 (\d+) 個 Agents 採/, [agents.length]);
  checkReadmeNumbers(
    'repository Apache-2.0 Skill count',
    /目前 (\d+) 個為 Apache-2.0/,
    [validSkills.filter((skill) => skill.license === 'Apache-2.0').length]
  );
}

if (errors.length > 0) {
  console.error('Catalog validation failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Catalog validation passed: ${skills.length} skills, ${agents.length} agents`);
