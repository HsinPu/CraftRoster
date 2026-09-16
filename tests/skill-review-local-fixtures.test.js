'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');

// This author harness creates Git history only in new isolated temporary repos.
// It executes fixed repository-authored sources, never evaluated model output.
const fixtureRoot = path.resolve(__dirname, '../skills/code-review/evals/fixtures');
const families = ['working-tree', 'equivalent-refactor'];
const gitExecutable = process.env.CRAFTROSTER_TEST_GIT || 'git';
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'craftroster-review-local-'));
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
function test(name, fn) { fn(); passed += 1; console.log(`PASS ${name}`); }
function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function normalizedText(file) { return fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n'); }
function sha(text) { return crypto.createHash('sha256').update(text).digest('hex'); }
function run(executable, command, cwd) {
  const result = spawnSync(executable, command, { cwd, env, encoding: 'utf8', timeout: 15000, windowsHide: true });
  assert.ifError(result.error);
  assert.equal(result.signal, null);
  return result;
}
function git(root, ...command) {
  const result = run(gitExecutable, ['-c', 'core.autocrlf=false', '-c', 'core.safecrlf=false', '-c', 'commit.gpgsign=false', '-c', `core.hooksPath=${path.join(temp, 'empty-hooks')}`, ...command], root);
  assert.equal(result.status, 0, `git ${command.join(' ')}\n${result.stderr}`);
  return result.stdout.replace(/\r\n/g, '\n');
}
function sourceSnapshot(root, omitEvidence = false) {
  const result = {};
  function visit(directory, prefix) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      if (entry.name === '.git' || (omitEvidence && !prefix && entry.name === 'evidence')) continue;
      assert.equal(entry.isSymbolicLink(), false);
      const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) visit(path.join(directory, entry.name), relative);
      else result[relative] = sha(normalizedText(path.join(root, relative)));
    }
  }
  visit(root, '');
  return result;
}
function relativePath(value) {
  if (typeof value !== 'string' || !value || value.includes('\\') || /[<>:"|?*\u0000-\u001f\u007f]/.test(value) || value.startsWith('/') || value.split('/').some((part) => !part || part === '.' || part === '..' || part.toLowerCase() === '.git' || /[. ]$/.test(part) || /^(con|prn|aux|nul|com[1-9¹²³]|lpt[1-9¹²³])(?:\.|$)/i.test(part))) throw new Error('Unsafe recipe path');
  return value;
}
function validateRecipe(familyRoot, recipe) {
  if (recipe.schemaVersion !== 1 || !families.includes(recipe.kind) || recipe.initialBranch !== 'fixture-review' || recipe.identity.name !== 'Fixture Author' || recipe.identity.email !== 'fixture@example.invalid' || recipe.commitTimestamp !== env.GIT_AUTHOR_DATE) throw new Error('Unexpected author recipe');
  const expectedTests = recipe.kind === 'working-tree' ? ['test/stock.test.js', 'test/order-service.test.js'] : ['test/display-name.test.js', 'test/greeting.test.js'];
  assert.deepEqual(recipe.publicTests, expectedTests, 'Only fixed author test entrypoints are allowed');
  const destinationSpellings = new Map();
  const destinationKinds = new Map();
  for (const layer of [recipe.base, recipe.staged, recipe.unstaged, recipe.untracked, recipe.head].filter(Boolean)) {
    const destinations = new Set();
    for (const file of layer.files) {
      relativePath(file.source);
      relativePath(file.destination);
      if (destinations.has(file.destination.toLowerCase())) throw new Error('Duplicate recipe destination');
      destinations.add(file.destination.toLowerCase());
      const parts = file.destination.split('/');
      for (let index = 0; index < parts.length; index += 1) {
        const prefix = parts.slice(0, index + 1).join('/');
        const folded = prefix.toLowerCase();
        const kind = index === parts.length - 1 ? 'file' : 'directory';
        if (destinationSpellings.has(folded) && destinationSpellings.get(folded) !== prefix) throw new Error('Unsafe recipe path: case alias');
        if (destinationKinds.has(folded) && destinationKinds.get(folded) !== kind) throw new Error('Unsafe recipe path: file/directory conflict');
        destinationSpellings.set(folded, prefix);
        destinationKinds.set(folded, kind);
      }
      const source = path.join(familyRoot, file.source);
      const actual = fs.realpathSync(source);
      if (!actual.startsWith(fs.realpathSync(familyRoot) + path.sep) || !fs.lstatSync(source).isFile() || fs.lstatSync(source).isSymbolicLink()) throw new Error('Recipe source is outside its fixture');
    }
  }
}
function copyLayer(familyRoot, destination, layer) {
  for (const file of layer.files) {
    const target = path.join(destination, file.destination);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, normalizedText(path.join(familyRoot, file.source)));
  }
}
function publicTests(root, scripts) {
  return scripts.map((script) => {
    const executedAt = new Date().toISOString();
    const result = run(process.execPath, [script], root);
    assert.equal(result.status, 0, result.stderr || result.stdout);
    return { command: `node ${script}`, executedAt, exitCode: result.status, stdout: result.stdout.trim() };
  });
}
function materialize(family, recipeOverride, destinationOverride) {
  const familyRoot = path.join(fixtureRoot, family);
  const recipe = recipeOverride || readJson(path.join(familyRoot, 'fixture-recipe.json'));
  validateRecipe(familyRoot, recipe);
  const destination = destinationOverride || path.join(temp, `repo-${++counter}`);
  const resolved = path.resolve(destination);
  if (path.dirname(resolved) !== path.resolve(temp) || !path.basename(resolved).startsWith('repo-') || fs.existsSync(resolved)) throw new Error('Setup requires a new isolated temporary repository');
  fs.mkdirSync(resolved);
  git(resolved, 'init', '--quiet', '--template=', '--object-format=sha1', '--initial-branch=fixture-review');
  git(resolved, 'config', 'user.name', recipe.identity.name);
  git(resolved, 'config', 'user.email', recipe.identity.email);
  copyLayer(familyRoot, resolved, recipe.base);
  git(resolved, 'add', '--all');
  git(resolved, 'commit', '--quiet', '-m', recipe.base.message);
  const base = git(resolved, 'rev-parse', 'HEAD').trim();
  const baseTests = publicTests(resolved, recipe.publicTests);
  if (recipe.kind === 'working-tree') {
    copyLayer(familyRoot, resolved, recipe.staged);
    git(resolved, 'add', '--', ...recipe.staged.files.map((file) => file.destination));
    copyLayer(familyRoot, resolved, recipe.unstaged);
    copyLayer(familyRoot, resolved, recipe.untracked);
  } else {
    copyLayer(familyRoot, resolved, recipe.head);
    git(resolved, 'add', '--', ...recipe.head.files.map((file) => file.destination));
    git(resolved, 'commit', '--quiet', '-m', recipe.head.message);
  }
  const finalTests = publicTests(resolved, recipe.publicTests);
  const head = git(resolved, 'rev-parse', 'HEAD').trim();
  const observations = {
    base, head,
    statusPorcelain: git(resolved, 'status', '--porcelain=v1', '--untracked-files=all').trimEnd(),
    stagedPaths: git(resolved, 'diff', '--cached', '--name-only').trim().split('\n').filter(Boolean),
    unstagedPaths: git(resolved, 'diff', '--name-only').trim().split('\n').filter(Boolean),
    untrackedPaths: git(resolved, 'ls-files', '--others', '--exclude-standard').trim().split('\n').filter(Boolean),
    baseToHeadPaths: git(resolved, 'diff', '--name-only', `${base}..${head}`).trim().split('\n').filter(Boolean)
  };
  return { root: resolved, familyRoot, recipe, observations, baseTests, finalTests };
}
function moduleFromText(text, name) {
  const file = path.join(temp, `probe-${++counter}-${name}.js`);
  fs.writeFileSync(file, text);
  return require(file);
}
fs.mkdirSync(path.join(temp, 'empty-hooks'));
fs.writeFileSync(env.GIT_CONFIG_GLOBAL, '');
try {
  if (args[0] === '--record-fixture-evidence') {
    for (const family of families) {
      const fixture = materialize(family);
      const receipt = {
        schemaVersion: 1, fixtureOnly: true, kind: family,
        origin: 'actual isolated local Git and author-test executions; no model, network, or real-repository commit',
        digestAlgorithm: 'sha256-utf8-lf', inputs: sourceSnapshot(fixture.familyRoot, true),
        environment: { node: process.version, platform: process.platform, git: git(fixture.root, '--version').trim() },
        observations: fixture.observations,
        tests: { base: fixture.baseTests, final: fixture.finalTests }
      };
      fs.mkdirSync(path.join(fixture.familyRoot, 'evidence'), { recursive: true });
      fs.writeFileSync(path.join(fixture.familyRoot, 'evidence/author-verification.json'), `${JSON.stringify(receipt, null, 2)}\n`);
    }
    console.log('Recorded isolated Git/test receipts for author fixtures; no evaluated model ran.');
  }
  const originals = Object.fromEntries(families.map((family) => [family, sourceSnapshot(path.join(fixtureRoot, family))]));

  test('working-tree fixture creates distinct committed, staged, unstaged, and new scopes', () => {
    const fixture = materialize('working-tree');
    const { root, familyRoot, observations } = fixture;
    assert.equal(observations.base, observations.head);
    assert.equal(observations.statusPorcelain, ' M notes/team-schedule.md\nMM src/stock.js\n?? fixtures/order.json\n?? scripts/preview-order.js');
    assert.deepEqual(observations.stagedPaths, ['src/stock.js']);
    assert.deepEqual(observations.unstagedPaths, ['notes/team-schedule.md', 'src/stock.js']);
    assert.deepEqual(observations.untrackedPaths, ['fixtures/order.json', 'scripts/preview-order.js']);
    assert.equal(git(root, 'show', 'HEAD:src/stock.js'), normalizedText(path.join(familyRoot, 'base/src/stock.js')));
    assert.equal(git(root, 'show', ':src/stock.js'), normalizedText(path.join(familyRoot, 'index/src/stock.js')));
    assert.equal(normalizedText(path.join(root, 'src/stock.js')), normalizedText(path.join(familyRoot, 'worktree/src/stock.js')));
    assert.match(normalizedText(path.join(root, 'REVIEW_CONTEXT.md')), /already present before this task/);
    const before = sourceSnapshot(root);
    publicTests(root, fixture.recipe.publicTests);
    assert.deepEqual(sourceSnapshot(root), before);
    assert.equal(git(root, 'status', '--porcelain=v1', '--untracked-files=all').trimEnd(), observations.statusPorcelain);
  });

  test('working-tree defect is reachable through the new local caller despite passing normal tests', () => {
    const { root } = materialize('working-tree');
    const base = moduleFromText(git(root, 'show', 'HEAD:src/stock.js'), 'base-stock');
    const index = moduleFromText(git(root, 'show', ':src/stock.js'), 'index-stock');
    assert.deepEqual(base.reserveStock(3, 3), { accepted: true, remaining: 0 });
    assert.deepEqual(index.reserveStock(3, 3), { accepted: true, remaining: 0 });
    const before = sourceSnapshot(root);
    const preview = run(process.execPath, ['scripts/preview-order.js'], root);
    assert.equal(preview.status, 0, preview.stderr);
    assert.deepEqual(JSON.parse(preview.stdout), { result: { status: 409, message: 'Unavailable' }, inventory: { notebook: 3 } });
    assert.deepEqual(sourceSnapshot(root), before);
  });

  test('equivalent refactor has a real one-file diff, unchanged tests/caller, and clean Git state', () => {
    const fixture = materialize('equivalent-refactor');
    const { root, observations } = fixture;
    assert.notEqual(observations.base, observations.head);
    assert.equal(observations.statusPorcelain, '');
    assert.deepEqual(observations.baseToHeadPaths, ['src/display-name.js']);
    for (const file of [...fixture.recipe.publicTests, 'src/greeting.js']) assert.equal(git(root, 'show', `${observations.base}:${file}`), git(root, 'show', `HEAD:${file}`));
    assert.ok([...fixture.baseTests, ...fixture.finalTests].every((check) => check.exitCode === 0));
  });

  test('base and head display-name behavior agree across boundary and Unicode string combinations', () => {
    const { root, observations } = materialize('equivalent-refactor');
    const base = moduleFromText(git(root, 'show', `${observations.base}:src/display-name.js`), 'base-display');
    const head = require(path.join(root, 'src/display-name.js'));
    const values = ['', 'Ada', ' ', '\t', '王', 'O\'Brien', 'a-b', 'x\ny'];
    for (const first of values) for (const last of values) assert.equal(head.displayName(first, last), base.displayName(first, last));
  });

  test('a real separator regression is caught by the supplied refactor tests', () => {
    const { root } = materialize('equivalent-refactor');
    const file = path.join(root, 'src/display-name.js');
    fs.writeFileSync(file, normalizedText(file).replace(".join(' ')", ".join('-')"));
    const result = run(process.execPath, ['test/display-name.test.js'], root);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Ada-Lovelace/);
  });

  test('unsafe source, destination, Git control path, and duplicate mappings are refused before setup', () => {
    for (const mutation of [
      (recipe) => { recipe.base.files[0].source = '../outside.txt'; },
      (recipe) => { recipe.base.files[0].destination = '../outside.txt'; },
      (recipe) => { recipe.base.files[0].destination = '.git/config'; },
      (recipe) => { recipe.base.files[0].destination = 'C:/outside.txt'; },
      (recipe) => { recipe.base.files[0].destination = 'notes/CON.txt'; },
      (recipe) => { recipe.base.files[0].destination = 'notes/trailing.'; },
      (recipe) => { recipe.base.files[0].destination = 'notes/trailing '; },
      (recipe) => { recipe.base.files[0].destination = 'notes/control\u0001.txt'; },
      (recipe) => { recipe.base.files[0].destination = 'notes/pipe|name.txt'; },
      (recipe) => { recipe.staged.files[0].destination = 'SRC/stock.js'; },
      (recipe) => { recipe.staged.files[0].destination = 'src'; },
      (recipe) => { recipe.base.files.push({ ...recipe.base.files[0] }); }
    ]) {
      const recipe = readJson(path.join(fixtureRoot, 'working-tree/fixture-recipe.json'));
      mutation(recipe);
      const destination = path.join(temp, `repo-negative-${++counter}`);
      assert.throws(() => materialize('working-tree', recipe, destination), /Unsafe recipe path|Duplicate recipe destination/);
      assert.equal(fs.existsSync(destination), false);
    }
  });

  test('setup refuses existing paths and every destination outside its isolated temporary root', () => {
    const existing = path.join(temp, 'repo-existing');
    fs.mkdirSync(existing);
    fs.writeFileSync(path.join(existing, 'keep.txt'), 'Keep this user-owned file.\n');
    assert.throws(() => materialize('working-tree', null, existing), /new isolated temporary/);
    assert.equal(fs.readFileSync(path.join(existing, 'keep.txt'), 'utf8'), 'Keep this user-owned file.\n');
    assert.throws(() => materialize('working-tree', null, fixtureRoot), /new isolated temporary/);
  });

  test('recorded author receipts match sources and contain actual Git/test observations only', () => {
    for (const family of families) {
      const root = path.join(fixtureRoot, family);
      const receipt = readJson(path.join(root, 'evidence/author-verification.json'));
      assert.deepEqual(receipt.inputs, sourceSnapshot(root, true));
      assert.match(receipt.observations.base, /^[0-9a-f]{40,64}$/);
      assert.match(receipt.observations.head, /^[0-9a-f]{40,64}$/);
      const reproduced = materialize(family);
      assert.deepEqual(receipt.observations, reproduced.observations, 'Frozen Git observations must reproduce from the current recipe');
      for (const check of [...receipt.tests.base, ...receipt.tests.final]) {
        assert.equal(check.exitCode, 0);
        assert.ok(Number.isFinite(Date.parse(check.executedAt)));
        assert.match(check.stdout, /tests passed/);
      }
      assert.equal(receipt.model, undefined);
    }
  });

  test('canonical source fixtures stay unchanged and never acquire a Git metadata directory', () => {
    for (const family of families) {
      const root = path.join(fixtureRoot, family);
      assert.deepEqual(sourceSnapshot(root), originals[family]);
      assert.equal(fs.existsSync(path.join(root, '.git')), false);
    }
  });
} finally {
  const resolved = path.resolve(temp);
  if (path.dirname(resolved) !== path.resolve(os.tmpdir()) || !path.basename(resolved).startsWith('craftroster-review-local-')) throw new Error('Unsafe review fixture cleanup');
  fs.rmSync(resolved, { recursive: true, force: true });
}
console.log(`${passed} local Git review author-fixture checks passed; no model or external service ran.`);
