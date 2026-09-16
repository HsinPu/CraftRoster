#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { validateDependencies, validateSiblingLinks } = require('./lib/skill-dependencies');

const componentNamePattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const revisionPattern = /^[0-9a-f]{40}$/;
const canonicalAuthor = 'HsinPu';
const canonicalSource = 'HsinPu/CraftRoster';

const unsafeMappingKeys = new Set(['__proto__', 'constructor', 'prototype']);

function frontmatterError(filePath, lineNumber, message) {
  return new Error(`${filePath}: line ${lineNumber}: ${message}`);
}

function assertSafeMappingKey(filePath, lineNumber, name) {
  if (unsafeMappingKeys.has(name)) {
    throw frontmatterError(filePath, lineNumber, `unsupported mapping key: ${name}`);
  }
}

function quotedScalarSuffixIsValid(suffix) {
  return suffix === '' || /^\s+#.*$/.test(suffix);
}

function parseDoubleQuotedScalar(value, filePath, lineNumber) {
  let escaped = false;
  let closingQuote = -1;
  for (let index = 1; index < value.length; index += 1) {
    const character = value[index];
    if (escaped) {
      escaped = false;
    } else if (character === '\\') {
      escaped = true;
    } else if (character === '"') {
      closingQuote = index;
      break;
    }
  }
  if (closingQuote === -1) {
    throw frontmatterError(filePath, lineNumber, 'unterminated double-quoted scalar');
  }
  const suffix = value.slice(closingQuote + 1);
  if (!quotedScalarSuffixIsValid(suffix)) {
    throw frontmatterError(filePath, lineNumber, 'unexpected content after double-quoted scalar');
  }
  try {
    return JSON.parse(value.slice(0, closingQuote + 1));
  } catch (error) {
    throw frontmatterError(filePath, lineNumber, `invalid double-quoted scalar (${error.message})`);
  }
}

function parseSingleQuotedScalar(value, filePath, lineNumber) {
  let closingQuote = -1;
  for (let index = 1; index < value.length; index += 1) {
    if (value[index] !== "'") continue;
    if (value[index + 1] === "'") {
      index += 1;
      continue;
    }
    closingQuote = index;
    break;
  }
  if (closingQuote === -1) {
    throw frontmatterError(filePath, lineNumber, 'unterminated single-quoted scalar');
  }
  const suffix = value.slice(closingQuote + 1);
  if (!quotedScalarSuffixIsValid(suffix)) {
    throw frontmatterError(filePath, lineNumber, 'unexpected content after single-quoted scalar');
  }
  return value.slice(1, closingQuote).replace(/''/g, "'");
}

function stripPlainScalarComment(value) {
  for (let index = 0; index < value.length; index += 1) {
    if (value[index] === '#' && index > 0 && /\s/.test(value[index - 1])) {
      return value.slice(0, index).trimEnd();
    }
  }
  return value;
}

