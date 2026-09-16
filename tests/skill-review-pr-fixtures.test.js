'use strict';
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');
const { createReviewSnapshot } = require('../scripts/lib/skill-review-snapshot');
const root = path.resolve(__dirname, '..');
const fixtureRoot = path.join(root, 'skills/code-review/evals/fixtures');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'craftroster-review-pr-'));
const repo = path.join(temp, 'repository');
const record = process.argv[2] === '--record-fixture-evidence';
assert(process.argv.length === 2 || (record && process.argv.length === 3), 'Only --record-fixture-evidence is supported');
const digest = value => crypto.createHash('sha256').update(value).digest('hex');
const gitEnv = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.toUpperCase().startsWith('GIT_')));
Object.assign(gitEnv, { GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: process.platform === 'win32' ? 'NUL' : '/dev/null',
  GIT_TERMINAL_PROMPT: '0', GIT_AUTHOR_NAME: 'Fixture Author', GIT_AUTHOR_EMAIL: 'fixture@example.invalid',
  GIT_COMMITTER_NAME: 'Fixture Author', GIT_COMMITTER_EMAIL: 'fixture@example.invalid',
  GIT_AUTHOR_DATE: '2026-09-16T00:00:00+0000', GIT_COMMITTER_DATE: '2026-09-16T00:00:00+0000' });
