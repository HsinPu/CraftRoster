const { validateAgentSkillDependencies, namePattern } = require('./agent-metadata');

function componentNames(catalog, key, identity) {
  if (!catalog || !Array.isArray(catalog[key]) || !catalog[key].length) {
    throw new Error(`${key} catalog must have a nonempty ${key} array`);
  }
  const names = new Set();
  for (const entry of catalog[key]) {
    if (!entry || typeof entry[identity] !== 'string' || !namePattern.test(entry[identity])
      || entry[identity].length > 64 || names.has(entry[identity])) {
      throw new Error(`${key} catalog contains an invalid or duplicate component`);
    }
    names.add(entry[identity]);
  }
  return names;
}

function singleLine(value, label) {
  if (typeof value !== 'string' || !value.trim() || value === '-' || /[\u0000-\u001f\u007f]/.test(value)) {
    throw new Error(`${label} must be nonempty single-line text`);
  }
}

function validateBundleRegistry(registry, agentCatalog, skillCatalog) {
  const agents = componentNames(agentCatalog, 'agents', 'id');
  const skills = componentNames(skillCatalog, 'skills', 'name');
  if (!registry || registry.version !== 1 || !Array.isArray(registry.bundles) || !registry.bundles.length
    || Object.keys(registry).some((key) => !['version', 'bundles'].includes(key))) {
    throw new Error('Install bundle registry must use version 1 and a nonempty bundles array');
  }
  const ids = new Set();
  const coverage = { agents: new Set(), skills: new Set() };
  for (const bundle of registry.bundles) {
    if (!bundle || typeof bundle !== 'object' || Array.isArray(bundle)
      || Object.keys(bundle).some((key) => !['id', 'title', 'description', 'agents', 'skills'].includes(key))) {
      throw new Error('Install bundle entry must contain only id, title, description, agents, and skills');
    }
    if (typeof bundle.id !== 'string' || !namePattern.test(bundle.id) || bundle.id.length > 64
      || bundle.id === 'all' || ids.has(bundle.id)) {
      throw new Error(`Invalid or duplicate install bundle id: ${bundle.id}`);
    }
    ids.add(bundle.id);
    singleLine(bundle.title, `${bundle.id} title`);
    singleLine(bundle.description, `${bundle.id} description`);
    for (const [type, known] of [['agents', agents], ['skills', skills]]) {
      if (!Array.isArray(bundle[type]) || !bundle[type].length) {
        throw new Error(`${bundle.id}: ${type} must be a nonempty array`);
      }
      const seen = new Set();
      for (const name of bundle[type]) {
        if (typeof name !== 'string' || !known.has(name)) throw new Error(`${bundle.id}: unknown ${type} member ${JSON.stringify(name)}`);
        if (seen.has(name)) throw new Error(`${bundle.id}: duplicate ${type} member ${name}`);
        seen.add(name);
        coverage[type].add(name);
      }
    }
  }
  for (const [type, known] of [['agents', agents], ['skills', skills]]) {
    const missing = [...known].filter((name) => !coverage[type].has(name)).sort();
    if (missing.length) throw new Error(`Install bundle coverage is missing ${type}: ${missing.join(', ')}`);
  }
  return { agents, skills };
}

function buildBundleRows(registry, agentCatalog, skillCatalog) {
  validateBundleRegistry(registry, agentCatalog, skillCatalog);
  return registry.bundles.flatMap((bundle) => ['agents', 'skills'].flatMap((type) => [...bundle[type]].sort().map((name) => ({
    bundle: bundle.id, title: bundle.title, description: bundle.description,
    type: type === 'agents' ? 'agent' : 'skill', name
  }))));
}

function buildAgentDependencyRows(agentCatalog, skillCatalog) {
  componentNames(agentCatalog, 'agents', 'id');
  const skills = componentNames(skillCatalog, 'skills', 'name');
  return [...agentCatalog.agents].sort((a, b) => a.id.localeCompare(b.id)).flatMap((agent) => {
    const dependencies = validateAgentSkillDependencies(agent.id, agent.skillDependencies, skills);
    if (JSON.stringify(agent.skills) !== JSON.stringify(dependencies.map((entry) => entry.name))) {
      throw new Error(`${agent.id}: skills compatibility list does not match skillDependencies`);
    }
    if (!dependencies.length) return [{ agent: agent.id, skill: '-', kind: 'none', when: '-', reason: '-' }];
    return [...dependencies].sort((a, b) => a.name.localeCompare(b.name)).map((entry) => ({
      agent: agent.id, skill: entry.name, kind: entry.kind, when: entry.when || '-', reason: entry.reason
    }));
  });
}

function renderRows(rows, columns) {
  return `${columns.join('\t')}\n${rows.map((row) => columns.map((key) => row[key]).join('\t')).join('\n')}\n`;
}

function renderBundleSummary(registry) {
  return ['<!-- INSTALL_BUNDLES_START -->',
    '| 用途分類 | Skills | 子代理 |', '|---|---:|---:|',
    ...registry.bundles.map((bundle) => `| ${bundle.title} (\`${bundle.id}\`) | ${bundle.skills.length} | ${bundle.agents.length} |`),
    '<!-- INSTALL_BUNDLES_END -->'].join('\n');
}

module.exports = { componentNames, validateBundleRegistry, buildBundleRows, buildAgentDependencyRows, renderRows, renderBundleSummary };
