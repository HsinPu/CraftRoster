#!/usr/bin/env node

const fs = require('node:fs');
const crypto = require('node:crypto');
const https = require('node:https');
const path = require('node:path');
const { parseYamlFrontmatter } = require('./generate-skill-catalog');

const ROOT = path.resolve(__dirname, '..');
const CANONICAL_AUTHOR = 'HsinPu';
const CANONICAL_SOURCE = 'HsinPu/CraftRoster';
const REPOSITORY_PATTERN = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const REVISION_PATTERN = /^[0-9a-f]{40}$/;
const REFERENCE_MANIFEST_PATH = path.join('scripts', 'data', 'skill-reference-sources.json');
const REFERENCE_LOCK_PATH = path.join('scripts', 'data', 'skill-reference-lock.json');
const LICENSE_EVIDENCE_KINDS = new Set(['license-file', 'terms', 'frontmatter']);
const MAX_GITHUB_RESPONSE_BYTES = 16 * 1024 * 1024;

function usage() {
  console.log(`Usage: node scripts/verify-skill-sources.js [--remote | --update-lock]

Validates referenced Skill ownership, source metadata, and pinned source evidence.

Options:
  --remote  Verify pinned commits, trees, reference paths, and license evidence on GitHub
  --update-lock  Rewrite the review-controlled provenance lock after local validation
  --help    Show this help`);
}

function parseArguments(argv) {
  const options = { remote: false, updateLock: false, help: false };
  for (const argument of argv) {
    if (argument === '--remote') options.remote = true;
    else if (argument === '--update-lock') options.updateLock = true;
    else if (argument === '--help' || argument === '-h') options.help = true;
    else throw new Error(`Unknown argument: ${argument}`);
  }
  if (options.remote && options.updateLock) {
    throw new Error('--remote and --update-lock cannot be used together');
  }
  return options;
}

function parseSkillFrontmatter(filePath) {
  return parseYamlFrontmatter(filePath);
}

function readReferenceManifest(repoRoot) {
  const manifestPath = path.join(repoRoot, REFERENCE_MANIFEST_PATH);
  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch (error) {
    throw new Error(`unable to read ${REFERENCE_MANIFEST_PATH}: ${error.message}`);
  }
  if (!manifest || manifest.schema_version !== 1 || !Array.isArray(manifest.repositories)) {
    throw new Error(`${REFERENCE_MANIFEST_PATH} must use schema_version 1 and contain a repositories array`);
  }
  return manifest;
}

function readReferenceLock(repoRoot) {
  const lockPath = path.join(repoRoot, REFERENCE_LOCK_PATH);
  let lock;
  try {
    lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
  } catch (error) {
    throw new Error(`unable to read ${REFERENCE_LOCK_PATH}: ${error.message}`);
  }
  if (
    !lock
    || lock.schema_version !== 1
    || !Number.isInteger(lock.repositoryCount)
    || !Number.isInteger(lock.referencedSkillCount)
    || !Number.isInteger(lock.referencePathCount)
    || !/^[0-9a-f]{64}$/.test(lock.evidenceSha256 || '')
  ) {
    throw new Error(
      `${REFERENCE_LOCK_PATH} must use schema_version 1 with integer counts and a lowercase SHA-256 evidenceSha256`
    );
  }
  return lock;
}

