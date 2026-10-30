#!/usr/bin/env node

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const {
  CANONICAL_AUTHOR,
  CANONICAL_SOURCE,
  computeReferenceLock,
  licenseEvidenceMatches,
  parseArguments,
  validateRepository,
  verifyRemote,
} = require('../scripts/verify-skill-sources');

const ROOT = path.resolve(__dirname, '..');
const SHA_A = '1111111111111111111111111111111111111111';
const SHA_B = '2222222222222222222222222222222222222222';
const TREE_A = '3333333333333333333333333333333333333333';
const BLOB_A = '4444444444444444444444444444444444444444';
const BLOB_B = '5555555555555555555555555555555555555555';
const TEMP_ROOT = fs.mkdtempSync(path.join(os.tmpdir(), 'craftroster-skill-source-tests-'));
let passed = 0;

async function test(name, run) {
  await run();
  passed += 1;
  console.log(`PASS ${name}`);
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function skillDocument(name, reference) {
  return `---
name: ${name}
description: Fixture Skill for source revision tests.
license: Apache-2.0
metadata:
  author: "${CANONICAL_AUTHOR}"
  source: "${CANONICAL_SOURCE}"
  reference-source: "${reference.source}"
  reference-license: "${reference.license}"
  reference-revision: "${reference.revision}"
---

# ${name}
`;
}

function createFixture(name) {
  const repoRoot = path.join(TEMP_ROOT, name);
  const reference = { source: 'example/reference', revision: SHA_A, license: 'MIT' };
  const catalog = {
    version: '1.0.0',
    total: 2,
    skills: ['alpha-skill', 'beta-skill'].map((skillName) => ({
      name: skillName,
      description: 'Fixture',
      category: 'testing',
      author: CANONICAL_AUTHOR,
      source: CANONICAL_SOURCE,
      license: 'Apache-2.0',
      tags: ['fixture'],
      reference: { ...reference },
    })),
    categories: [{ id: 'testing', name: 'Testing', description: 'Fixture' }],
  };
  writeJson(path.join(repoRoot, 'skills.json'), catalog);
  const manifest = {
    schema_version: 1,
    repositories: [{
      repo: reference.source,
      commit: reference.revision,
      tree: TREE_A,
      license: reference.license,
      licenseEvidence: { kind: 'license-file', path: 'LICENSE', blob: BLOB_A },
      skills: {
        'alpha-skill': [{ path: 'skills/alpha-skill/SKILL.md', blob: BLOB_A }],
        'beta-skill': [{ path: 'skills/beta-skill/SKILL.md', blob: BLOB_B }],
      },
    }],
  };
  writeJson(path.join(repoRoot, 'scripts', 'data', 'skill-reference-sources.json'), manifest);
  writeJson(path.join(repoRoot, 'scripts', 'data', 'skill-reference-lock.json'), computeReferenceLock(manifest));
  for (const skill of catalog.skills) {
    const filePath = path.join(repoRoot, 'skills', skill.name, 'SKILL.md');
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, skillDocument(skill.name, skill.reference), 'utf8');
  }
  return repoRoot;
}

function readCatalog(repoRoot) {
  return JSON.parse(fs.readFileSync(path.join(repoRoot, 'skills.json'), 'utf8'));
}

function readManifest(repoRoot) {
  return JSON.parse(fs.readFileSync(
    path.join(repoRoot, 'scripts', 'data', 'skill-reference-sources.json'),
    'utf8'
  ));
}

function remoteSnapshot(source, overrides = {}) {
  return {
    commit: source.revision,
    tree: source.tree,
    blobs: Object.fromEntries(source.pathEvidence.map((entry) => [entry.path, entry.blob])),
    licenseText: 'Permission is hereby granted, free of charge, to any person obtaining a copy. THE SOFTWARE IS PROVIDED "AS IS".',
    ...overrides,
  };
}