function parseScalar(value, filePath, lineNumber) {
  const trimmed = value.trim();
  if (trimmed === '' || trimmed.startsWith('#')) return null;
  if (trimmed.startsWith('"')) return parseDoubleQuotedScalar(trimmed, filePath, lineNumber);
  if (trimmed.startsWith("'")) return parseSingleQuotedScalar(trimmed, filePath, lineNumber);

  const plain = stripPlainScalarComment(trimmed);
  if (plain === '') return null;
  if (/^[\[\]{},&*!|>%@`]/.test(plain) || /^(?:-|\?|:)\s/.test(plain)) {
    throw frontmatterError(filePath, lineNumber, `unsupported YAML scalar: ${plain}`);
  }
  if (/:\s/.test(plain)) {
    throw frontmatterError(filePath, lineNumber, 'plain scalars containing a colon followed by whitespace must be quoted');
  }
  if (plain === 'true') return true;
  if (plain === 'false') return false;
  if (plain === 'null' || plain === '~') return null;
  if (/^[+-]?(?:0|[1-9]\d*)(?:\.\d+)?$/.test(plain)) return Number(plain);
  return plain;
}

function parseYamlFrontmatter(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) throw new Error(`${filePath} is missing YAML frontmatter`);

  const fields = {};
  let currentContainer = null;
  const lines = match[1].split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const lineNumber = index + 2;
    if (/^\s*$/.test(line) || /^\s*#/.test(line)) continue;
    if (line.includes('\t')) {
      throw frontmatterError(filePath, lineNumber, 'tabs are not supported in YAML frontmatter');
    }

    const topLevel = line.match(/^([A-Za-z0-9_-]+):(?: *(.*))$/);
    if (topLevel) {
      const [, name, rawValue] = topLevel;
      assertSafeMappingKey(filePath, lineNumber, name);
      if (Object.prototype.hasOwnProperty.call(fields, name)) {
        throw new Error(`${filePath} contains duplicate frontmatter field: ${name}`);
      }
      if (rawValue.trim() === '') {
        fields[name] = null;
        currentContainer = name;
      } else {
        fields[name] = parseScalar(rawValue, filePath, lineNumber);
        currentContainer = null;
      }
      continue;
    }

    const listItem = line.match(/^  -(?: +(.*))$/);
    if (listItem) {
      if (!currentContainer) {
        throw frontmatterError(filePath, lineNumber, 'list item has no top-level parent');
      }
      if (fields[currentContainer] === null) fields[currentContainer] = [];
      if (!Array.isArray(fields[currentContainer])) {
        throw frontmatterError(filePath, lineNumber, `${currentContainer} cannot mix mapping entries and list items`);
      }
      const value = parseScalar(listItem[1], filePath, lineNumber);
      if (value === null) {
        throw frontmatterError(filePath, lineNumber, 'empty list items are not supported');
      }
      fields[currentContainer].push(value);
      continue;
    }

    const nested = line.match(/^  ([A-Za-z0-9_.-]+):(?: *(.*))$/);
    if (nested) {
      if (!currentContainer) {
        throw frontmatterError(filePath, lineNumber, 'nested mapping entry has no top-level parent');
      }
      const [, name, rawValue] = nested;
      assertSafeMappingKey(filePath, lineNumber, name);
      if (fields[currentContainer] === null) fields[currentContainer] = {};
      if (!fields[currentContainer] || typeof fields[currentContainer] !== 'object' || Array.isArray(fields[currentContainer])) {
        throw frontmatterError(filePath, lineNumber, `${currentContainer} cannot mix list items and mapping entries`);
      }
      if (Object.prototype.hasOwnProperty.call(fields[currentContainer], name)) {
        throw new Error(`${filePath} contains duplicate ${currentContainer} field: ${name}`);
      }
      fields[currentContainer][name] = parseScalar(rawValue, filePath, lineNumber);
      continue;
    }

    throw frontmatterError(filePath, lineNumber, `unsupported YAML syntax: ${line.trim()}`);
  }
  return fields;
}

function parseSkillFrontmatter(filePath) {
  return parseYamlFrontmatter(filePath);
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    throw new Error(`Unable to read ${filePath}: ${error.message}`);
  }
}

function assertNonEmptyString(value, label) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${label} must be a non-empty string`);
  }
}