function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function computeReferenceLock(manifest) {
  const repositories = manifest.repositories
    .filter((repo) => repo && typeof repo === 'object' && !Array.isArray(repo))
    .map((repo) => ({
      repo: repo.repo,
      commit: repo.commit,
      tree: repo.tree,
      license: repo.license,
      licenseEvidence: repo.licenseEvidence && typeof repo.licenseEvidence === 'object'
        ? {
          kind: repo.licenseEvidence.kind,
          path: repo.licenseEvidence.path,
          blob: repo.licenseEvidence.blob,
        }
        : null,
      skills: repo.skills && typeof repo.skills === 'object' && !Array.isArray(repo.skills)
        ? Object.entries(repo.skills)
          .sort(([left], [right]) => compareText(left, right))
          .map(([name, evidenceList]) => ({
            name,
            evidence: Array.isArray(evidenceList)
              ? evidenceList
                .filter((evidence) => evidence && typeof evidence === 'object' && !Array.isArray(evidence))
                .map((evidence) => ({ path: evidence.path, blob: evidence.blob }))
                .sort((left, right) => compareText(left.path, right.path) || compareText(left.blob, right.blob))
              : [],
          }))
        : [],
    }))
    .sort((left, right) => compareText(left.repo, right.repo));
  return {
    schema_version: 1,
    repositoryCount: repositories.length,
    referencedSkillCount: repositories.reduce((total, repo) => total + repo.skills.length, 0),
    referencePathCount: repositories.reduce(
      (total, repo) => total + repo.skills.reduce((repoTotal, skill) => repoTotal + skill.evidence.length, 0),
      0
    ),
    evidenceSha256: crypto.createHash('sha256').update(JSON.stringify(repositories)).digest('hex'),
  };
}

function isSafeRepositoryPath(value) {
  return typeof value === 'string'
    && value.length > 0
    && !value.includes('\\')
    && !value.startsWith('/')
    && !value.split('/').includes('..');
}

function repositoryKey(value) {
  return typeof value === 'string' ? value.toLowerCase() : value;
}

function normalizeEvidenceText(value) {
  return value.normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim();
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function licenseEvidenceMatches(license, kind, text) {
  if (typeof license !== 'string' || typeof text !== 'string' || text.length === 0) return false;
  if (kind === 'frontmatter') {
    const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
    if (!match) return false;
    return new RegExp(
      `^license:\\s*["']?${escapeRegExp(license)}["']?\\s*(?:#.*)?$`,
      'mi'
    ).test(match[1]);
  }

  const normalized = normalizeEvidenceText(text);
  if (kind === 'terms') {
    return license === 'No repository-wide OSS license; governed by Figma Developer Terms'
      && normalized.includes('figma developer terms')
      && normalized.includes('figma.com/legal/developer-terms');
  }
  if (kind !== 'license-file') return false;

  if (license === 'MIT') {
    return normalized.includes('permission is hereby granted, free of charge, to any person obtaining a copy')
      && normalized.includes('the software is provided "as is"');
  }
  if (license === 'Apache-2.0') {
    return normalized.includes('apache license')
      && normalized.includes('version 2.0, january 2004')
      && normalized.includes('terms and conditions for use, reproduction, and distribution')
      && normalized.includes('grant of copyright license.')
      && normalized.includes('grant of patent license.');
  }
  if (license === 'AGPL-3.0') {
    return normalized.includes('gnu affero general public license')
      && normalized.includes('version 3, 19 november 2007');
  }
  if (license === 'W3C Software and Document License') {
    return normalized.includes('w3c software and document license')
      && normalized.includes('w3.org/consortium/legal/2015/copyright-software-and-document');
  }
  return false;
}

function validateBlobEvidence(evidence, label, errors) {
  if (!evidence || typeof evidence !== 'object' || Array.isArray(evidence)) {
    errors.push(`${label} must be an object`);
    return;
  }
  if (!isSafeRepositoryPath(evidence.path)) errors.push(`${label}.path must be a safe repository-relative path`);
  if (!REVISION_PATTERN.test(evidence.blob || '')) errors.push(`${label}.blob must be a lowercase 40-character Git blob SHA`);
}

function indexReferenceManifest(manifest, errors) {
  const byRepo = new Map();
  for (const [index, entry] of manifest.repositories.entries()) {
    const label = `reference manifest repositories[${index}]`;
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      errors.push(`${label} must be an object`);
      continue;
    }
    const validRepo = REPOSITORY_PATTERN.test(entry.repo || '');
    const repoKey = repositoryKey(entry.repo);
    if (!validRepo) errors.push(`${label}.repo must use GitHub owner/repository form`);
    if (validRepo && byRepo.has(repoKey)) {
      errors.push(`${entry.repo}: duplicate reference manifest repository (GitHub repository names are case-insensitive)`);
    } else if (validRepo) {
      byRepo.set(repoKey, entry);
    }
    if (!REVISION_PATTERN.test(entry.commit || '')) errors.push(`${entry.repo || label}: commit must be a full lowercase SHA`);
    if (!REVISION_PATTERN.test(entry.tree || '')) errors.push(`${entry.repo || label}: tree must be a full lowercase SHA`);
    if (typeof entry.license !== 'string' || entry.license.length === 0) errors.push(`${entry.repo || label}: license is required`);
    validateBlobEvidence(entry.licenseEvidence, `${entry.repo || label}.licenseEvidence`, errors);
    if (entry.licenseEvidence && !LICENSE_EVIDENCE_KINDS.has(entry.licenseEvidence.kind)) {
      errors.push(`${entry.repo || label}.licenseEvidence.kind is unsupported`);
    }
    if (!entry.skills || typeof entry.skills !== 'object' || Array.isArray(entry.skills)) {
      errors.push(`${entry.repo || label}: skills must be an object`);
      continue;
    }
    for (const [skillName, evidenceList] of Object.entries(entry.skills)) {
      if (!Array.isArray(evidenceList) || evidenceList.length === 0) {
        errors.push(`${entry.repo}/${skillName}: reference path evidence must be a non-empty array`);
        continue;
      }
      const seenPaths = new Set();
      for (const [evidenceIndex, evidence] of evidenceList.entries()) {
        validateBlobEvidence(evidence, `${entry.repo}/${skillName}[${evidenceIndex}]`, errors);
        if (evidence && seenPaths.has(evidence.path)) errors.push(`${entry.repo}/${skillName}: duplicate path ${evidence.path}`);
        if (evidence) seenPaths.add(evidence.path);
      }
    }
  }
  return byRepo;
}

