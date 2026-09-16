'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');

// Private author harness: only fixed author source is executed in fresh local
// temporary directories. This is neither a model run nor a sandbox for model code.
const fixtureRoot = path.resolve(__dirname, '../skills/code-review/evals/fixtures/normalization-history');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'craftroster-review-history-'));
const gitExecutable = process.env.CRAFTROSTER_TEST_GIT || 'git';
const args = process.argv.slice(2);
assert.ok(args.length === 0 || (args.length === 1 && args[0] === '--record-fixture-evidence'), 'Only --record-fixture-evidence is supported');
const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/^GIT_/i.test(key)));
env.GIT_CONFIG_NOSYSTEM = '1';
env.GIT_CONFIG_GLOBAL = path.join(temp, 'empty-gitconfig');
env.GIT_TERMINAL_PROMPT = '0';
env.GIT_AUTHOR_DATE = '2026-09-16T00:00:00+00:00';
env.GIT_COMMITTER_DATE = env.GIT_AUTHOR_DATE;
let passed = 0;
let counter = 0;
const sha = text => crypto.createHash('sha256').update(text).digest('hex');
const normalizedText = file => fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));
function test(name, fn) { fn(); passed += 1; console.log(`PASS ${name}`); }
function run(executable, command, cwd) {
  const result = spawnSync(executable, command, { cwd, env, encoding: 'utf8', timeout: 15000, windowsHide: true });
  assert.ifError(result.error);
  assert.equal(result.signal, null);
  return result;
}
function git(root, ...command) {
  const result = run(gitExecutable, ['-c', 'core.autocrlf=false', '-c', 'core.safecrlf=false', '-c', 'core.filemode=false',
    '-c', 'commit.gpgsign=false', '-c', `core.hooksPath=${path.join(temp, 'empty-hooks')}`, ...command], root);
  assert.equal(result.status, 0, `git ${command.join(' ')}\n${result.stderr}`);
  return result.stdout.replace(/\r\n/g, '\n');
}
function sourceSnapshot(root, omitEvidence = false) {
  const result = {};
  function visit(directory, prefix = '') {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name < b.name ? -1 : 1)) {
      if (entry.name === '.git' || (omitEvidence && !prefix && entry.name === 'evidence')) continue;
      assert.equal(entry.isSymbolicLink(), false);
      const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) visit(path.join(directory, entry.name), relative);
      else result[relative] = sha(normalizedText(path.join(root, relative)));
    }
  }
  visit(root);
  return result;
}
const sharedPaths = ['AGENTS.md', 'README.md', 'package.json', 'contracts/partner-feed.md', 'fixtures/partner-row.json',
  'src/catalog.js', 'src/partner-import.js', 'test/sku.test.js', 'test/partner-import.test.js'];
