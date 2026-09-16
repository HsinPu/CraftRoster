// Read-only repository inventory; writes only the adjacent audit JSON artifact.
// Run: node docs/audits/skill-optimization-2026-09-16/collect-inventory.cjs
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../../..');
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'skills.json'), 'utf8'));
const { parseSkillFrontmatter } = require(path.join(root, 'scripts/generate-skill-catalog.js'));
const posix = value => value.split(path.sep).join('/');
const relative = value => posix(path.relative(root, value));
function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))
    .flatMap(e => e.isDirectory() ? walk(path.join(dir, e.name)) : e.isFile() ? [path.join(dir, e.name)] : []);
}
function stats(values) {
  const s = [...values].sort((a, b) => a - b);
  return { total: s.reduce((a, b) => a + b, 0), min: s[0], median: (s[Math.floor((s.length - 1) / 2)] + s[Math.ceil((s.length - 1) / 2)]) / 2,
    p90: s[Math.ceil(s.length * 0.9) - 1], max: s.at(-1) };
}
const signals = {
  uppercaseAbsoluteLanguage: /\b(MUST|NEVER|ALWAYS|MANDATORY|STOP|REQUIRED)\b/,
  approvalLanguage: /\b(approv(?:al|e|ed)|permission|confirmation|confirm|ask the user)\b/i,
  knownToolNames: /\b(WebFetch|TodoWrite|AskUserQuestion|use_figma|mcp__|functions\.exec|spawn_agent|subagent_type)\b/i,
};
const paragraphs = new Map();
const rows = catalog.skills.map(skill => {
  const dir = path.join(root, 'skills', skill.name);
  const file = path.join(dir, 'SKILL.md');
  const source = fs.readFileSync(file, 'utf8');
  const fm = parseSkillFrontmatter(file);
  const body = source.replace(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/, '');
  const files = walk(dir);
  const md = files.filter(f => f.endsWith('.md'));
  const matches = {};
  for (const [key, regex] of Object.entries(signals)) {
    matches[key] = [];
    for (const f of md) fs.readFileSync(f, 'utf8').split(/\r?\n/).forEach((line, i) => {
      if (regex.test(line)) matches[key].push({ file: relative(f), line: i + 1, text: line.trim() });
    });
  }
  for (const p of body.replace(/```[\s\S]*?```/g, '').split(/\r?\n\s*\r?\n/)) {
    const normalized = p.replace(/\s+/g, ' ').trim();
    if (normalized.length < 120) continue;
    if (!paragraphs.has(normalized)) paragraphs.set(normalized, new Set());
    paragraphs.get(normalized).add(skill.name);
  }
  const linkTargets = [...source.matchAll(/\]\((\.\.\/[^)#]+)(?:#[^)]*)?\)/g)].map(m => m[1]);
  const crossLinks = linkTargets.map(target => ({ target, exists: fs.existsSync(path.resolve(dir, target)) }));
  const evalPath = path.join(dir, 'evals/evals.json');
  const routingPath = path.join(dir, 'evals/routing.json');
  const evals = fs.existsSync(evalPath) ? JSON.parse(fs.readFileSync(evalPath, 'utf8')).evals : [];
  const routing = fs.existsSync(routingPath) ? JSON.parse(fs.readFileSync(routingPath, 'utf8')).cases : [];
  return {
    name: skill.name, category: skill.category, description: fm.description, descriptionChars: fm.description.length,
    sourceSha256: crypto.createHash('sha256').update(source).digest('hex'),
    entryLines: source.split(/\r?\n/).length, entryChars: source.length, bodyChars: body.length,
    packageFiles: files.length, markdownFiles: md.length,
    referenceFiles: files.filter(f => /^references?\//.test(posix(path.relative(dir, f)))).length,
    scriptFiles: files.filter(f => posix(path.relative(dir, f)).startsWith('scripts/')).length,
    assetFiles: files.filter(f => posix(path.relative(dir, f)).startsWith('assets/')).length,
    hasOpenaiYaml: fs.existsSync(path.join(dir, 'agents/openai.yaml')),
    evalCases: evals.length, assertions: evals.reduce((n, e) => n + (e.assertions || []).length, 0),
    routingCases: routing.length, fixtureCases: evals.filter(e => Array.isArray(e.files) && e.files.length > 0).length,
    crossLinks, signals: matches,
  };
});
const summary = {
  skills: rows.length, categories: catalog.categories.length,
  descriptionChars: stats(rows.map(r => r.descriptionChars)), bodyChars: stats(rows.map(r => r.bodyChars)), entryLines: stats(rows.map(r => r.entryLines)),
  descriptionsOver300: rows.filter(r => r.descriptionChars > 300).length,
  descriptionsOver500: rows.filter(r => r.descriptionChars > 500).length,
  entriesOver200Lines: rows.filter(r => r.entryLines > 200).length,
  entriesOver400Lines: rows.filter(r => r.entryLines > 400).length,
  markdownFiles: rows.reduce((n, r) => n + r.markdownFiles, 0),
  withReferences: rows.filter(r => r.referenceFiles).length, withScripts: rows.filter(r => r.scriptFiles).length,
  scriptFiles: rows.reduce((n, r) => n + r.scriptFiles, 0), withAssets: rows.filter(r => r.assetFiles).length,
  withOpenaiYaml: rows.filter(r => r.hasOpenaiYaml).length,
  withEvals: rows.filter(r => r.evalCases).length, evalCases: rows.reduce((n, r) => n + r.evalCases, 0), assertions: rows.reduce((n, r) => n + r.assertions, 0),
  oneCaseSkills: rows.filter(r => r.evalCases === 1).length, fixtureCases: rows.reduce((n, r) => n + r.fixtureCases, 0),
  withRoutingEvals: rows.filter(r => r.routingCases).length, routingCases: rows.reduce((n, r) => n + r.routingCases, 0),
  explicitParentRelativeLinkSources: rows.filter(r => r.crossLinks.length).length,
  explicitParentRelativeLinks: rows.reduce((n, r) => n + r.crossLinks.length, 0),
  explicitSiblingSkillLinks: rows.reduce((n, r) => n + r.crossLinks.filter(l => /^\.\.\/[^.][^/]*\//.test(l.target)).length, 0),
  missingExplicitParentRelativeLinks: rows.flatMap(r => r.crossLinks.filter(l => !l.exists).map(l => ({ name: r.name, ...l }))),
  signalSkillCounts: Object.fromEntries(Object.keys(signals).map(k => [k, rows.filter(r => r.signals[k].length).length])),
  categoryCoverage: catalog.categories.map(c => {
    const subset = rows.filter(r => r.category === c.id);
    return { category: c.id, skills: subset.length, withEvals: subset.filter(r => r.evalCases).length,
      evalCases: subset.reduce((n, r) => n + r.evalCases, 0), routingCases: subset.reduce((n, r) => n + r.routingCases, 0),
      descriptionChars: subset.reduce((n, r) => n + r.descriptionChars, 0) };
  }),
  routingGroups: (catalog.routingGroups || []).map(g => ({ id: g.id, skills: g.skills.map(s => s.name) })),
  longestDescriptions: [...rows].sort((a, b) => b.descriptionChars - a.descriptionChars).slice(0, 15).map(r => ({ name: r.name, chars: r.descriptionChars })),
  longestEntries: [...rows].sort((a, b) => b.entryLines - a.entryLines).slice(0, 15).map(r => ({ name: r.name, lines: r.entryLines, bodyChars: r.bodyChars, references: r.referenceFiles })),
};
const duplicateParagraphs = [...paragraphs].filter(([, names]) => names.size >= 3)
  .map(([text, names]) => ({ text, skills: [...names].sort() })).sort((a, b) => b.skills.length - a.skills.length);
const report = {
  schemaVersion: 1, auditDate: '2026-09-16', scope: 'CraftRoster tracked catalog Skills; not globally installed copies',
  methodology: 'UTF-16 string lengths, not token counts. Lines include final empty line. Signals search all package Markdown including examples; they are review candidates, not defects. Cross-links cover explicit ../ Markdown links in SKILL.md only; prose dependencies require manual review. Evals count definitions, not executed behavior. Duplicate paragraphs are exact normalized prose blocks >=120 characters occurring in >=3 entrypoints, excluding fenced code.',
  catalogSha256: crypto.createHash('sha256').update(fs.readFileSync(path.join(root, 'skills.json'))).digest('hex'),
  summary, duplicateParagraphs, skills: rows,
};
fs.writeFileSync(path.join(__dirname, 'inventory.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ summary, duplicateParagraphs: duplicateParagraphs.slice(0, 6) }, null, 2));
