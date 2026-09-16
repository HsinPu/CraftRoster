'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { buildBundle } = require('../scripts/prepare-skill-pilot');

// Material and bounded retrieval checks only. No package installation, model,
// network, generated-code execution or completed-server claim belongs here.
const repo = path.resolve(__dirname, '..');
const root = path.join(repo, 'skills/mcp-creator-design/evals/fixtures/component-directory');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const json = name => JSON.parse(read(name));
let passed = 0;
function test(name, run) { run(); passed++; console.log(`PASS ${name}`); }

async function main() {
  const metadata = json('package.json'), lock = json('package-lock.json');
  test('project lock pins the declared SDK and build dependencies without install hooks', () => {
    assert.equal(metadata.private, true);
    assert.equal(metadata.dependencies['@modelcontextprotocol/sdk'], '1.17.5');
    assert.equal(lock.lockfileVersion, 3);
    for (const kind of ['dependencies', 'devDependencies']) {
      assert.deepEqual(lock.packages[''][kind], metadata[kind]);
      for (const [name, version] of Object.entries(metadata[kind])) {
        assert.match(version, /^\d+\.\d+\.\d+$/);
        assert.equal(lock.packages[`node_modules/${name}`].version, version);
      }
    }
    for (const [name, item] of Object.entries(lock.packages)) {
      if (!name) continue;
      assert.match(item.resolved, /^https:\/\/registry\.npmjs\.org\//);
      assert.match(item.integrity, /^sha512-[A-Za-z0-9+/]+=*$/);
      assert.equal(item.link, undefined);
    }
    assert.deepEqual(Object.keys(metadata.scripts).sort(), ['build', 'start', 'test']);
  });

  const { retrieveOfficialDocs } = await import(pathToFileURL(path.join(root, 'host/retrieve-docs.mjs')).href);
  const before = read('host/documents.json');
  test('both documentation routes return versioned provenance as offline paraphrases', () => {
    const docs = json('host/documents.json');
    assert.equal(docs.sdk_version, metadata.dependencies[docs.sdk_package]);
    for (const [id, document] of Object.entries(docs.documents)) {
      const result = retrieveOfficialDocs(id);
      assert.equal(result.ok, true);
      assert.equal(result.document_id, id);
      assert.equal(result.retrieval_mode, 'offline_author_replay');
      assert.equal(result.sdk_version, docs.sdk_version);
      assert.equal(result.summary, document.summary);
      const url = new URL(result.source_url);
      assert.equal(url.origin, 'https://raw.githubusercontent.com');
      assert.ok(url.pathname.startsWith(`/modelcontextprotocol/typescript-sdk/${docs.sdk_version}/`));
      assert.equal(url.search, '');
      assert.equal(url.hash, '');
    }
    assert.equal(read('host/documents.json'), before);
  });

  test('retrieval rejects unknown IDs, URLs, paths and inherited object keys', () => {
    for (const id of [null, 1, {}, [], '', 'WebFetch', '../package.json', 'https://example.com', '__proto__', 'constructor', 'toString']) {
      assert.deepEqual(retrieveOfficialDocs(id), { ok: false, error: 'unknown_document' });
    }
    assert.equal(read('host/documents.json'), before);
  });

  test('the public start is a catalog project, with requested server and test absent', () => {
    for (const file of ['src/server.ts', 'src/index.ts', 'test/server.test.mjs', 'IMPLEMENTATION.md', 'node_modules', 'dist']) {
      assert.equal(fs.existsSync(path.join(root, file)), false, file);
    }
    assert.equal(json('tsconfig.json').compilerOptions.module, 'NodeNext');
    assert.equal(json('tsconfig.json').compilerOptions.noEmitOnError, true);
  });

  const bundle = buildBundle({ root: repo, skill: 'mcp-creator-design', caseId: 1 });
  test('all eight task files retain exact bytes while private answers stay excluded', () => {
    const materials = bundle.publicFiles.filter(file => file.path.startsWith('workspace/'));
    assert.equal(materials.length, 8);
    for (const file of materials) assert.ok(file.bytes.equals(fs.readFileSync(path.join(root, file.path.slice(10)))));
    const text = bundle.publicFiles.map(file => file.bytes.toString('utf8')).join('\n');
    assert.equal(text.includes(bundle.privateRecord.expected_output), false);
    for (const check of bundle.privateRecord.assertions) assert.equal(text.includes(check.text), false);
    assert.ok(bundle.publicFiles.every(file => !file.path.includes('/evals/') && !file.path.startsWith('tests/')));
    assert.equal(bundle.privateRecord.assertions.length, 3);
  });

  test('preparation retains unexecuted development status and no observed activation', () => {
    assert.equal(bundle.privateRecord.status, 'not_run');
    assert.equal(bundle.privateRecord.split, 'development');
    assert.equal(bundle.privateRecord.model_effective, null);
    assert.equal(bundle.privateRecord.activation_observed, false);
    assert.ok(bundle.privateRecord.assertions.every(item => item.status === 'not_run' && item.evidence === null));
  });
  console.log(`${passed} MCP material checks passed; installed project and model task evaluation not_run by this suite.`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