function mutateSkill(repoRoot, name, pattern, replacement) {
  const filePath = path.join(repoRoot, 'skills', name, 'SKILL.md');
  const before = fs.readFileSync(filePath, 'utf8');
  const after = before.replace(pattern, replacement);
  assert.notEqual(after, before, `${name} fixture mutation did not apply`);
  fs.writeFileSync(filePath, after, 'utf8');
}

function safeCleanup() {
  const resolvedTemp = path.resolve(os.tmpdir());
  const resolvedTarget = path.resolve(TEMP_ROOT);
  const relative = path.relative(resolvedTemp, resolvedTarget);
  if (
    relative === ''
    || relative.startsWith(`..${path.sep}`)
    || path.isAbsolute(relative)
    || !path.basename(resolvedTarget).startsWith('craftroster-skill-source-tests-')
  ) {
    throw new Error(`Refusing to clean unexpected test path: ${resolvedTarget}`);
  }
  fs.rmSync(resolvedTarget, { recursive: true, force: true });
}

async function main() {
  try {
  await test('validates every current referenced Skill and pinned source', () => {
    const state = validateRepository(ROOT);
    assert.ok(state.referencedSkillCount >= 33);
    assert.ok(state.sourceCount >= 12);
    assert.ok(state.sources.every((source) => /^[0-9a-f]{40}$/.test(source.revision)));
    assert.ok(state.sources.every((source) => /^[0-9a-f]{40}$/.test(source.tree)));
    assert.ok(state.sources.every((source) => source.pathEvidence.length > 0));

    const result = spawnSync(process.execPath, ['scripts/verify-skill-sources.js'], {
      cwd: ROOT,
      encoding: 'utf8',
    });
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    assert.match(result.stdout, /Skill source manifest verified:/);
  });

  await test('rejects a missing full catalog revision', () => {
    const repoRoot = createFixture('missing-revision');
    const catalog = readCatalog(repoRoot);
    delete catalog.skills[0].reference.revision;
    writeJson(path.join(repoRoot, 'skills.json'), catalog);
    assert.throws(
      () => validateRepository(repoRoot),
      /reference\.revision must be a lowercase 40-character Git commit SHA/
    );
  });

  await test('rejects frontmatter and catalog revision drift', () => {
    const repoRoot = createFixture('metadata-drift');
    mutateSkill(repoRoot, 'alpha-skill', SHA_A, SHA_B);
    assert.throws(
      () => validateRepository(repoRoot),
      /metadata\.reference-revision does not match skills\.json reference\.revision/
    );
  });

  await test('rejects different revisions for the same source repository', () => {
    const repoRoot = createFixture('source-conflict');
    const catalog = readCatalog(repoRoot);
    catalog.skills[1].reference.revision = SHA_B;
    writeJson(path.join(repoRoot, 'skills.json'), catalog);
    mutateSkill(repoRoot, 'beta-skill', SHA_A, SHA_B);
    assert.throws(() => validateRepository(repoRoot), /referenced Skills use inconsistent revisions/);
  });

  await test('rejects catalog repository casing that differs from the source manifest', () => {
    const repoRoot = createFixture('source-case-drift');
    const catalog = readCatalog(repoRoot);
    catalog.skills[1].reference.source = 'Example/Reference';
    writeJson(path.join(repoRoot, 'skills.json'), catalog);
    mutateSkill(repoRoot, 'beta-skill', 'example/reference', 'Example/Reference');
    assert.throws(
      () => validateRepository(repoRoot),
      /reference source casing must exactly match source manifest repository example\/reference/
    );
  });

  await test('rejects case-folded duplicate repositories in the source manifest', () => {
    const repoRoot = createFixture('manifest-case-duplicate');
    const manifest = readManifest(repoRoot);
    manifest.repositories.push({
      ...manifest.repositories[0],
      repo: 'Example/Reference',
      skills: {},
    });
    writeJson(path.join(repoRoot, 'scripts', 'data', 'skill-reference-sources.json'), manifest);
    assert.throws(
      () => validateRepository(repoRoot),
      /duplicate reference manifest repository \(GitHub repository names are case-insensitive\)/
    );
  });

  await test('rejects ownership drift on referenced Skills', () => {
    const repoRoot = createFixture('ownership-drift');
    const catalog = readCatalog(repoRoot);
    catalog.skills[0].author = 'External Author';
    writeJson(path.join(repoRoot, 'skills.json'), catalog);
    assert.throws(() => validateRepository(repoRoot), /author must remain HsinPu/);
  });

  await test('rejects a missing canonical source manifest', () => {
    const repoRoot = createFixture('missing-source-manifest');
    fs.rmSync(path.join(repoRoot, 'scripts', 'data', 'skill-reference-sources.json'));
    assert.throws(() => validateRepository(repoRoot), /unable to read scripts[\\/]data[\\/]skill-reference-sources\.json/);
  });

  await test('rejects a missing provenance lock', () => {
    const repoRoot = createFixture('missing-source-lock');
    fs.rmSync(path.join(repoRoot, 'scripts', 'data', 'skill-reference-lock.json'));
    assert.throws(
      () => validateRepository(repoRoot),
      /unable to read scripts[\\/]data[\\/]skill-reference-lock\.json/
    );
  });

  await test('rejects a source mapping change without an explicit lock update', () => {
    const repoRoot = createFixture('stale-source-lock');
    const manifest = readManifest(repoRoot);
    manifest.repositories[0].skills['alpha-skill'][0].blob = SHA_B;
    writeJson(path.join(repoRoot, 'scripts', 'data', 'skill-reference-sources.json'), manifest);
    assert.throws(
      () => validateRepository(repoRoot),
      /skill-reference-lock\.json evidenceSha256 does not match scripts[\\/]data[\\/]skill-reference-sources\.json/
    );
  });

  await test('rejects a manifest commit unrelated to the declared revision', () => {
    const repoRoot = createFixture('manifest-commit-drift');
    const manifest = readManifest(repoRoot);
    manifest.repositories[0].commit = SHA_B;
    writeJson(path.join(repoRoot, 'scripts', 'data', 'skill-reference-sources.json'), manifest);
    assert.throws(() => validateRepository(repoRoot), /reference revision does not match source manifest commit/);
  });

  await test('rejects a source manifest with a missing Skill path mapping', () => {
    const repoRoot = createFixture('manifest-skill-missing');
    const manifest = readManifest(repoRoot);
    delete manifest.repositories[0].skills['alpha-skill'];
    writeJson(path.join(repoRoot, 'scripts', 'data', 'skill-reference-sources.json'), manifest);
    assert.throws(() => validateRepository(repoRoot), /source manifest must name at least one reference path/);
  });

  await test('rejects duplicate nested metadata keys', () => {
    const repoRoot = createFixture('duplicate-metadata');
    mutateSkill(
      repoRoot,
      'alpha-skill',
      `  reference-revision: "${SHA_A}"`,
      `  reference-revision: "${SHA_A}"\n  reference-revision: "${SHA_A}"`
    );
    assert.throws(
      () => validateRepository(repoRoot),
      /duplicate metadata field: reference-revision/
    );
  });

  await test('accepts a matching pinned remote commit', async () => {
    const state = validateRepository(createFixture('remote-match'));
    assert.deepEqual(
      await verifyRemote(state, () => remoteSnapshot(state.sources[0])),
      { sourceCount: 1, pathCount: 3, licenseCount: 1 }
    );
  });

  await test('rejects an unexpected commit resolution', async () => {
    const state = validateRepository(createFixture('remote-mismatch'));
    await assert.rejects(
      () => verifyRemote(state, () => remoteSnapshot(state.sources[0], { commit: SHA_B })),
      new RegExp(`GitHub resolved pinned revision ${SHA_A} as ${SHA_B}`)
    );
  });

  await test('rejects a mismatched remote commit tree', async () => {
    const state = validateRepository(createFixture('remote-tree-mismatch'));
    await assert.rejects(
      () => verifyRemote(state, () => remoteSnapshot(state.sources[0], { tree: SHA_B })),
      /does not match manifest/
    );
  });

  await test('rejects a missing or changed reference blob', async () => {
    const state = validateRepository(createFixture('remote-blob-mismatch'));
    const snapshot = remoteSnapshot(state.sources[0]);
    snapshot.blobs['skills/alpha-skill/SKILL.md'] = SHA_B;
    await assert.rejects(() => verifyRemote(state, () => snapshot), /blob .* does not match manifest/);
  });

  await test('rejects license evidence whose content does not match the declared license', async () => {
    const state = validateRepository(createFixture('remote-license-mismatch'));
    const snapshot = remoteSnapshot(state.sources[0], {
      licenseText: 'Apache License Version 2.0, January 2004',
    });
    await assert.rejects(
      () => verifyRemote(state, () => snapshot),
      /content does not match declared license MIT/
    );
  });

  await test('accepts the pinned Impeccable Apache-2.0 license in remote verification', async () => {
    const source = validateRepository(ROOT).sources.find((entry) => entry.repo === 'pbakaus/impeccable');
    assert(source && source.license === 'Apache-2.0');
    const licenseText = fs.readFileSync(path.join(ROOT, 'skills/ui-improvement/references/impeccable-LICENSE.txt'), 'utf8');
    const result = await verifyRemote({ sources: [source] }, () => remoteSnapshot(source, { licenseText }));
    assert.deepEqual(result, { sourceCount: 1, pathCount: new Set(source.pathEvidence.map((entry) => entry.path)).size, licenseCount: 1 });
  });

  await test('Apache-2.0 matching rejects other versions, short notices and incomplete terms', () => {
    const licenseText = fs.readFileSync(path.join(ROOT, 'skills/ui-improvement/references/impeccable-LICENSE.txt'), 'utf8');
    for (const invalid of [
      'Licensed under the Apache License, Version 2.0',
      licenseText.replace('Version 2.0, January 2004', 'Version 1.1, January 2004'),
      licenseText.replace('Grant of Patent License.', 'Missing section.'),
      'MIT License\nPermission is hereby granted, free of charge.',
    ]) assert.equal(licenseEvidenceMatches('Apache-2.0', 'license-file', invalid), false);
    assert.equal(licenseEvidenceMatches('Apache-2.0', 'terms', licenseText), false);
    assert.equal(licenseEvidenceMatches('MIT', 'license-file', licenseText), false);
  });

  await test('Apache-2.0 acceptance retains pinned license blob verification', async () => {
    const source = validateRepository(ROOT).sources.find((entry) => entry.repo === 'pbakaus/impeccable');
    const licenseText = fs.readFileSync(path.join(ROOT, 'skills/ui-improvement/references/impeccable-LICENSE.txt'), 'utf8');
    const snapshot = remoteSnapshot(source, { licenseText });
    snapshot.blobs[source.licenseEvidence.path] = SHA_B;
    await assert.rejects(verifyRemote({ sources: [source] }, () => snapshot), /LICENSE blob .* does not match manifest/);
  });

  await test('reports remote resolution failures explicitly', async () => {
    const state = validateRepository(createFixture('remote-failure'));
    await assert.rejects(
      () => verifyRemote(state, () => { throw new Error('network unavailable'); }),
      /unable to resolve pinned source tree: network unavailable/
    );
  });

  await test('rejects unsupported command-line arguments', () => {
    assert.throws(() => parseArguments(['--bogus']), /Unknown argument: --bogus/);
  });

  await test('requires provenance lock updates to be explicit and offline', () => {
    assert.equal(parseArguments(['--update-lock']).updateLock, true);
    assert.throws(
      () => parseArguments(['--update-lock', '--remote']),
      /--remote and --update-lock cannot be used together/
    );
  });

  console.log(`Skill source revision tests passed: ${passed}`);
  } finally {
    safeCleanup();
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