function validateConfig(config, skillNames) {
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    throw new Error('Skill catalog config must be an object');
  }
  assertNonEmptyString(config.version, 'Skill catalog config version');
  assertNonEmptyString(config.updated, 'Skill catalog config updated');
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(config.updated)) {
    throw new Error('Skill catalog config updated must be a deterministic UTC timestamp');
  }

  if (!Array.isArray(config.categories) || config.categories.length === 0) {
    throw new Error('Skill catalog config categories must be a non-empty array');
  }
  const categoryIds = new Set();
  for (const category of config.categories) {
    if (!category || typeof category !== 'object' || Array.isArray(category)) {
      throw new Error('Skill catalog config contains an invalid category');
    }
    for (const field of ['id', 'name', 'description']) {
      assertNonEmptyString(category[field], `Skill category ${category.id || '(unknown)'} ${field}`);
    }
    if (!componentNamePattern.test(category.id)) {
      throw new Error(`Skill category has an invalid id: ${category.id}`);
    }
    if (categoryIds.has(category.id)) throw new Error(`Duplicate Skill category id: ${category.id}`);
    categoryIds.add(category.id);
  }

  if (!config.skills || typeof config.skills !== 'object' || Array.isArray(config.skills)) {
    throw new Error('Skill catalog config skills must be an object');
  }
  const configuredNames = Object.keys(config.skills).sort();
  const expectedNames = [...skillNames].sort();
  const missing = expectedNames.filter((name) => !configuredNames.includes(name));
  const unknown = configuredNames.filter((name) => !skillNames.has(name));
  if (missing.length > 0) throw new Error(`Skill catalog config is missing: ${missing.join(', ')}`);
  if (unknown.length > 0) throw new Error(`Skill catalog config contains unknown Skills: ${unknown.join(', ')}`);

  const usedCategories = new Set();
  validateDependencies(config.skills);
  for (const name of configuredNames) {
    const entry = config.skills[name];
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      throw new Error(`${name}: Skill catalog config entry must be an object`);
    }
    if (!categoryIds.has(entry.category)) {
      throw new Error(`${name}: unknown Skill category ${JSON.stringify(entry.category)}`);
    }
    usedCategories.add(entry.category);
    if (!Array.isArray(entry.tags) || entry.tags.length < 2) {
      throw new Error(`${name}: tags must contain at least two entries`);
    }
    const seenTags = new Set();
    for (const tag of entry.tags) {
      if (typeof tag !== 'string' || tag.trim() === '' || tag !== tag.toLowerCase() || /\s/.test(tag)) {
        throw new Error(`${name}: invalid tag ${JSON.stringify(tag)}`);
      }
      if (seenTags.has(tag)) throw new Error(`${name}: duplicate tag ${tag}`);
      seenTags.add(tag);
    }
  }
  for (const categoryId of categoryIds) {
    if (!usedCategories.has(categoryId)) throw new Error(`Unused Skill category: ${categoryId}`);
  }

  if (!Array.isArray(config.routingGroups)) {
    throw new Error('Skill catalog config routingGroups must be an array');
  }
  const routingIds = new Set();
  for (const group of config.routingGroups) {
    if (!group || typeof group !== 'object' || Array.isArray(group)) {
      throw new Error('Skill catalog config contains an invalid routing group');
    }
    for (const field of ['id', 'title', 'decision']) {
      assertNonEmptyString(group[field], `Skill routing group ${group.id || '(unknown)'} ${field}`);
    }
    if (!componentNamePattern.test(group.id)) throw new Error(`Invalid Skill routing group id: ${group.id}`);
    if (routingIds.has(group.id)) throw new Error(`Duplicate Skill routing group id: ${group.id}`);
    routingIds.add(group.id);
    if (!Array.isArray(group.skills) || group.skills.length < 2) {
      throw new Error(`${group.id}: routing group must contain at least two Skills`);
    }
    const routedNames = new Set();
    for (const route of group.skills) {
      if (!route || typeof route !== 'object' || Array.isArray(route)) {
        throw new Error(`${group.id}: routing entry must be an object`);
      }
      assertNonEmptyString(route.name, `${group.id} routing Skill name`);
      assertNonEmptyString(route.when, `${group.id}/${route.name} routing condition`);
      if (!skillNames.has(route.name)) throw new Error(`${group.id}: unknown routed Skill ${route.name}`);
      if (routedNames.has(route.name)) throw new Error(`${group.id}: duplicate routed Skill ${route.name}`);
      routedNames.add(route.name);
    }
  }
}