const publicTests = ['test/sku.test.js', 'test/partner-import.test.js'];
function validateRecipe(recipe) {
  assert.equal(recipe.schemaVersion, 1);
  assert.equal(recipe.kind, 'normalization-history');
  assert.equal(recipe.initialBranch, 'fixture-review');
  assert.deepEqual(recipe.identity, { name: 'Fixture Author', email: 'fixture@example.invalid' });
  assert.equal(recipe.commitTimestamp, env.GIT_AUTHOR_DATE);
  assert.deepEqual(recipe.publicTests, publicTests);
  // An exact, small allowlist also rejects path traversal, Windows aliases,
  // duplicate mappings, unexpected entrypoints and Git control destinations.
  const allowed = {
    seed: [...sharedPaths.map(file => ({ source: `shared/${file}`, destination: file })),
      { source: 'head/src/normalize-sku.js', destination: 'src/normalize-sku.js' }],
    normalization: [
      { source: 'base/src/normalize-sku.js', destination: 'src/normalize-sku.js' },
      { source: 'history/partner-import-history.md', destination: 'docs/partner-import-history.md' }
    ],
    head: [{ source: 'head/src/normalize-sku.js', destination: 'src/normalize-sku.js' }]
  };
  const order = files => [...files].sort((a, b) => a.destination < b.destination ? -1 : 1);
  for (const stage of ['seed', 'normalization', 'head']) {
    assert.deepEqual(order(recipe[stage].files), order(allowed[stage]), 'Unexpected recipe mapping');
    assert.ok(typeof recipe[stage].message === 'string' && recipe[stage].message.length > 0);
    for (const file of recipe[stage].files) {
      const source = path.join(fixtureRoot, file.source);
      const actual = fs.realpathSync(source);
      assert.ok(actual.startsWith(fs.realpathSync(fixtureRoot) + path.sep), 'Source escaped fixture');
      assert.ok(fs.lstatSync(source).isFile() && !fs.lstatSync(source).isSymbolicLink(), 'Source must be a regular file');
    }
  }
}
function checkPublicTests(root) {
  return publicTests.map(script => {
    const executedAt = new Date().toISOString();
    const result = run(process.execPath, [script], root);
    assert.equal(result.status, 0, result.stderr || result.stdout);
    return { command: `node ${script}`, executedAt, exitCode: result.status, stdout: result.stdout.trim() };
  });
}
function materialize(recipeOverride, destinationOverride) {
  const recipe = recipeOverride || readJson(path.join(fixtureRoot, 'fixture-recipe.json'));
  validateRecipe(recipe);
  const destination = path.resolve(destinationOverride || path.join(temp, `repo-${++counter}`));
  if (path.dirname(destination) !== path.resolve(temp) || !path.basename(destination).startsWith('repo-') || fs.existsSync(destination)) {
    throw new Error('Setup requires a new isolated temporary repository');
  }
  fs.mkdirSync(destination);
  git(destination, 'init', '--quiet', '--template=', '--object-format=sha1', '--initial-branch=fixture-review');
  git(destination, 'config', 'user.name', recipe.identity.name);
  git(destination, 'config', 'user.email', recipe.identity.email);
  const commits = {}, tests = {};
  for (const stage of ['seed', 'normalization', 'head']) {
    for (const file of recipe[stage].files) {
      const target = path.join(destination, file.destination);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, normalizedText(path.join(fixtureRoot, file.source)));
    }
    git(destination, 'add', '--all');
    git(destination, 'commit', '--quiet', '-m', recipe[stage].message);
    commits[stage] = git(destination, 'rev-parse', 'HEAD').trim();
    tests[stage] = checkPublicTests(destination);
  }
  const observations = {
    seed: commits.seed, reviewBase: commits.normalization, reviewHead: commits.head,
    mergeBase: git(destination, 'merge-base', commits.normalization, commits.head).trim(),
    history: git(destination, 'log', '--reverse', '--format=%H %P %s').trimEnd().split('\n'),
    statusPorcelain: git(destination, 'status', '--porcelain=v1', '--untracked-files=all').trimEnd(),
    compatibilityPaths: git(destination, 'diff', '--name-only', `${commits.seed}..${commits.normalization}`).trim().split('\n'),
    currentPaths: git(destination, 'diff', '--name-only', `${commits.normalization}..${commits.head}`).trim().split('\n'),
    compatibilityDiff: git(destination, 'diff', '--no-ext-diff', '--no-textconv', `${commits.seed}..${commits.normalization}`, '--', 'src/normalize-sku.js'),
    currentDiff: git(destination, 'diff', '--no-ext-diff', '--no-textconv', `${commits.normalization}..${commits.head}`)
  };
  return { root: destination, observations, tests };
}
function consumerSnapshot(repository, ref) {
  const destination = path.join(temp, `consumer-${++counter}`);
  fs.mkdirSync(destination);
  for (const file of ['package.json', 'src/catalog.js', 'src/partner-import.js', 'src/normalize-sku.js']) {
    const target = path.join(destination, file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, git(repository, 'show', `${ref}:${file}`));
  }
  return destination;
}
function probeConsumer(root, rows) {
  const script = "const { importPartnerRow } = require('./src/partner-import'); process.stdout.write(JSON.stringify(JSON.parse(process.argv[1]).map(importPartnerRow)));";
  const result = run(process.execPath, ['-e', script, JSON.stringify(rows)], root);
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}

