#!/usr/bin/env node

const fs = require('fs');
const https = require('https');
const path = require('path');

const root = path.resolve(__dirname, '..');
const catalogPath = path.join(root, 'agents.json');
const manifestPath = path.join(__dirname, 'data', 'agent-reference-sources.json');
const shaPattern = /^[0-9a-f]{40}$/;
const repoPattern = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const relativePathPattern = /^[A-Za-z0-9._-]+(?:\/[A-Za-z0-9._-]+)*$/;
const supportedLicenses = new Set(['MIT', 'MIT-0', 'Apache-2.0']);
const githubApiOrigin = 'https://api.github.com';
const maximumRedirects = 5;
const redirectStatuses = new Set([301, 302, 303, 307, 308]);

function usage() {
  console.log(`Usage: node scripts/verify-agent-references.js [--remote]

Validates the pinned Agent reference manifest and catalog metadata.

Options:
  --remote  Verify commits, trees, paths, and license files against GitHub
  --help    Show this help`);
}

function parseArguments(argv) {
  const options = { remote: false };
  for (const argument of argv) {
    if (argument === '--remote') options.remote = true;
    else if (argument === '--help' || argument === '-h') options.help = true;
    else throw new Error(`Unknown argument: ${argument}`);
  }
  return options;
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    throw new Error(`Unable to read ${path.relative(root, filePath)}: ${error.message}`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function isSafeRelativePath(value) {
  return typeof value === 'string'
    && relativePathPattern.test(value)
    && path.posix.normalize(value) === value
    && !value.split('/').some((segment) => segment === '.' || segment === '..');
}

function loadReferenceState() {
  const manifest = readJson(manifestPath);
  const catalog = readJson(catalogPath);
  assert(manifest.version === 1, 'Agent reference manifest version must be 1');
  assert(Array.isArray(manifest.repositories) && manifest.repositories.length > 0,
    'Agent reference manifest must contain repositories');
  assert(Array.isArray(catalog.agents), 'agents.json must contain an agents array');

  const sources = new Map();
  for (const source of manifest.repositories) {
    assert(source && typeof source === 'object', 'Reference repository entries must be objects');
    assert(repoPattern.test(source.repo || ''), `Invalid reference repository: ${source.repo}`);
    assert(!sources.has(source.repo), `Duplicate reference repository: ${source.repo}`);
    assert(shaPattern.test(source.commit || ''), `${source.repo}: commit must be a lowercase 40-character SHA`);
    assert(shaPattern.test(source.tree || ''), `${source.repo}: tree must be a lowercase 40-character SHA`);
    assert(supportedLicenses.has(source.license), `${source.repo}: unsupported license ${source.license}`);
    assert(isSafeRelativePath(source.licensePath), `${source.repo}: invalid licensePath ${source.licensePath}`);
    if (source.pathInventory) {
      assert(isSafeRelativePath(source.pathInventory), `${source.repo}: invalid pathInventory ${source.pathInventory}`);
      assert(fs.existsSync(path.join(root, ...source.pathInventory.split('/'))),
        `${source.repo}: pathInventory does not exist: ${source.pathInventory}`);
    }
    sources.set(source.repo, source);
  }

  const pathsByRepo = new Map();
  const agentIds = new Set();
  for (const agent of catalog.agents) {
    const label = agent.id || '(unknown Agent)';
    assert(!agentIds.has(agent.id), `Duplicate Agent id: ${agent.id}`);
    agentIds.add(agent.id);
    assert(agent.references && typeof agent.references === 'object', `${label}: references are required`);
    const source = sources.get(agent.references.repo);
    assert(source, `${label}: reference repository is not allowlisted: ${agent.references.repo}`);
    assert(agent.references.tree === source.tree,
      `${label}: reference tree does not match scripts/data/agent-reference-sources.json`);
    assert(Array.isArray(agent.references.paths) && agent.references.paths.length > 0,
      `${label}: at least one reference path is required`);
    const repoPaths = pathsByRepo.get(source.repo) || new Set();
    for (const referencePath of agent.references.paths) {
      assert(isSafeRelativePath(referencePath), `${label}: invalid reference path ${referencePath}`);
      assert(!repoPaths.has(referencePath), `${source.repo}: duplicate reference path ${referencePath}`);
      repoPaths.add(referencePath);
    }
    pathsByRepo.set(source.repo, repoPaths);
  }

  for (const source of sources.values()) {
    const repoPaths = pathsByRepo.get(source.repo);
    assert(repoPaths && repoPaths.size > 0, `${source.repo}: manifest repository is not used by any Agent`);
    if (!source.pathInventory) continue;
    const inventory = readJson(path.join(root, ...source.pathInventory.split('/')));
    assert(inventory.sourceRepo === source.repo, `${source.repo}: inventory sourceRepo mismatch`);
    assert(inventory.sourceCommitSha === source.commit, `${source.repo}: inventory sourceCommitSha mismatch`);
    assert(inventory.sourceTreeSha === source.tree, `${source.repo}: inventory sourceTreeSha mismatch`);
    assert(Array.isArray(inventory.definitions), `${source.repo}: inventory definitions must be an array`);
    const inventoryPaths = new Set(inventory.definitions.map((definition) => definition.sourcePath));
    for (const referencePath of repoPaths) {
      assert(inventoryPaths.has(referencePath), `${source.repo}: reference path is missing from inventory: ${referencePath}`);
    }
  }

  return { catalog, manifest, pathsByRepo };
}

function githubJson(apiPath, redirectsRemaining = maximumRedirects, visited = new Set()) {
  let url;
  try {
    url = new URL(apiPath, `${githubApiOrigin}/`);
  } catch {
    return Promise.reject(new Error('GitHub API redirect has an invalid Location'));
  }
  if (url.origin !== githubApiOrigin || url.username || url.password || url.hash) {
    return Promise.reject(new Error('GitHub API redirect must stay on https://api.github.com without credentials or fragments'));
  }
  if (visited.has(url.href)) return Promise.reject(new Error('GitHub API redirect loop detected'));
  visited.add(url.href);

  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'CraftRoster-Agent-Reference-Verifier',
    'X-GitHub-Api-Version': '2022-11-28'
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  return new Promise((resolve, reject) => {
    const request = https.get({ hostname: url.hostname, path: `${url.pathname}${url.search}`, headers }, (response) => {
      response.on('error', reject);
      if (redirectStatuses.has(response.statusCode)) {
        response.resume();
        if (redirectsRemaining === 0) {
          reject(new Error(`GitHub API exceeded ${maximumRedirects} redirects`));
          return;
        }
        const location = response.headers.location;
        if (typeof location !== 'string' || !location.trim()) {
          reject(new Error('GitHub API redirect is missing Location'));
          return;
        }
        let destination;
        try {
          destination = new URL(location, url);
        } catch {
          reject(new Error('GitHub API redirect has an invalid Location'));
          return;
        }
        resolve(githubJson(destination.href, redirectsRemaining - 1, visited));
        return;
      }
      let body = '';
      response.setEncoding('utf8');
      response.on('aborted', () => reject(new Error(`GitHub API response was aborted: ${apiPath}`)));
      response.on('data', (chunk) => { body += chunk; });
      response.on('end', () => {
        if (response.statusCode < 200 || response.statusCode >= 300) {
          const remaining = response.headers['x-ratelimit-remaining'];
          const rateHint = remaining === '0' ? ' GitHub API rate limit exhausted; set GITHUB_TOKEN.' : '';
          reject(new Error(`GitHub API ${apiPath} returned ${response.statusCode}.${rateHint}`));
          return;
        }
        try {
          resolve(JSON.parse(body));
        } catch (error) {
          reject(new Error(`GitHub API ${apiPath} returned invalid JSON: ${error.message}`));
        }
      });
    });
    request.setTimeout(30000, () => request.destroy(new Error(`GitHub API request timed out: ${apiPath}`)));
    request.on('error', reject);
  });
}

function licenseMatches(identifier, text) {
  if (identifier === 'MIT') {
    return /MIT License/i.test(text) && /Permission is hereby granted/i.test(text);
  }
  if (identifier === 'MIT-0') {
    return /MIT No Attribution/i.test(text) && /Permission is hereby granted/i.test(text);
  }
  if (identifier === 'Apache-2.0') {
    return /Apache License/i.test(text) && /Version 2\.0/i.test(text);
  }
  return false;
}

async function verifyRemote(manifest, pathsByRepo) {
  for (const source of manifest.repositories) {
    const encodedRepo = source.repo.split('/').map(encodeURIComponent).join('/');
    const commit = await githubJson(`/repos/${encodedRepo}/git/commits/${source.commit}`);
    assert(commit.sha === source.commit, `${source.repo}: GitHub returned an unexpected commit SHA`);
    assert(commit.tree && commit.tree.sha === source.tree,
      `${source.repo}: pinned commit does not resolve to pinned tree`);

    const tree = await githubJson(`/repos/${encodedRepo}/git/trees/${source.tree}?recursive=1`);
    assert(tree.sha === source.tree, `${source.repo}: GitHub returned an unexpected tree SHA`);
    assert(!tree.truncated, `${source.repo}: GitHub returned a truncated tree`);
    const entries = new Map(tree.tree.map((entry) => [entry.path, entry]));
    for (const referencePath of pathsByRepo.get(source.repo)) {
      const entry = entries.get(referencePath);
      assert(entry && entry.type === 'blob', `${source.repo}: missing reference file ${referencePath}`);
    }

    const licenseEntry = entries.get(source.licensePath);
    assert(licenseEntry && licenseEntry.type === 'blob', `${source.repo}: missing license file ${source.licensePath}`);
    const blob = await githubJson(`/repos/${encodedRepo}/git/blobs/${licenseEntry.sha}`);
    assert(blob.encoding === 'base64' && typeof blob.content === 'string',
      `${source.repo}: license blob is not base64 text`);
    const licenseText = Buffer.from(blob.content.replace(/\s/g, ''), 'base64').toString('utf8');
    assert(licenseMatches(source.license, licenseText),
      `${source.repo}: ${source.licensePath} does not match declared license ${source.license}`);
  }
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  if (options.help) {
    usage();
    return;
  }
  const state = loadReferenceState();
  const pathCount = [...state.pathsByRepo.values()].reduce((total, entries) => total + entries.size, 0);
  console.log(`Agent reference manifest verified: ${state.manifest.repositories.length} repositories, ${state.catalog.agents.length} Agents, ${pathCount} paths`);
  if (options.remote) {
    await verifyRemote(state.manifest, state.pathsByRepo);
    console.log('Remote Agent references verified against GitHub');
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`Agent reference verification failed: ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = { githubJson, verifyRemote };
