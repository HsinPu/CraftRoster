'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
const assert = require('assert');
const { buildBundle, writeBundle, parseArgs, safeRead } = require('../scripts/prepare-skill-pilot');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'craftroster-pilot-preparation-'));
let passed = 0;
function check(name, test) { test(); passed++; console.log(`PASS ${name}`); }
function write(relative, value) {
  const file = path.join(temp, relative);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, typeof value === 'string' ? value : JSON.stringify(value));
}
const document = {
  skill_name: 'alpha', evals: [{ id: 1, prompt: '請修正這個 local task。', locale: 'mixed-zh-TW-en', expected_output: 'ORACLE-SENTINEL',
    assertions: ['PRIVATE-ASSERTION'], fixture_root: 'evals/fixtures/basic', files: ['evals/fixtures/basic/src/input.txt'] },
  { id: 2, prompt: 'Compare these two supplied options.', expected_output: 'PRIVATE-TEXT-ORACLE', assertions: ['PRIVATE-TEXT-ASSERTION'] }],
};
const options = { root: temp, skill: 'alpha', caseId: 1 };
try {
  write('skills.json', { skills: [{ name: 'alpha', description: 'Alpha capability.' }, { name: 'beta', description: 'Beta capability.' }] });
  write('skills/alpha/SKILL.md', 'Alpha runtime instructions.');
  write('skills/alpha/references/guide.md', 'Runtime guide.');
  write('skills/alpha/evals/evals.json', document);
  write('skills/alpha/evals/fixtures/basic/src/input.txt', 'public input');
  write('skills/beta/SKILL.md', 'Beta runtime instructions.');
  write('skills/beta/evals/other.json', { answer: 'OTHER-CASE-ORACLE' });
  let bundle;
  check('public snapshot excludes every package oracle and retains runtime references', () => {
    bundle = buildBundle(options);
    const text = bundle.publicFiles.map(file => file.bytes.toString()).join('\n');
    assert(text.includes('Runtime guide.'));
    assert(text.includes('Beta runtime instructions.'));
    assert(!/ORACLE|PRIVATE-ASSERTION/.test(text));
    assert(!bundle.publicFiles.some(file => file.path.includes('/evals/')));
    assert(bundle.publicFiles.some(file => file.path === 'workspace/src/input.txt'));
    assert.strictEqual(bundle.privateRecord.skill_packages.length, 2);
  });
  check('preparation never reports a model or assertion pass', () => {
    assert.strictEqual(bundle.privateRecord.status, 'not_run');
    assert(bundle.privateRecord.assertions.every(item => item.status === 'not_run' && item.evidence === null));
    assert.strictEqual(bundle.privateRecord.advertised_catalog_sha256, null);
    assert.strictEqual(bundle.privateRecord.activation_observed, false);
    assert.strictEqual(bundle.privateRecord.execution_readiness, 'requires_host_isolation_and_grader');
    assert.strictEqual(bundle.privateRecord.split, 'development');
  });
  check('oracle changes do not change public treatment hashes', () => {
    const changed = structuredClone(document); changed.evals[0].expected_output = 'DIFFERENT-ORACLE';
    write('skills/alpha/evals/evals.json', changed);
    const after = buildBundle(options);
    assert.strictEqual(after.privateRecord.public_bundle_sha256, bundle.privateRecord.public_bundle_sha256);
    assert.notStrictEqual(after.privateRecord.corpus_case_sha256, bundle.privateRecord.corpus_case_sha256);
    write('skills/alpha/evals/evals.json', document);
  });
  check('reference and fixture changes alter their content manifests', () => {
    write('skills/alpha/references/guide.md', 'Updated runtime guide.');
    write('skills/alpha/evals/fixtures/basic/src/input.txt', 'updated input');
    const after = buildBundle(options);
    assert.notStrictEqual(after.privateRecord.skill_packages[0].sha256, bundle.privateRecord.skill_packages[0].sha256);
    assert.notStrictEqual(after.privateRecord.fixture_sha256, bundle.privateRecord.fixture_sha256);
    assert.notStrictEqual(after.privateRecord.public_bundle_sha256, bundle.privateRecord.public_bundle_sha256);
  });
  check('missing fixture needs explicit text-only selection and cannot drop declared files', () => {
    assert.throws(() => buildBundle({ ...options, caseId: 2 }), /No declared fixture/);
    assert.strictEqual(buildBundle({ ...options, caseId: 2, textOnly: true }).privateRecord.mode, 'text_only');
    assert.throws(() => buildBundle({ ...options, textOnly: true }), /cannot omit/);
  });
  check('invalid names and traversal are rejected before packaging', () => {
    assert.throws(() => buildBundle({ ...options, skill: '../outside' }), /Invalid Skill/);
    for (const relative of ['../outside', '/outside', 'C:/outside', 'skills\\alpha', 'skills/alpha/file:stream', 'skills/alpha/NUL.txt', 'skills/alpha/trailing.']) {
      assert.throws(() => safeRead(temp, relative), /normalized relative/);
    }
  });
  check('fixture prefix lookalikes and duplicate destinations fail', () => {
    const invalid = structuredClone(document);
    invalid.evals[0].fixture_root = 'evals/fixtures-other';
    write('skills/alpha/evals/evals.json', invalid);
    assert.throws(() => buildBundle(options), /inside evals\/fixtures/);
    invalid.evals[0] = structuredClone(document.evals[0]);
    invalid.evals[0].files.push(invalid.evals[0].files[0]);
    write('skills/alpha/evals/evals.json', invalid);
    assert.throws(() => buildBundle(options), /Duplicate/);
    invalid.evals[0].files = ['evals/fixtures/other/file.txt'];
    write('skills/alpha/evals/evals.json', invalid);
    assert.throws(() => buildBundle(options), /below fixture_root/);
    write('skills/alpha/evals/evals.json', document);
  });
  check('realpath escape is rejected even with a lexically valid input', () => {
    const original = fs.realpathSync;
    fs.realpathSync = file => String(file).endsWith(path.join('src', 'input.txt')) ? path.join(path.dirname(temp), 'outside.txt') : original(file);
    try { assert.throws(() => buildBundle(options), /contained regular file/); }
    finally { fs.realpathSync = original; }
  });
  check('private record and public workspace are physically distinct', () => {
    const target = path.join(temp, 'prepared');
    writeBundle(bundle, target);
    assert(fs.existsSync(path.join(target, 'public/workspace/src/input.txt')));
    const record = JSON.parse(fs.readFileSync(path.join(target, 'private/record.json')));
    assert.strictEqual(record.expected_output, 'ORACLE-SENTINEL');
    assert(!fs.existsSync(path.join(target, 'public/private')));
    assert.throws(() => writeBundle(bundle, target), /already exists/);
  });
  check('CLI rejects duplicate and unsupported options', () => {
    assert.throws(() => parseArgs(['--skill', 'alpha', '--skill', 'beta']), /Duplicate/);
    assert.throws(() => parseArgs(['--execute']), /Unknown option/);
    assert.throws(() => parseArgs(['--output']), /Missing value/);
  });
  check('Backend and Documents category representatives preserve their declared file inputs', () => {
    const repository = path.resolve(__dirname, '..');
    for (const [skill, expected] of [['api-contract-design', 'orders-contract.json'], ['spreadsheet-ops', 'sales.csv']]) {
      const prepared = buildBundle({ root: repository, skill, caseId: 1 });
      const publicInput = prepared.publicFiles.find(file => file.path === `workspace/${expected}`);
      assert(publicInput, `${skill} must expose its existing input at the task's named path`);
      assert(publicInput.bytes.equals(fs.readFileSync(path.join(repository, 'skills', skill, 'evals/fixtures', expected))));
      assert.strictEqual(prepared.privateRecord.fixture_manifest.length, 1);
      assert.strictEqual(prepared.privateRecord.mode, 'workspace_fixture');
      assert.strictEqual(prepared.privateRecord.status, 'not_run');
      assert.strictEqual(prepared.privateRecord.model_effective, null);
      assert(!prepared.publicFiles.some(file => file.path.includes('/evals/')));
      const content = prepared.publicFiles.map(file => file.bytes.toString('utf8')).join('\n');
      assert(!content.includes(prepared.privateRecord.expected_output));
      assert(prepared.privateRecord.assertions.every(item => !content.includes(item.text)));
    }
  });
  check('writing and social evidence cases map to stable workspace paths without changing source content', () => {
    const repository = path.resolve(__dirname, '..');
    for (const [skill, caseId, expected] of [
      ['git-readme-writer', 1, 'package.json'],
      ['agent-reach-ops', 1, 'social-post-evidence.md'],
      ['agent-reach-ops', 2, 'video-transcript-evidence.md'],
      ['agent-reach-ops', 3, 'code-rss-evidence.md'],
    ]) {
      const prepared = buildBundle({ root: repository, skill, caseId });
      const input = prepared.publicFiles.find(file => file.path === `workspace/${expected}`);
      assert(input, `${skill}:${caseId} is missing its public evidence`);
      assert(input.bytes.equals(fs.readFileSync(path.join(repository, 'skills', skill, 'evals/fixtures', expected))));
      assert.strictEqual(prepared.privateRecord.fixture_manifest.length, 1);
      assert.strictEqual(prepared.privateRecord.status, 'not_run');
      const content = prepared.publicFiles.map(file => file.bytes.toString('utf8')).join('\n');
      assert(!content.includes(prepared.privateRecord.expected_output));
      assert(prepared.privateRecord.assertions.every(item => !content.includes(item.text)));
      if (expected === 'social-post-evidence.md') {
        assert(input.bytes.toString('utf8').includes('Screenshot caption:'));
        assert(input.bytes.toString('utf8').includes('upload your browser cookies'));
      }
    }
  });
  console.log(`Skill pilot preparation tests passed: ${passed}`);
} finally {
  const resolved = path.resolve(temp);
  if (path.dirname(resolved) !== path.resolve(os.tmpdir()) || !path.basename(resolved).startsWith('craftroster-pilot-preparation-')) throw new Error('Unsafe cleanup');
  fs.rmSync(resolved, { recursive: true, force: true });
}
