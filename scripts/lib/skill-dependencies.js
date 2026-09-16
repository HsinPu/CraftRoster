const fs = require('fs');
const path = require('path');

const namePattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function validateDependencies(entries) {
  const names = new Set(Object.keys(entries));
  for (const [source, entry] of Object.entries(entries)) {
    if (!namePattern.test(source)) throw new Error(`Invalid Skill name: ${source}`);
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) throw new Error(`${source}: dependency entry must be an object`);
    const dependencies = entry.dependencies === undefined ? [] : entry.dependencies;
    if (!Array.isArray(dependencies)) throw new Error(`${source}: dependencies must be an array`);
    const seen = new Set();
    for (const dependency of dependencies) {
      if (!dependency || typeof dependency !== 'object' || Array.isArray(dependency)
        || !namePattern.test(dependency.name || '') || !names.has(dependency.name)) {
        throw new Error(`${source}: unknown or invalid dependency ${JSON.stringify(dependency)}`);
      }
      if (dependency.name === source) throw new Error(`${source}: self dependency is not allowed`);
      if (seen.has(dependency.name)) throw new Error(`${source}: duplicate dependency ${dependency.name}`);
      seen.add(dependency.name);
      if (!['required', 'conditional', 'optional'].includes(dependency.kind)) throw new Error(`${source}: invalid dependency kind`);
      if (Object.keys(dependency).some((key) => !['name', 'kind', 'when'].includes(key))) {
        throw new Error(`${source}: unknown dependency field`);
      }
      if (dependency.kind !== 'conditional' && dependency.when !== undefined) {
        throw new Error(`${source}: ${dependency.kind} dependency must omit when`);
      }
      if (dependency.kind === 'conditional' && (typeof dependency.when !== 'string'
        || !dependency.when.trim() || dependency.when === '-' || /[\t\r\n\0]/.test(dependency.when))) {
        throw new Error(`${source}: conditional dependency needs a single-line when`);
      }
    }
  }
  const complete = new Set();
  const visiting = [];
  function visit(name) {
    if (complete.has(name)) return;
    if (visiting.includes(name)) throw new Error(`Required dependency cycle: ${[...visiting.slice(visiting.indexOf(name)), name].join(' -> ')}`);
    visiting.push(name);
    for (const dependency of entries[name].dependencies || []) {
      if (dependency.kind === 'required') visit(dependency.name);
    }
    visiting.pop();
    complete.add(name);
  }
  [...names].sort().forEach(visit);
}

function siblingLinks(text) {
  // This check covers executable entrypoint prose; fenced examples are not package resources.
  const prose = text.replace(/^([ \t]*)(`{3,}|~{3,})[^\r\n]*\r?\n[\s\S]*?^\1\2[ \t]*$/gm, '');
  const links = [];
  const parsedOpeners = new Set();
  for (const match of prose.matchAll(/\[[^\]\r\n]+\]\(\s*(?:<([^>\r\n]+)>|([^\s)]+))(?:\s+(?:"[^"\r\n]*"|'[^'\r\n]*'|\([^()\r\n]*\)))?\s*\)/g)) {
    const destination = match[1] || match[2];
    if (/^<\.{1,2}[\\/]/.test(destination)) throw new Error('Unsupported relative Markdown link syntax in Skill entrypoint');
    parsedOpeners.add(match.index + match[0].indexOf(']('));
    if (/^\.{1,2}[\\/]/.test(destination)) links.push(destination.split('#')[0]);
  }
  // Do not silently ignore a relative destination using unsupported Markdown syntax.
  for (const match of prose.matchAll(/\]\(\s*<?\.{1,2}[\\/]/g)) {
    if (!parsedOpeners.has(match.index)) throw new Error('Unsupported relative Markdown link syntax in Skill entrypoint');
  }
  // Resolve reference-style destinations at their definitions (also covers collapsed/shortcut links).
  for (const match of prose.matchAll(/^[ \t]{0,3}\[[^\]\r\n]+\]:[ \t]*(?:\r?\n[ \t]*)?(?:<([^>\r\n]+)>|([^\s]+))/gm)) {
    const destination = match[1] || match[2];
    if (/^<\.{1,2}[\\/]/.test(destination)) throw new Error('Unsupported relative Markdown reference destination in Skill entrypoint');
    if (/^\.{1,2}[\\/]/.test(destination)) links.push(destination.split('#')[0]);
  }
  return links;
}

function validateSiblingLinks(root, entries) {
  const skillsRoot = path.resolve(root, 'skills');
  for (const [source, entry] of Object.entries(entries)) {
    const text = fs.readFileSync(path.join(skillsRoot, source, 'SKILL.md'), 'utf8');
    for (const raw of siblingLinks(text)) {
      if (raw.startsWith('./') && !raw.slice(2).includes('../')) continue;
      const match = raw.match(/^\.\.\/([a-z0-9]+(?:-[a-z0-9]+)*)(?:\/(.*))?$/);
      if (!match || !Object.hasOwn(entries, match[1])) throw new Error(`${source}: relative resource escapes Skill packages: ${raw}`);
      const [, target, suffix] = match;
      if (!(entry.dependencies || []).some((dependency) => dependency.name === target)) {
        throw new Error(`${source}: sibling resource needs a declared dependency on ${target}: ${raw}`);
      }
      const resource = suffix || 'SKILL.md';
      if (resource.includes('\\') || path.posix.normalize(resource) !== resource || resource.startsWith('../') || path.posix.isAbsolute(resource)) {
        throw new Error(`${source}: invalid sibling resource path: ${raw}`);
      }
      const targetRoot = fs.realpathSync(path.join(skillsRoot, target));
      const targetRelative = path.relative(fs.realpathSync(skillsRoot), targetRoot);
      if (targetRelative === '..' || targetRelative.startsWith(`..${path.sep}`) || path.isAbsolute(targetRelative)) {
        throw new Error(`${source}: dependency package resolves outside skills/: ${raw}`);
      }
      const resourcePath = path.join(targetRoot, resource);
      if (!fs.existsSync(resourcePath) || !fs.statSync(resourcePath).isFile()) throw new Error(`${source}: sibling resource is not a regular file: ${raw}`);
      const relative = path.relative(targetRoot, fs.realpathSync(resourcePath));
      if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
        throw new Error(`${source}: sibling resource resolves outside dependency package: ${raw}`);
      }
    }
  }
}

module.exports = { validateDependencies, siblingLinks, validateSiblingLinks };