function readCatalog(repoRoot) {
  const catalogPath = path.join(repoRoot, 'skills.json');
  let catalog;
  try {
    catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
  } catch (error) {
    throw new Error(`unable to read skills.json: ${error.message}`);
  }
  if (!catalog || !Array.isArray(catalog.skills)) {
    throw new Error('skills.json must contain a skills array');
  }
  return catalog;
}

function validateRepository(repoRoot = ROOT, options = {}) {
  const errors = [];
  const catalog = readCatalog(repoRoot);
  const referenceManifest = readReferenceManifest(repoRoot);
  const referenceLock = options.skipReferenceLock ? null : readReferenceLock(repoRoot);
  const manifestByRepo = indexReferenceManifest(referenceManifest, errors);
  if (referenceLock) {
    const computedLock = computeReferenceLock(referenceManifest);
    for (const field of ['repositoryCount', 'referencedSkillCount', 'referencePathCount', 'evidenceSha256']) {
      if (referenceLock[field] !== computedLock[field]) {
        errors.push(
          `${REFERENCE_LOCK_PATH} ${field} does not match ${REFERENCE_MANIFEST_PATH}; provenance changes require an explicit lock update and owner review`
        );
      }
    }
  }
  const skillsRoot = path.join(repoRoot, 'skills');
  const metadataByName = new Map();

  if (!fs.existsSync(skillsRoot)) {
    throw new Error('skills/ directory is missing');
  }

  const skillDirectories = fs.readdirSync(skillsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  for (const name of skillDirectories) {
    const skillPath = path.join(skillsRoot, name, 'SKILL.md');
    if (!fs.existsSync(skillPath)) continue;
    try {
      const frontmatter = parseSkillFrontmatter(skillPath);
      if (frontmatter.name !== name) {
        errors.push(`${name}: SKILL.md name does not match its directory`);
      }
      if (!frontmatter.metadata || typeof frontmatter.metadata !== 'object' || Array.isArray(frontmatter.metadata)) {
        errors.push(`${name}: SKILL.md metadata must be a mapping`);
      } else {
        metadataByName.set(name, frontmatter.metadata);
      }
    } catch (error) {
      errors.push(`${name}: ${error.message}`);
    }
  }

  const catalogByName = new Map();
  const revisionsBySource = new Map();
  const referencedSkills = [];

  for (const skill of catalog.skills) {
    if (!skill || typeof skill !== 'object' || Array.isArray(skill) || typeof skill.name !== 'string') {
      errors.push('skills.json contains an invalid Skill entry');
      continue;
    }
    if (catalogByName.has(skill.name)) {
      errors.push(`${skill.name}: duplicate skills.json entry`);
      continue;
    }
    catalogByName.set(skill.name, skill);

    const metadata = metadataByName.get(skill.name);
    const metadataReferenceKeys = metadata
      ? ['reference-source', 'reference-license', 'reference-revision']
        .filter((key) => Object.prototype.hasOwnProperty.call(metadata, key))
      : [];

    if (!skill.reference) {
      if (metadataReferenceKeys.length > 0) {
        errors.push(`${skill.name}: SKILL.md declares reference metadata but skills.json has no reference entry`);
      }
      continue;
    }

    referencedSkills.push(skill.name);
    if (!metadata) {
      errors.push(`${skill.name}: referenced Skill is missing readable SKILL.md metadata`);
      continue;
    }
    if (skill.author !== CANONICAL_AUTHOR || metadata.author !== CANONICAL_AUTHOR) {
      errors.push(`${skill.name}: author must remain ${CANONICAL_AUTHOR}`);
    }
    if (skill.source !== CANONICAL_SOURCE || metadata.source !== CANONICAL_SOURCE) {
      errors.push(`${skill.name}: source must remain ${CANONICAL_SOURCE}`);
    }

    const reference = skill.reference;
    if (!reference || typeof reference !== 'object' || Array.isArray(reference)) {
      errors.push(`${skill.name}: reference must be an object`);
      continue;
    }
    if (!REPOSITORY_PATTERN.test(reference.source || '')) {
      errors.push(`${skill.name}: reference.source must use GitHub owner/repository form`);
    }
    if (typeof reference.license !== 'string' || reference.license.length === 0) {
      errors.push(`${skill.name}: reference.license is required`);
    }
    if (!REVISION_PATTERN.test(reference.revision || '')) {
      errors.push(`${skill.name}: reference.revision must be a lowercase 40-character Git commit SHA`);
    }

    for (const [catalogKey, metadataKey] of [
      ['source', 'reference-source'],
      ['license', 'reference-license'],
      ['revision', 'reference-revision'],
    ]) {
      if (metadata[metadataKey] !== reference[catalogKey]) {
        errors.push(
          `${skill.name}: metadata.${metadataKey} does not match skills.json reference.${catalogKey}`
        );
      }
    }

    const sourceKey = repositoryKey(reference.source);
    if (REPOSITORY_PATTERN.test(reference.source || '') && REVISION_PATTERN.test(reference.revision || '')) {
      const existingSource = revisionsBySource.get(sourceKey);
      if (existingSource && existingSource.repo !== reference.source) {
        errors.push(
          `${reference.source}: referenced Skills use inconsistent repository casing; expected ${existingSource.repo}`
        );
      }
      if (existingSource && existingSource.revision !== reference.revision) {
        errors.push(
          `${reference.source}: referenced Skills use inconsistent revisions (${existingSource.revision}, ${reference.revision})`
        );
      } else if (!existingSource) {
        revisionsBySource.set(sourceKey, { repo: reference.source, revision: reference.revision });
      }
    }

    const manifestEntry = manifestByRepo.get(sourceKey);
    if (!manifestEntry) {
      errors.push(`${skill.name}: reference source ${reference.source} is missing from ${REFERENCE_MANIFEST_PATH}`);
    } else {
      if (manifestEntry.repo !== reference.source) {
        errors.push(
          `${skill.name}: reference source casing must exactly match source manifest repository ${manifestEntry.repo}`
        );
      }
      if (manifestEntry.commit !== reference.revision) {
        errors.push(`${skill.name}: reference revision does not match source manifest commit`);
      }
      if (manifestEntry.license !== reference.license) {
        errors.push(`${skill.name}: reference license does not match source manifest license`);
      }
      if (!manifestEntry.skills || !Array.isArray(manifestEntry.skills[skill.name]) || manifestEntry.skills[skill.name].length === 0) {
        errors.push(`${skill.name}: source manifest must name at least one reference path`);
      }
    }
  }

  for (const [name, metadata] of metadataByName) {
    if (catalogByName.has(name)) continue;
    if (['reference-source', 'reference-license', 'reference-revision'].some(
      (key) => Object.prototype.hasOwnProperty.call(metadata, key)
    )) {
      errors.push(`${name}: referenced SKILL.md is missing from skills.json`);
    }
  }

  for (const [repoKey, manifestEntry] of manifestByRepo) {
    const repo = manifestEntry.repo;
    const expectedSkills = catalog.skills
      .filter((skill) => skill && skill.reference && repositoryKey(skill.reference.source) === repoKey)
      .map((skill) => skill.name)
      .sort();
    const manifestSkills = manifestEntry.skills && typeof manifestEntry.skills === 'object'
      ? Object.keys(manifestEntry.skills).sort()
      : [];
    if (expectedSkills.length === 0) {
      errors.push(`${repo}: source manifest repository is not referenced by any Skill`);
      continue;
    }
    for (const name of expectedSkills) {
      if (!manifestSkills.includes(name)) errors.push(`${repo}: source manifest is missing referenced Skill ${name}`);
    }
    for (const name of manifestSkills) {
      if (!expectedSkills.includes(name)) errors.push(`${repo}: source manifest contains unreferenced Skill ${name}`);
    }
  }

  if (errors.length > 0) {
    throw new Error(`Skill source revision validation failed:\n- ${errors.join('\n- ')}`);
  }

  const sources = [...revisionsBySource.values()]
    .map(({ repo, revision }) => {
      const manifestEntry = manifestByRepo.get(repositoryKey(repo));
      const skills = catalog.skills
        .filter((skill) => skill && skill.reference && skill.reference.source === repo)
        .map((skill) => skill.name)
        .sort();
      const pathEvidence = manifestEntry
        ? [manifestEntry.licenseEvidence, ...skills.flatMap((name) => manifestEntry.skills[name] || [])]
        : [];
      return {
        repo,
        revision,
        tree: manifestEntry && manifestEntry.tree,
        license: manifestEntry && manifestEntry.license,
        licenseEvidence: manifestEntry && manifestEntry.licenseEvidence,
        pathEvidence,
        skills,
      };
    })
    .sort((left, right) => (left.repo < right.repo ? -1 : left.repo > right.repo ? 1 : 0));

  return {
    referencedSkillCount: referencedSkills.length,
    sourceCount: sources.length,
    referencePathCount: sources.reduce(
      (total, source) => total + new Set(source.pathEvidence.map((entry) => entry.path)).size,
      0
    ),
    sources,
  };
}

function githubJsonRequest(apiPath) {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'CraftRoster-Skill-Source-Verifier',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  return new Promise((resolve, reject) => {
    let settled = false;
    const succeed = (value) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    const fail = (error) => {
      if (settled) return;
      settled = true;
      reject(error);
    };
    const request = https.get({ hostname: 'api.github.com', path: apiPath, headers }, (response) => {
      let body = '';
      let bodyBytes = 0;
      response.setEncoding('utf8');
      response.on('data', (chunk) => {
        if (settled) return;
        bodyBytes += Buffer.byteLength(chunk, 'utf8');
        if (bodyBytes > MAX_GITHUB_RESPONSE_BYTES) {
          const error = new Error(
            `GitHub API ${apiPath} response exceeded ${MAX_GITHUB_RESPONSE_BYTES} bytes`
          );
          error.retryable = false;
          fail(error);
          response.destroy();
          return;
        }
        body += chunk;
      });
      response.on('aborted', () => {
        const error = new Error(`GitHub API ${apiPath} response was aborted`);
        error.retryable = true;
        fail(error);
      });
      response.on('error', (error) => {
        error.retryable = true;
        fail(error);
      });
      response.on('end', () => {
        if (settled) return;
        if (response.statusCode < 200 || response.statusCode >= 300) {
          const remaining = response.headers['x-ratelimit-remaining'];
          const rateHint = remaining === '0' ? ' GitHub API rate limit exhausted; set GITHUB_TOKEN.' : '';
          const error = new Error(`GitHub API ${apiPath} returned ${response.statusCode}.${rateHint}`);
          error.statusCode = response.statusCode;
          error.retryable = response.statusCode === 429
            || response.statusCode >= 500
            || (response.statusCode === 403 && remaining !== '0');
          const retryAfterSeconds = Number(response.headers['retry-after']);
          if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds >= 0) {
            error.retryAfterMs = retryAfterSeconds * 1000;
          }
          fail(error);
          return;
        }
        try {
          succeed(JSON.parse(body));
        } catch (error) {
          fail(new Error(`GitHub API ${apiPath} returned invalid JSON: ${error.message}`));
        }
      });
    });
    request.setTimeout(30000, () => {
      const error = new Error(`GitHub API request timed out: ${apiPath}`);
      error.retryable = true;
      request.destroy(error);
    });
    request.on('error', fail);
  });
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function githubJson(apiPath, { attempts = 3, baseDelayMs = 500 } = {}) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await githubJsonRequest(apiPath);
    } catch (error) {
      lastError = error;
      const retryableNetworkCode = ['ECONNRESET', 'ECONNREFUSED', 'EAI_AGAIN', 'ETIMEDOUT'].includes(error.code);
      if (attempt === attempts || (!error.retryable && !retryableNetworkCode)) throw error;
      const waitMs = error.retryAfterMs || baseDelayMs * (2 ** (attempt - 1));
      await delay(waitMs);
    }
  }
  throw lastError;
}