fs.mkdirSync(path.join(temp, 'empty-hooks'));
fs.writeFileSync(env.GIT_CONFIG_GLOBAL, '');
try {
  const fixture = materialize();
  if (args[0] === '--record-fixture-evidence') {
    const receipt = {
      schemaVersion: 1, fixtureOnly: true, kind: 'normalization-history', modelExecution: false,
      origin: 'actual isolated local Git and ordinary author-unit-test executions; no network or real-repository commit',
      limitation: 'Ordinary unit results cover only their listed inputs, not complete partner compatibility or a model review outcome.',
      digestAlgorithm: 'sha256-utf8-lf', inputs: sourceSnapshot(fixtureRoot, true),
      environment: { node: process.version, platform: process.platform, git: git(fixture.root, '--version').trim() },
      observations: fixture.observations, tests: fixture.tests
    };
    fs.mkdirSync(path.join(fixtureRoot, 'evidence'), { recursive: true });
    fs.writeFileSync(path.join(fixtureRoot, 'evidence/author-verification.json'), `${JSON.stringify(receipt, null, 2)}\n`);
    console.log('Recorded actual isolated Git and ordinary test evidence; private consumer results are not published.');
  }
  const originalSources = sourceSnapshot(fixtureRoot);
  const { root, observations } = fixture;

  test('three real commits reconstruct the compatibility addition and one-file safeguard removal', () => {
    assert.equal(new Set([observations.seed, observations.reviewBase, observations.reviewHead]).size, 3);
    assert.equal(git(root, 'rev-list', '--count', 'HEAD').trim(), '3');
    assert.equal(git(root, 'rev-parse', `${observations.reviewBase}^`).trim(), observations.seed);
    assert.equal(git(root, 'rev-parse', `${observations.reviewHead}^`).trim(), observations.reviewBase);
    assert.equal(observations.mergeBase, observations.reviewBase);
    assert.deepEqual(observations.compatibilityPaths, ['docs/partner-import-history.md', 'src/normalize-sku.js']);
    assert.deepEqual(observations.currentPaths, ['src/normalize-sku.js']);
    assert.equal(observations.statusPorcelain, '');
    assert.equal(git(root, 'show', `${observations.reviewBase}:src/normalize-sku.js`), normalizedText(path.join(fixtureRoot, 'base/src/normalize-sku.js')));
    assert.equal(git(root, 'show', 'HEAD:src/normalize-sku.js'), normalizedText(path.join(fixtureRoot, 'head/src/normalize-sku.js')));
  });

  test('ordinary units pass on all revisions while caller, supported contract, sample and tests remain unchanged', () => {
    for (const checks of Object.values(fixture.tests)) {
      assert.equal(checks.length, publicTests.length);
      assert.ok(checks.every(check => check.exitCode === 0 && /ordinary .* checks passed/.test(check.stdout)));
    }
    for (const file of sharedPaths) assert.equal(git(root, 'show', `${observations.seed}:${file}`), git(root, 'show', `HEAD:${file}`));
  });

  test('the actual consumer accepts the supported producer row at base but rejects it at current head', () => {
    const row = readJson(path.join(root, 'fixtures/partner-row.json'));
    const accepted = { status: 200, line: { sku: 'KIT-07', productId: 'product-kit-07', quantity: 2 } };
    const base = consumerSnapshot(root, observations.reviewBase);
    const seed = consumerSnapshot(root, observations.seed);
    assert.deepEqual(probeConsumer(base, [row]), [accepted]);
    assert.deepEqual(probeConsumer(root, [row]), [{ status: 404, error: 'unknown-item' }]);
    assert.deepEqual(probeConsumer(seed, [row]), [{ status: 404, error: 'unknown-item' }]);
  });

  test('consumer boundary probes separate case and surrounding whitespace from canonical and unknown controls', () => {
    const base = consumerSnapshot(root, observations.reviewBase);
    const rows = ['KIT-07', 'kit-07', ' KIT-07 ', '\tKIT-07\r\n', ' \tkit-07\r\n', 'KIT-08', 'KIT -07']
      .map(item_code => ({ item_code, units: 1 }));
    assert.deepEqual(probeConsumer(base, rows).map(result => result.status), [200, 200, 200, 200, 200, 404, 404]);
    assert.deepEqual(probeConsumer(root, rows).map(result => result.status), [200, 404, 404, 404, 404, 404, 404]);
    const invalid = [{ item_code: 7, units: 1 }, { item_code: 'KIT-07', units: 0 }, null];
    assert.deepEqual(probeConsumer(base, invalid), probeConsumer(root, invalid));
    assert.ok(probeConsumer(root, invalid).every(result => result.status === 400));
  });

  test('private acceptance assertion fails against head and passes against base without relying on commit prose', () => {
    const base = consumerSnapshot(root, observations.reviewBase);
    const script = "const assert = require('node:assert/strict'); const { importPartnerRow } = require('./src/partner-import'); assert.equal(importPartnerRow({ item_code: '\\tkit-07 \\r\\n', units: 2 }).status, 200, 'Supported producer row must resolve'); console.log('Private consumer contract passed');";
    const good = run(process.execPath, ['-e', script], base);
    const regression = run(process.execPath, ['-e', script], root);
    assert.equal(good.status, 0, good.stderr);
    assert.notEqual(regression.status, 0);
    assert.match(regression.stderr, /Supported producer row must resolve/);
    assert.match(regression.stderr, /404 !== 200/);
  });

  test('unsafe or alias recipe paths and unexpected tests fail before any Git directory is created', () => {
    for (const mutate of [
      recipe => { recipe.seed.files[0].source = '../outside.txt'; },
      recipe => { recipe.seed.files[0].destination = '.git/config'; },
      recipe => { recipe.head.files[0].destination = 'SRC/normalize-sku.js'; },
      recipe => { recipe.head.files[0].destination = 'src/CON.js'; },
      recipe => { recipe.head.files[0].destination = 'C:/outside.txt'; },
      recipe => { recipe.head.files[0].destination = 'src/normalize-sku.js.'; },
      recipe => { recipe.seed.files.push({ ...recipe.seed.files[0] }); },
      recipe => { recipe.publicTests = ['../outside.js']; }
    ]) {
      const recipe = readJson(path.join(fixtureRoot, 'fixture-recipe.json'));
      mutate(recipe);
      const destination = path.join(temp, `repo-negative-${++counter}`);
      assert.throws(() => materialize(recipe, destination), assert.AssertionError);
      assert.equal(fs.existsSync(destination), false);
    }
  });

  test('setup rejects existing directories and the real repository while preserving their contents', () => {
    const existing = path.join(temp, 'repo-existing');
    fs.mkdirSync(existing);
    fs.writeFileSync(path.join(existing, 'keep.txt'), 'Keep this fixture sentinel.\n');
    assert.throws(() => materialize(null, existing), /new isolated temporary/);
    assert.equal(normalizedText(path.join(existing, 'keep.txt')), 'Keep this fixture sentinel.\n');
    assert.throws(() => materialize(null, path.resolve(__dirname, '..')), /new isolated temporary/);
    assert.throws(() => materialize(null, fixtureRoot), /new isolated temporary/);
  });

  test('frozen public evidence reproduces exact commits and ordinary results without publishing private conclusions', () => {
    const receipt = readJson(path.join(fixtureRoot, 'evidence/author-verification.json'));
    assert.deepEqual(receipt.inputs, sourceSnapshot(fixtureRoot, true));
    assert.deepEqual(receipt.observations, observations);
    const reproduced = materialize();
    assert.deepEqual(reproduced.observations, observations);
    for (const stage of ['seed', 'normalization', 'head']) {
      assert.deepEqual(receipt.tests[stage].map(({ command, exitCode, stdout }) => ({ command, exitCode, stdout })),
        reproduced.tests[stage].map(({ command, exitCode, stdout }) => ({ command, exitCode, stdout })));
      assert.ok(receipt.tests[stage].every(check => Number.isFinite(Date.parse(check.executedAt))));
    }
    assert.equal(receipt.modelExecution, false);
    assert.deepEqual(Object.keys(receipt.tests).sort(), ['head', 'normalization', 'seed']);
    assert.equal(receipt.expectedFindings, undefined);
    assert.equal(receipt.privateConsumerResults, undefined);
  });

  test('author probes preserve canonical source and the reconstructed review head', () => {
    assert.deepEqual(sourceSnapshot(fixtureRoot), originalSources);
    assert.equal(fs.existsSync(path.join(fixtureRoot, '.git')), false);
    assert.equal(git(root, 'status', '--porcelain=v1', '--untracked-files=all'), '');
    assert.equal(git(root, 'rev-parse', 'HEAD').trim(), observations.reviewHead);
  });
} finally {
  const resolved = path.resolve(temp);
  if (path.dirname(resolved) !== path.resolve(os.tmpdir()) || !path.basename(resolved).startsWith('craftroster-review-history-')) throw new Error('Unsafe history fixture cleanup');
  fs.rmSync(resolved, { recursive: true, force: true });
}
console.log(`${passed} history-review author-fixture checks passed; no model or external service ran.`);
