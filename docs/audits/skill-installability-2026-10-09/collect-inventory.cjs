#!/usr/bin/env node
'use strict';

// Research only: canonical Skill packages and installer metadata stay read-only.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { siblingLinks } = require('../../../scripts/lib/skill-dependencies');
const root = path.resolve(__dirname, '../../..');
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'skills.json'), 'utf8'));
const taxonomy = JSON.parse(fs.readFileSync(path.join(root, 'scripts/data/skill-catalog.json'), 'utf8'));
const names = new Set(catalog.skills.map(function (skill) { return skill.name; }));
const nameExpression = new RegExp('(?<![a-z0-9-])(' + [...names].sort(function (a, b) { return b.length - a.length; }).join('|') + ')(?![a-z0-9-])', 'g');
const sha256 = function (bytes) { return crypto.createHash('sha256').update(bytes).digest('hex'); };
const relative = function (file) { return path.relative(root, file).split(path.sep).join('/'); };
const scanExtensions = new Set(['.md', '.js', '.cjs', '.mjs', '.py', '.ps1', '.sh', '.json', '.yaml', '.yml', '.toml']);

function packageFiles(directory) {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (['evals', 'node_modules', '.git', '__pycache__'].includes(entry.name)) continue;
    const file = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error('Unexpected symlink in audit input: ' + relative(file));
    if (entry.isDirectory()) files.push(...packageFiles(file));
    else if (entry.isFile() && scanExtensions.has(path.extname(entry.name))) files.push(file);
  }
  return files.sort();
}

function declaredComponents(skills) {
  const adjacency = new Map(skills.map(function (skill) { return [skill.name, new Set()]; }));
  for (const skill of skills) {
    for (const dep of skill.declaredDependencies) {
      if (dep.kind !== 'required') continue;
      adjacency.get(skill.name).add(dep.name);
      adjacency.get(dep.name).add(skill.name);
    }
  }
  const seen = new Set();
  const groups = [];
  for (const name of [...names].sort()) {
    if (seen.has(name) || !adjacency.get(name).size) continue;
    const pending = [name], members = [];
    while (pending.length) {
      const member = pending.pop();
      if (seen.has(member)) continue;
      seen.add(member); members.push(member);
      for (const next of adjacency.get(member)) pending.push(next);
    }
    groups.push(members.sort());
  }
  return groups;
}

const skills = catalog.skills.map(function (skill) {
  const files = packageFiles(path.join(root, 'skills', skill.name));
  const mentions = [], resourceLinks = [], sourceFiles = [], parseWarnings = [];
  for (const file of files) {
    const bytes = fs.readFileSync(file);
    sourceFiles.push({ file: relative(file), sha256: sha256(bytes), bytes: bytes.length });
    if (bytes.length > 512 * 1024) { parseWarnings.push(relative(file) + ': text scan omitted above 512 KiB'); continue; }
    const text = bytes.toString('utf8');
    const lines = text.split(/\r?\n/);
    let fenced = false;
    for (let index = 0; index < lines.length; index++) {
      const line = lines[index];
      if (/^\s*(`{3,}|~{3,})/.test(line)) fenced = !fenced;
      const targets = new Set();
      for (const match of line.matchAll(nameExpression)) {
        if (match[1] !== skill.name) targets.add(match[1]);
      }
      for (const target of targets) {
        mentions.push({ target, file: relative(file), line: index + 1, text: line.trim().slice(0, 500), fenced });
      }
    }
    if (path.extname(file) !== '.md') continue;
    try {
      for (const raw of siblingLinks(text)) {
        const targetFile = path.resolve(path.dirname(file), raw);
        const packageRelative = path.relative(path.join(root, 'skills'), targetFile);
        if (packageRelative.startsWith('..') || path.isAbsolute(packageRelative)) continue;
        const segments = packageRelative.split(path.sep);
        const target = segments[0];
        const targetResource = segments.slice(1).join('/');
        if (target === skill.name) continue;
        const location = lines.findIndex(function (line) { return line.includes(raw); });
        const effectiveResource = targetResource ? targetFile : path.join(targetFile, 'SKILL.md');
        const isRegularFile = fs.existsSync(effectiveResource) && fs.statSync(effectiveResource).isFile();
        resourceLinks.push({ target, targetResource: targetResource || 'SKILL.md', file: relative(file), line: location + 1, raw, knownSkill: names.has(target), isRegularFile });
      }
    } catch (error) { parseWarnings.push(relative(file) + ': ' + error.message); }
  }
  const declaredDependencies = taxonomy.skills[skill.name].dependencies || [];
  const mentionedTargets = [...new Set(mentions.map(function (mention) { return mention.target; }))].sort();
  return {
    name: skill.name, category: skill.category, description: skill.description,
    entry: 'skills/' + skill.name + '/SKILL.md',
    declaredDependencies, mentionedTargets,
    undeclaredMentionTargets: mentionedTargets.filter(function (name) { return !declaredDependencies.some(function (dep) { return dep.name === name; }); }),
    mentions, resourceLinks, sourceFiles, parseWarnings
  };
}).sort(function (a, b) { return a.name.localeCompare(b.name); });

const edgeKinds = { required: 0, conditional: 0, optional: 0 };
for (const skill of skills) for (const dep of skill.declaredDependencies) edgeKinds[dep.kind]++;
const result = {
  schemaVersion: 1, auditDate: '2026-10-09', generatedAtUtc: new Date().toISOString(),
  revision: process.argv[2] || null,
  scope: 'All 286 catalog entries; SKILL.md plus textual runtime resources/scripts. evals, dependency trees, binaries and runtime/model execution excluded.',
  limits: [
    'A textual mention is a candidate relationship, not evidence of a mandatory dependency.',
    'Declared required edges are current installer behavior; semantic review can disagree without changing the installer.',
    'Connected components are dependency families, not all-at-once installation bundles.',
    'No external API, provider generation or model task was executed.'
  ],
  sourceManifests: ['skills.json', 'scripts/data/skill-catalog.json', 'scripts/data/install-skill-dependencies.tsv', 'scripts/lib/skill-dependencies.js'].map(function (file) { return { file, sha256: sha256(fs.readFileSync(path.join(root, file))) }; }),
  statistics: {
    skills: skills.length, categories: catalog.categories.length,
    declaredEdges: edgeKinds,
    declaredRequiredSources: skills.filter(function (skill) { return skill.declaredDependencies.some(function (dep) { return dep.kind === 'required'; }); }).length,
    packagesWithCandidateMentions: skills.filter(function (skill) { return skill.mentionedTargets.length; }).length,
    undeclaredMentionPairs: skills.reduce(function (sum, skill) { return sum + skill.undeclaredMentionTargets.length; }, 0),
    textualFilesScanned: skills.reduce(function (sum, skill) { return sum + skill.sourceFiles.length; }, 0),
    crossPackageResourceLinks: skills.reduce(function (sum, skill) { return sum + skill.resourceLinks.length; }, 0),
    brokenCrossPackageResources: skills.reduce(function (sum, skill) { return sum + skill.resourceLinks.filter(function (link) { return !link.isRegularFile; }).length; }, 0)
  },
  currentRequiredFamilies: declaredComponents(skills), routingGroups: taxonomy.routingGroups,
  skills
};
fs.writeFileSync(path.join(__dirname, 'inventory.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result.statistics));
console.log('Required families: ' + JSON.stringify(result.currentRequiredFamilies));