async function queryRemoteSource(repo, revision, source) {
  const encodedRepo = repo.split('/').map(encodeURIComponent).join('/');
  const commit = await githubJson(`/repos/${encodedRepo}/git/commits/${revision}`);
  if (!commit || !REVISION_PATTERN.test(commit.sha || '') || !commit.tree || !REVISION_PATTERN.test(commit.tree.sha || '')) {
    throw new Error('GitHub commit response is missing a full commit or tree SHA');
  }
  const tree = await githubJson(`/repos/${encodedRepo}/git/trees/${commit.tree.sha}?recursive=1`);
  if (!tree || tree.truncated || !Array.isArray(tree.tree)) {
    throw new Error('GitHub tree response is missing entries or was truncated');
  }
  const blobs = Object.fromEntries(
    tree.tree
      .filter((entry) => entry && entry.type === 'blob' && typeof entry.path === 'string')
      .map((entry) => [entry.path, entry.sha])
  );
  let licenseText;
  if (source && source.licenseEvidence && isSafeRepositoryPath(source.licenseEvidence.path)) {
    const licenseBlobSha = blobs[source.licenseEvidence.path];
    if (!REVISION_PATTERN.test(licenseBlobSha || '')) {
      throw new Error(`GitHub tree is missing license evidence ${source.licenseEvidence.path}`);
    }
    const blob = await githubJson(`/repos/${encodedRepo}/git/blobs/${licenseBlobSha}`);
    if (!blob || blob.encoding !== 'base64' || typeof blob.content !== 'string') {
      throw new Error(`GitHub license evidence blob is not base64 text: ${source.licenseEvidence.path}`);
    }
    licenseText = Buffer.from(blob.content.replace(/\s/g, ''), 'base64').toString('utf8');
  }
  return {
    commit: commit.sha,
    tree: commit.tree.sha,
    blobs,
    licenseText,
  };
}