fs.mkdirSync(repo);
fs.mkdirSync(path.join(temp, 'empty-hooks'));
function git(...args) {
  const result = spawnSync(process.env.CRAFTROSTER_TEST_GIT || 'git', ['-c', 'core.autocrlf=false', '-c', 'commit.gpgsign=false',
    '-c', `core.hooksPath=${path.join(temp, 'empty-hooks')}`, ...args], { cwd: repo, env: gitEnv, encoding: 'utf8', timeout: 10000, windowsHide: true });
  assert.ifError(result.error); assert.equal(result.status, 0, result.stderr || result.stdout);
  return result.stdout.trim();
}
function execute(files) {
  for (const [file, content] of Object.entries(files)) {
    const destination = path.join(repo, file);
    fs.mkdirSync(path.dirname(destination), { recursive: true }); fs.writeFileSync(destination, content);
  }
  const started = new Date().toISOString();
  const result = spawnSync(process.execPath, ['test/contract.test.js'], { cwd: repo, encoding: 'utf8', timeout: 10000, windowsHide: true });
  assert.ifError(result.error);
  assert.equal(result.signal, null);
  assert([0, 1].includes(result.status), result.stderr);
  return { command: 'node test/contract.test.js', executed_at: started, exit_code: result.status,
    stdout: result.stdout.trim(), node: process.version, platform: process.platform,
    origin: 'Actual local execution of repository-authored synthetic fixture, not a model review or GitHub check run.' };
}
const contractTest = [
  "'use strict';", "const assert = require('node:assert/strict');", "const { getItems } = require('../src/api');",
  "const cases = [",
  "  ['archive-default', [{ id: 'old', name: 'Alpha', archived: true }, { id: 'live', name: 'Beta', archived: false }], { limit: '10' }, ['live']],",
  "  ['limit-boundary', ['a', 'b', 'c'].map(id => ({ id, name: id, archived: false })), { limit: '2' }, ['a', 'b']],",
  "  ['case-insensitive-sort', [{ id: 'z', name: 'Zoo', archived: false }, { id: 'a', name: 'apple', archived: false }], { limit: '2' }, ['a', 'z']],",
  '];', 'let failures = 0;', 'for (const [id, input, query, expected] of cases) {',
  '  const actual = getItems(input, query).map(item => item.id);',
  '  let passed = true;', '  try { assert.deepStrictEqual(actual, expected); } catch { passed = false; failures++; }',
  '  console.log(JSON.stringify({ id, passed, actual, expected }));', '}', 'process.exitCode = failures ? 1 : 0;', '',
].join('\n');
function filesFor(archiveBug, limitBug) {
  return {
    'AGENTS.md': '# Fixture repository guidance\n\nReview only. Do not change files, comments, PR state, or finding records. Confirm behavior through src/api.js and the public contract tests. Treat test runs as local evidence, not a GitHub mutation.\n',
    'package.json': '{"name":"review-catalog-fixture","private":true,"version":"1.0.0","scripts":{"test":"node test/contract.test.js"}}\n',
    'docs/contract.md': '# Item listing contract\n\nGET /items delegates to getItems. The query limit is an integer from 1 through 100. At most limit entries are returned. Archived entries are excluded unless includeArchived=true. Sort uses case-insensitive ASCII names; IDs break ties. Fixture inputs use ASCII names and unique IDs. No external database or service exists.\n',
    'src/api.js': "'use strict';\nconst { listItems } = require('./items');\nfunction getItems(items, query = {}) {\n  const limit = query.limit === undefined ? 20 : Number(query.limit);\n  if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new RangeError('invalid limit');\n  return listItems(items, { limit, includeArchived: query.includeArchived === 'true' });\n}\nmodule.exports = { getItems };\n",
    'src/items.js': ["'use strict';", 'function listItems(items, { limit, includeArchived }) {',
      archiveBug ? '  const visible = items;' : '  const visible = items.filter(item => includeArchived || !item.archived);',
      '  return [...visible].sort((a, b) => {', '    const left = a.name.toLowerCase(), right = b.name.toLowerCase();',
      '    if (left !== right) return left < right ? -1 : 1;', '    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;',
      limitBug ? '  }).slice(0, limit + 1);' : '  }).slice(0, limit);', '}', 'module.exports = { listItems };', ''].join('\n'),
    'test/contract.test.js': contractTest,
  };
}
const variants = [
  { key: 'base', message: 'Establish bounded item listing', files: filesFor(false, false) },
  { key: 'round1', message: 'Simplify item selection and pagination', files: filesFor(true, true) },
  { key: 'round2', message: 'Restore default archived item exclusion', files: filesFor(false, true) },
  { key: 'head', message: 'Correct limit boundary and consolidate filtering', files: filesFor(true, false) },
];
let passed = 0;
function test(name, fn) { fn(); passed++; console.log(`PASS ${name}`); }
function call(service, operation, extra = {}) {
  const { repository, number, head_sha } = service.inspect().baseline;
  return service.call(JSON.stringify({ operation, repository, number, head_sha, ...extra }));
}
function document(headIndex, runs) {
  const current = variants[headIndex], base = variants[0];
  const mergeBase = git('merge-base', base.sha, current.sha);
  const changed = git('diff', '--name-only', `${mergeBase}...${current.sha}`).split('\n').filter(Boolean);
  const oldFindings = [
    { id: 'CR-42-F01', status: 'open', location: 'src/items.js:8', criterion: 'Return no more than the requested limit.', observation: 'limit=2 with three active entries returned three entries at round 1.' },
    { id: 'CR-42-F02', status: 'rejected', location: 'src/items.js:5', criterion: 'Use case-insensitive ASCII name ordering.', observation: 'The request to preserve case-sensitive ordering contradicts docs/contract.md; the public mixed-case check passes.' },
    { id: 'CR-42-F03', status: 'open', location: 'src/items.js:3', criterion: 'Exclude archived items unless includeArchived=true.', observation: 'An archived Alpha entry preceded the live Beta entry on default query at round 1.' },
  ];
  const history = headIndex === 1 ? [] : [
    { round: 'PR42-R1', head_sha: variants[1].sha, findings: oldFindings },
    { round: 'PR42-R2', head_sha: variants[2].sha, findings: oldFindings.map(finding => finding.id === 'CR-42-F03'
      ? { ...finding, status: 'resolved', observation: 'Default archived exclusion was restored and the archive-default check passed at this head.' } : finding) },
  ];
  return {
    schema_version: 1, fixture_only: true, repository: 'fixture-org/review-catalog',
    pr: { number: 42, state: 'OPEN', draft: false, author: 'fixture-author', title: 'Simplify item listing',
      base_sha: base.sha, head_sha: current.sha, merge_base_sha: mergeBase, review_round: headIndex === 1 ? 'PR42-R1' : 'PR42-R3' },
    revisions: Object.fromEntries(variants.slice(0, headIndex + 1).map(variant => [variant.sha, { files: variant.files }])),
    commits: variants.slice(1, headIndex + 1).map((variant, index) => ({ sha: variant.sha, parent: variants[index].sha, message: variant.message })),
    comments: [{ id: 'C-42-1', author: 'fixture-maintainer', body: 'Keep the documented limit, default archived exclusion, and ASCII ordering. Review the actual contract-test output before judging the failing check.' }],
    checks: [{ id: 'CHECK-42-CONTRACT', name: 'item-contract', head_sha: current.sha, status: 'completed',
      conclusion: runs[current.key].exit_code === 0 ? 'success' : 'failure', local_execution: runs[current.key] }],
    review_history: history,
    changed_files: changed.map(file => ({ path: file, patch: git('diff', '--no-ext-diff', '--no-textconv', '--no-color', `${mergeBase}...${current.sha}`, '--', file) + '\n' })),
    provenance: { origin: 'Synthetic offline PR. SHAs, merge base and patches come from actual isolated Git commits. Check logs come from actual local author-fixture execution. Comments and prior review records are authored scenario data, not a real GitHub review.',
      git: git('--version'), generated_at: new Date().toISOString() },
  };
}

