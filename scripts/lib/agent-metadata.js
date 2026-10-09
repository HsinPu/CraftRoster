const fs = require('fs');

const namePattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const dependencyKinds = new Set(['required', 'recommended', 'conditional', 'optional']);
const unsafeKeys = new Set(['__proto__', 'constructor', 'prototype']);

function scalar(raw, label) {
  const value = raw.trim();
  if (value === '[]') return [];
  if (value.startsWith('"')) {
    let closing = -1;
    let escaped = false;
    for (let i = 1; i < value.length; i += 1) {
      if (escaped) escaped = false;
      else if (value[i] === '\\') escaped = true;
      else if (value[i] === '"') { closing = i; break; }
    }
    if (closing === -1 || !/^(?:\s+#.*)?$/.test(value.slice(closing + 1))) {
      throw new Error(`${label}: invalid quoted scalar`);
    }
    try { return JSON.parse(value.slice(0, closing + 1)); }
    catch { throw new Error(`${label}: invalid quoted scalar`); }
  }
  if (value.startsWith("'")) {
    const match = value.match(/^'((?:[^']|'')*)'(?:\s+#.*)?$/);
    if (!match) throw new Error(`${label}: invalid quoted scalar`);
    return match[1].replace(/''/g, "'");
  }
  const plain = value.replace(/\s+#.*$/, '').trimEnd();
  if (!plain || /^[\[\]{},&*!|>%@`]/.test(plain) || /:\s/.test(plain)) {
    throw new Error(`${label}: unsupported scalar (quote values containing a colon)`);
  }
  return plain;
}

function parseAgentText(text, label = 'Agent') {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)([\s\S]*)$/);
  if (!match) throw new Error(`${label} is missing YAML frontmatter`);
  const fields = {};
  let container = null;
  let item = null;
  const set = (target, key, value, line) => {
    if (unsafeKeys.has(key)) throw new Error(`${label}: line ${line}: unsupported mapping key: ${key}`);
    if (Object.hasOwn(target, key)) throw new Error(`${label}: line ${line}: duplicate frontmatter field: ${key}`);
    target[key] = value;
  };
  for (const [index, line] of match[1].split(/\r?\n/).entries()) {
    const lineNumber = index + 2;
    if (/^\s*$/.test(line) || /^\s*#/.test(line)) continue;
    if (line.includes('\t')) throw new Error(`${label}: line ${lineNumber}: tabs are not supported`);
    const top = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (top) {
      set(fields, top[1], top[2] ? scalar(top[2], `${label}: line ${lineNumber}`) : [], lineNumber);
      container = top[2] ? null : top[1];
      item = null;
      continue;
    }
    const list = line.match(/^  - (.+)$/);
    if (list && container) {
      if (container === 'skill-dependencies') {
        const first = list[1].match(/^([A-Za-z0-9_-]+):\s*(.+)$/);
        if (!first) throw new Error(`${label}: line ${lineNumber}: skill-dependencies items must be mappings`);
        item = {};
        set(item, first[1], scalar(first[2], `${label}: line ${lineNumber}`), lineNumber);
        fields[container].push(item);
      } else {
        item = null;
        fields[container].push(scalar(list[1], `${label}: line ${lineNumber}`));
      }
      continue;
    }
    const nested = line.match(/^    ([A-Za-z0-9_-]+):\s*(.+)$/);
    if (nested && container === 'skill-dependencies' && item) {
      set(item, nested[1], scalar(nested[2], `${label}: line ${lineNumber}`), lineNumber);
      continue;
    }
    throw new Error(`${label}: line ${lineNumber}: unsupported Agent frontmatter structure`);
  }
  return { fields, body: match[2].trim() };
}

function validateAgentSkillDependencies(role, dependencies, knownSkills) {
  if (!Array.isArray(dependencies)) throw new Error(`${role}: skill-dependencies must be an array`);
  const seen = new Set();
  return dependencies.map((entry) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      throw new Error(`${role}: Skill dependency must be an object`);
    }
    if (Object.keys(entry).some((key) => !['name', 'kind', 'reason', 'when'].includes(key))) {
      throw new Error(`${role}: unknown Skill dependency field`);
    }
    if (typeof entry.name !== 'string' || !namePattern.test(entry.name) || entry.name.length > 64
      || (knownSkills && !knownSkills.has(entry.name))) {
      throw new Error(`${role}: unknown or invalid Skill dependency ${JSON.stringify(entry.name)}`);
    }
    if (seen.has(entry.name)) throw new Error(`${role}: duplicate Skill dependency ${entry.name}`);
    seen.add(entry.name);
    if (!dependencyKinds.has(entry.kind)) throw new Error(`${role}: invalid Skill dependency kind for ${entry.name}`);
    for (const key of ['reason', ...(entry.kind === 'conditional' ? ['when'] : [])]) {
      if (typeof entry[key] !== 'string' || !entry[key].trim() || entry[key] === '-' || /[\x00-\x1f\x7f]/.test(entry[key])) {
        throw new Error(`${role}: ${entry.name} needs a nonempty single-line ${key}`);
      }
    }
    if (entry.kind !== 'conditional' && Object.hasOwn(entry, 'when')) {
      throw new Error(`${role}: ${entry.kind} Skill dependency ${entry.name} must omit when`);
    }
    return { name: entry.name, kind: entry.kind,
      ...(entry.kind === 'conditional' ? { when: entry.when } : {}), reason: entry.reason };
  });
}

function readAgent(filePath, knownSkills) {
  const result = parseAgentText(fs.readFileSync(filePath, 'utf8'), filePath);
  if (Object.hasOwn(result.fields, 'skills')) {
    throw new Error(`${filePath}: canonical Agents must use skill-dependencies, not a second skills list`);
  }
  result.skillDependencies = validateAgentSkillDependencies(result.fields.role || filePath,
    result.fields['skill-dependencies'], knownSkills);
  result.fields.skills = result.skillDependencies.map((entry) => entry.name);
  return result;
}

function renderSkillGuidance(body, dependencies) {
  if (!dependencies.length) return body;
  const lines = dependencies.map((entry) =>
    `- \`${entry.name}\` (${entry.kind}${entry.when ? `; ${entry.when}` : ''}): ${entry.reason}`);
  return [body, '', '## Skill support', '',
    'Use the installed Skills below through the host\'s Skill discovery or file-reading tools when their scope fits the task. Read the relevant SKILL.md before applying its workflow. Installation does not grant tool access or authorization for external actions.',
    'Required support must be available before work that depends on it; report missing support instead of claiming that workflow is complete. Recommended support is guidance, and conditional or optional support applies only in its stated context.',
    '', ...lines].join('\n');
}

module.exports = { parseAgentText, readAgent, validateAgentSkillDependencies, renderSkillGuidance, namePattern };