async function queryRemoteCommit(repo, revision) {
  return (await queryRemoteSource(repo, revision)).commit;
}

async function verifyRemote(state, resolveSource = queryRemoteSource) {
  let pathCount = 0;
  let licenseCount = 0;
  for (const source of state.sources) {
    let remote;
    try {
      remote = await resolveSource(source.repo, source.revision, source);
    } catch (error) {
      throw new Error(`${source.repo}: unable to resolve pinned source tree: ${error.message}`);
    }
    if (!remote || !REVISION_PATTERN.test(remote.commit || '')) {
      throw new Error(`${source.repo}: resolved commit is not a lowercase 40-character Git commit SHA`);
    }
    if (remote.commit !== source.revision) {
      throw new Error(
        `${source.repo}: GitHub resolved pinned revision ${source.revision} as ${remote.commit}`
      );
    }
    if (remote.tree !== source.tree) {
      throw new Error(`${source.repo}: pinned commit tree ${remote.tree || '<missing>'} does not match manifest ${source.tree}`);
    }
    if (!remote.blobs || typeof remote.blobs !== 'object') {
      throw new Error(`${source.repo}: remote tree did not provide blob paths`);
    }

    const expectedByPath = new Map();
    for (const evidence of source.pathEvidence) {
      const existing = expectedByPath.get(evidence.path);
      if (existing && existing !== evidence.blob) {
        throw new Error(`${source.repo}: manifest assigns conflicting blobs to ${evidence.path}`);
      }
      expectedByPath.set(evidence.path, evidence.blob);
    }
    for (const [referencePath, expectedBlob] of expectedByPath) {
      if (remote.blobs[referencePath] !== expectedBlob) {
        throw new Error(
          `${source.repo}: ${referencePath} blob ${remote.blobs[referencePath] || '<missing>'} does not match manifest ${expectedBlob}`
        );
      }
      pathCount += 1;
    }
    if (!licenseEvidenceMatches(
      source.license,
      source.licenseEvidence && source.licenseEvidence.kind,
      remote.licenseText
    )) {
      throw new Error(
        `${source.repo}: pinned ${source.licenseEvidence && source.licenseEvidence.path} content does not match declared license ${source.license}`
      );
    }
    licenseCount += 1;
  }
  return { sourceCount: state.sources.length, pathCount, licenseCount };
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  if (options.help) {
    usage();
    return;
  }

  if (options.updateLock) {
    validateRepository(ROOT, { skipReferenceLock: true });
    const lock = computeReferenceLock(readReferenceManifest(ROOT));
    fs.writeFileSync(
      path.join(ROOT, REFERENCE_LOCK_PATH),
      `${JSON.stringify(lock, null, 2)}\n`,
      'utf8'
    );
    console.log(
      `Updated Skill provenance lock: ${lock.referencedSkillCount} Skills, `
      + `${lock.repositoryCount} repositories, ${lock.referencePathCount} mapped paths`
    );
  }

  const state = validateRepository(ROOT);
  console.log(
    `Skill source manifest verified: ${state.referencedSkillCount} Skills, ${state.sourceCount} repositories, ${state.referencePathCount} paths`
  );
  if (options.remote) {
    const remote = await verifyRemote(state);
    console.log(
      `Remote pinned Skill source trees verified: ${remote.sourceCount} repositories, `
      + `${remote.pathCount} paths, ${remote.licenseCount} license evidence files`
    );
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

module.exports = {
  CANONICAL_AUTHOR,
  CANONICAL_SOURCE,
  REVISION_PATTERN,
  computeReferenceLock,
  githubJson,
  licenseEvidenceMatches,
  parseArguments,
  parseSkillFrontmatter,
  queryRemoteCommit,
  queryRemoteSource,
  readReferenceManifest,
  validateRepository,
  verifyRemote,
};