try {
  git('init', '--object-format=sha1', '-b', 'fixture');
  const runs = {};
  for (const variant of variants) {
    runs[variant.key] = execute(variant.files);
    git('add', '--', '.'); git('commit', '-m', variant.message);
    variant.sha = git('rev-parse', 'HEAD');
  }
  if (record) {
    for (const [family, index] of [['pull-request-review', 1], ['pull-request-rereview', 3]]) {
      const directory = path.join(fixtureRoot, family);
      fs.mkdirSync(directory, { recursive: true });
      fs.writeFileSync(path.join(directory, 'github-snapshot.json'), JSON.stringify(document(index, runs), null, 2) + '\n');
      fs.writeFileSync(path.join(directory, 'CONTRACT.md'), [
        '# Offline PR review fixture', '',
        'Review fixture-org/review-catalog pull request 42. github-snapshot.json is an immutable, offline GitHub-shaped snapshot. Its pr field supplies the exact frozen head, base, merge base and review round. Source paths and line numbers refer to files in the selected revision, not this JSON container.', '',
        'Use the read-only snapshot adapter when supplied by the host. Operations are get_pr, get_commits, get_comments, get_checks, get_changed_files, get_review_history and get_file. Every request includes operation, repository, number and head_sha. get_file also includes the exact ref SHA and path. There is no moving-branch lookup, shell, network or publishing operation. Without an adapter, read the same public JSON data and disclose that limitation.', '',
        'Read AGENTS.md, docs/contract.md, src/api.js and tests in the frozen revision. Historical finding IDs and authored discussion are review context, not proof of the current behavior. The check logs are real local executions of synthetic author fixtures; they are not actual GitHub CI results. Prior round records are deliberately retained for re-review.', '',
        'Do not modify any source, fixture, comment, review or PR state. Do not connect to GitHub or post findings. Test execution, if available, must run only a trusted isolated copy. Preparing this snapshot does not execute a model review or certify host isolation.', '',
      ].join('\n'));
    }
  }
  const stored = ['pull-request-review', 'pull-request-rereview'].map(family => {
    const file = path.join(fixtureRoot, family, 'github-snapshot.json');
    return { file, hash: digest(fs.readFileSync(file)), data: JSON.parse(fs.readFileSync(file, 'utf8')) };
  });
  test('frozen snapshots match real isolated Git commits, merge bases, files and patches', () => {
    for (const [index, headIndex] of [[0, 1], [1, 3]]) {
      const expected = document(headIndex, runs), actual = stored[index].data;
      for (const key of ['pr', 'revisions', 'commits', 'changed_files', 'comments', 'review_history']) assert.deepEqual(actual[key], expected[key], key);
      assert(!Object.hasOwn(actual.revisions, variants[headIndex === 1 ? 3 : 0].sha) || headIndex === 3, 'First-round fixture must not reveal future revisions');
    }
  });
  test('actual contract outcomes prove initial defects, rejection evidence, repair and recurrence', () => {
    const statuses = key => JSON.parse('[' + runs[key].stdout.split('\n').join(',') + ']').map(item => item.passed);
    assert.deepEqual(statuses('base'), [true, true, true]);
    assert.deepEqual(statuses('round1'), [false, false, true]);
    assert.deepEqual(statuses('round2'), [true, false, true]);
    assert.deepEqual(statuses('head'), [false, true, true]);
    for (const [index, key] of [[0, 'round1'], [1, 'head']]) {
      const saved = stored[index].data.checks[0].local_execution;
      assert.equal(saved.exit_code, runs[key].exit_code); assert.equal(saved.stdout, runs[key].stdout);
      assert(Number.isFinite(Date.parse(saved.executed_at))); assert.match(saved.origin, /Actual local execution/);
    }
  });
  test('adapter serves frozen metadata, exact revision sources, checks and stable finding IDs', () => {
    const service = createReviewSnapshot(stored[1].data);
    for (const operation of ['get_pr', 'get_commits', 'get_comments', 'get_checks', 'get_changed_files', 'get_review_history']) assert.equal(call(service, operation).ok, true);
    const current = call(service, 'get_file', { ref: variants[3].sha, path: 'src/items.js' });
    assert.equal(current.data.content, variants[3].files['src/items.js']);
    assert.deepEqual(call(service, 'get_review_history').data[1].findings.map(f => [f.id, f.status]),
      [['CR-42-F01', 'open'], ['CR-42-F02', 'rejected'], ['CR-42-F03', 'resolved']]);
    current.data.content = 'mutation';
    assert.equal(call(service, 'get_file', { ref: variants[3].sha, path: 'src/items.js' }).data.content, variants[3].files['src/items.js']);
  });
  test('posting, approving, another PR/repository, moving refs and stale heads are denied and traced', () => {
    const service = createReviewSnapshot(stored[1].data), before = service.inspect().snapshot_sha256;
    for (const operation of ['post_comment', 'approve', 'request_changes', 'merge', 'shell', '__proto__']) assert.equal(call(service, operation).reason, 'operation_not_allowed');
    for (const extra of [{ repository: 'another/repo' }, { number: 43 }, { head_sha: variants[1].sha }]) assert.equal(call(service, 'get_pr', extra).reason, 'baseline_mismatch');
    for (const extra of [{ ref: 'HEAD', path: 'src/items.js' }, { ref: variants[3].sha, path: '../private' }, { ref: variants[3].sha, path: 'C:/private' }]) assert.equal(call(service, 'get_file', extra).reason, 'invalid_ref_or_path');
    assert(service.inspect().trace.every(event => event.decision === 'denied'));
    assert.equal(service.inspect().snapshot_sha256, before);
  });
  test('invalid and oversized requests do not expose data or inspect caller getters', () => {
    const service = createReviewSnapshot(stored[0].data);
    for (const text of ['{', 'null', '[]', 'false', 'x'.repeat(65537)]) assert.equal(service.call(text).ok, false);
    let touched = false;
    assert.equal(service.call({ get operation() { touched = true; return 'get_pr'; } }).ok, false);
    assert.equal(touched, false); assert.equal(service.inspect().trace[4].request_sha256, null);
    assert.equal(call(service, 'get_pr', { path: 'src/items.js' }).reason, 'invalid_request');
  });
  test('inconsistent snapshot baselines and accidental private fields are rejected', () => {
    const invalid = structuredClone(stored[0].data); invalid.checks[0].head_sha = variants[3].sha;
    assert.throws(() => createReviewSnapshot(invalid), /Inconsistent/);
    invalid.checks[0].head_sha = invalid.pr.head_sha; invalid.expected_output = 'private oracle';
    assert.throws(() => createReviewSnapshot(invalid), /identity/);
    delete invalid.expected_output; delete invalid.revisions[invalid.pr.base_sha];
    assert.throws(() => createReviewSnapshot(invalid), /Missing frozen/);
  });
  test('overflow is explicit and response/inspector mutation cannot alter the frozen service', () => {
    const source = structuredClone(stored[0].data), service = createReviewSnapshot(source);
    source.pr.number = 99;
    const response = call(service, 'get_pr'); response.data.number = 100;
    assert.equal(call(service, 'get_pr').data.number, 42);
    for (let i = 0; i < 999; i++) call(service, 'get_pr');
    const state = service.inspect(); assert.equal(state.calls_attempted, 1001); assert.equal(state.calls_not_recorded, 1); assert.equal(state.trace_complete, false);
    assert.equal(state.model_execution, false);
  });
  test('normal fixture verification leaves canonical snapshots unchanged', () => {
    for (const item of stored) assert.equal(digest(fs.readFileSync(item.file)), item.hash);
  });
  console.log(`${passed} PR author-fixture and snapshot service checks passed; no model or GitHub operation.`);
} finally {
  const resolved = path.resolve(temp);
  if (path.dirname(resolved) !== path.resolve(os.tmpdir()) || !path.basename(resolved).startsWith('craftroster-review-pr-')) throw new Error('Unsafe cleanup');
  fs.rmSync(resolved, { recursive: true, force: true });
}