function listSkillFiles(root) {
  const skillsRoot = path.join(root, 'skills');
  if (!fs.existsSync(skillsRoot)) throw new Error('skills/ directory is missing');
  return fs.readdirSync(skillsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => ({
      name: entry.name,
      filePath: path.join(skillsRoot, entry.name, 'SKILL.md')
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

function buildCatalog(root) {
  const configPath = path.join(root, 'scripts', 'data', 'skill-catalog.json');
  const config = readJson(configPath);
  const files = listSkillFiles(root);
  for (const entry of files) {
    if (!fs.existsSync(entry.filePath)) throw new Error(`skills/${entry.name}/SKILL.md is missing`);
  }
  const skillNames = new Set(files.map((entry) => entry.name));
  validateConfig(config, skillNames);
  validateSiblingLinks(root, config.skills);

  const skills = files.map(({ name, filePath }) => {
    const fields = parseSkillFrontmatter(filePath);
    const metadata = fields.metadata;
    if (fields.name !== name) throw new Error(`${name}: frontmatter name does not match its directory`);
    assertNonEmptyString(fields.description, `${name}: description`);
    assertNonEmptyString(fields.license, `${name}: license`);
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
      throw new Error(`${name}: metadata must be a mapping`);
    }
    if (metadata.author !== canonicalAuthor) throw new Error(`${name}: metadata.author must be ${canonicalAuthor}`);
    if (metadata.source !== canonicalSource) throw new Error(`${name}: metadata.source must be ${canonicalSource}`);

    const classification = config.skills[name];
    const skill = {
      name,
      description: fields.description,
      category: classification.category,
      author: metadata.author,
      source: metadata.source,
      license: fields.license,
      tags: classification.tags
    };
    if (classification.dependencies && classification.dependencies.length) {
      skill.dependencies = [...classification.dependencies].sort((a, b) => a.name.localeCompare(b.name));
    }

    const referenceSource = metadata['reference-source'];
    const referenceLicense = metadata['reference-license'];
    const referenceRevision = metadata['reference-revision'];
    if (Boolean(referenceSource) !== Boolean(referenceLicense)) {
      throw new Error(`${name}: reference-source and reference-license must be declared together`);
    }
    if (referenceSource) {
      assertNonEmptyString(referenceSource, `${name}: reference-source`);
      assertNonEmptyString(referenceLicense, `${name}: reference-license`);
      skill.reference = { source: referenceSource, license: referenceLicense };
      if (referenceRevision) {
        if (!revisionPattern.test(referenceRevision)) {
          throw new Error(`${name}: reference-revision must be a 40-character lowercase Git SHA`);
        }
        skill.reference.revision = referenceRevision;
      }
    } else if (referenceRevision) {
      throw new Error(`${name}: reference-revision requires reference-source and reference-license`);
    }
    return skill;
  });

  return {
    version: config.version,
    updated: config.updated,
    total: skills.length,
    categories: config.categories,
    skills,
    routingGroups: config.routingGroups
  };
}

function renderCatalog(catalog) {
  return `${JSON.stringify(catalog, null, 2)}\n`;
}

function run(argv = process.argv.slice(2), root = path.resolve(__dirname, '..')) {
  let check = false;
  for (const arg of argv) {
    if (arg === '--check') check = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }

  const catalogPath = path.join(root, 'skills.json');
  const rendered = renderCatalog(buildCatalog(root));
  if (check) {
    const current = fs.existsSync(catalogPath) ? fs.readFileSync(catalogPath, 'utf8') : '';
    if (current !== rendered) {
      throw new Error('skills.json is out of date; run npm run generate:skills');
    }
    console.log('Skill catalog generation check passed');
    return;
  }
  fs.writeFileSync(catalogPath, rendered, 'utf8');
  const total = JSON.parse(rendered).total;
  console.log(`Generated skills.json for ${total} Skills`);
}

if (require.main === module) {
  try {
    run();
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = {
  buildCatalog,
  parseSkillFrontmatter,
  parseYamlFrontmatter,
  renderCatalog,
  run,
  validateConfig
};
