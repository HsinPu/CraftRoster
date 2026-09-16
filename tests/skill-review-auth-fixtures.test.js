'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');

// Private author checks; these are not bundled with the reviewed source views.
// Only fixed local fixture code is executed. No server, real identity, or model runs.
const fixtureRoot = path.resolve(__dirname, '../skills/code-review/evals/fixtures');
const families = ['auth-redirect-review', 'admin-guard-review'];
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'craftroster-review-auth-'));
let passed = 0;
let copies = 0;
function test(name, fn) { fn(); passed += 1; console.log(`PASS ${name}`); }
function snapshot(root) {
  const files = {};
  function visit(directory, prefix = '') {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      assert.equal(entry.isSymbolicLink(), false);
      const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) visit(path.join(directory, entry.name), relative);
      else files[relative] = crypto.createHash('sha256').update(fs.readFileSync(path.join(directory, entry.name))).digest('hex');
    }
  }
  visit(root);
  return files;
}
function withFixture(family, fn) {
  const root = path.join(temp, `${family}-${++copies}`);
  fs.cpSync(path.join(fixtureRoot, family), root, { recursive: true, errorOnExist: true });
  return fn(root);
}
function read(root, relative) { return JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8')); }
function dispatcher(root, view) { return require(path.join(root, view, 'src/app.js')).dispatch; }
function callbackRequest(next, headers = {}) {
  return { method: 'GET', path: '/auth/callback', headers: { cookie: 'fixture_session=fixture-member-session', ...headers }, query: { next } };
}
function adminRequest(token) {
  return { method: 'GET', path: '/admin/members', headers: token ? { cookie: `fixture_session=${token}` } : {} };
}
function node(root, script) {
  const result = spawnSync(process.execPath, [script], { cwd: root, encoding: 'utf8', timeout: 10000, windowsHide: true });
  assert.ifError(result.error);
  assert.equal(result.signal, null);
  return result;
}
const originals = Object.fromEntries(families.map((family) => [family, snapshot(path.join(fixtureRoot, family))]));
try {
  test('ordinary public tests pass for both source views without writing fixture files', () => {
    for (const [family, testName] of [['auth-redirect-review', 'callback.test.js'], ['admin-guard-review', 'members.test.js']]) {
      withFixture(family, (root) => {
        const before = snapshot(root);
        for (const view of ['base', 'head']) {
          const result = node(root, `${view}/test/${testName}`);
          assert.equal(result.status, 0, result.stderr || result.stdout);
        }
        assert.deepEqual(snapshot(root), before);
      });
    }
  });

  test('logical source comparisons contain only the declared route changes and no claimed Git identity', () => {
    for (const family of families) withFixture(family, (root) => {
      const scenario = read(root, 'scenario.json');
      const base = snapshot(path.join(root, 'base'));
      const head = snapshot(path.join(root, 'head'));
      assert.deepEqual(Object.keys(base), Object.keys(head));
      assert.deepEqual(Object.keys(base).filter((file) => base[file] !== head[file]), scenario.changedFiles);
      assert.equal(scenario.fictional, true);
      assert.equal(scenario.sourceViewIdentifiersAreGitCommits, false);
      assert.equal(scenario.realIdentityProviderConnected, false);
      assert.deepEqual(scenario.modelEvaluation, { status: 'not_run', attempts: 0 });
      assert.equal(scenario.networkExecution, 'not_run');
      assert.equal(fs.existsSync(path.join(root, '.git')), false);
    });
  });

  test('redirect head implements the new permitted destination while the base retains its original default', () => withFixture('auth-redirect-review', (root) => {
    const base = dispatcher(root, 'base');
    const head = dispatcher(root, 'head');
    const configuration = read(root, 'shared/deployment.json');
    assert.equal(base(callbackRequest('/orders')).headers.location, `${configuration.publicOrigin}/account`);
    for (const destination of configuration.allowedRedirectPaths) {
      for (const supplied of [destination, `${configuration.publicOrigin}${destination}`]) {
        const result = head(callbackRequest(supplied));
        assert.equal(result.status, 303);
        assert.equal(result.headers.location, `${configuration.publicOrigin}${destination}`);
      }
    }
    assert.equal(head(callbackRequest(undefined)).headers.location, `${configuration.publicOrigin}/account`);
  }));

  test('attacker-controlled URL forms do not escape the actual redirect validation and allowlist', () => withFixture('auth-redirect-review', (root) => {
    const dispatch = dispatcher(root, 'head');
    const destinations = [
      'https://attacker.example.invalid/collect', '//attacker.example.invalid/collect',
      'http://documents.example.invalid/account', 'javascript:alert(1)', 'data:text/html,example',
      'https://documents.example.invalid.attacker.example.invalid/account',
      'https://documents.example.invalid@attacker.example.invalid/account',
      'https://attacker@documents.example.invalid/account',
      '/account?next=https://attacker.example.invalid', '/account#external',
      '/account?', '/account#', '/account?#',
      '\\attacker.example.invalid\\collect', '/%2f%2fattacker.example.invalid',
      '/account\r\nLocation: https://attacker.example.invalid', '/not-allowed', '',
      ['https://attacker.example.invalid'], { href: 'https://attacker.example.invalid' }, 'x'.repeat(2049)
    ];
    for (const destination of destinations) {
      const request = callbackRequest(destination);
      const before = JSON.stringify(request);
      const response = dispatch(request);
      assert.equal(response.status, 400, JSON.stringify(destination));
      assert.equal(response.headers.location, undefined);
      assert.equal(JSON.stringify(request), before);
    }
  }));

  test('Host and forwarded-origin spoofing cannot replace the pinned deployment origin', () => withFixture('auth-redirect-review', (root) => {
    const dispatch = dispatcher(root, 'head');
    const headers = { host: 'attacker.example.invalid', 'x-forwarded-host': 'attacker.example.invalid', 'x-forwarded-proto': 'http' };
    const permitted = dispatch(callbackRequest('/settings', headers));
    assert.equal(permitted.headers.location, 'https://documents.example.invalid/settings');
    const rejected = dispatch(callbackRequest('https://attacker.example.invalid/settings', headers));
    assert.equal(rejected.status, 400);
    assert.equal(rejected.headers.location, undefined);
  }));

  test('callback authentication and route checks remain separate from destination checks', () => withFixture('auth-redirect-review', (root) => {
    const dispatch = dispatcher(root, 'head');
    for (const cookie of ['', 'fixture_session=unknown', 'fixture_session=__proto__']) {
      assert.equal(dispatch(callbackRequest('/orders', { cookie })).status, 401);
    }
    assert.equal(dispatch({ ...callbackRequest('/orders'), method: 'POST' }).status, 404);
    assert.equal(dispatch({ ...callbackRequest('/orders'), path: '/unregistered' }).status, 404);
  }));

  test('administrator source change removes exactly three lines while ordinary administrator and anonymous outcomes stay stable', () => withFixture('admin-guard-review', (root) => {
    const baseLines = fs.readFileSync(path.join(root, 'base/src/admin-members.js'), 'utf8').replace(/\r\n/g, '\n').split('\n');
    const headLines = fs.readFileSync(path.join(root, 'head/src/admin-members.js'), 'utf8').replace(/\r\n/g, '\n').split('\n');
    let prefix = 0;
    while (prefix < Math.min(baseLines.length, headLines.length) && baseLines[prefix] === headLines[prefix]) prefix += 1;
    let suffix = 0;
    while (suffix < Math.min(baseLines.length, headLines.length) - prefix && baseLines.at(-1 - suffix) === headLines.at(-1 - suffix)) suffix += 1;
    assert.equal(baseLines.length - prefix - suffix, 3);
    assert.equal(headLines.length - prefix - suffix, 0);
    const base = dispatcher(root, 'base');
    const head = dispatcher(root, 'head');
    assert.deepEqual(head(adminRequest('fixture-admin-a')), base(adminRequest('fixture-admin-a')));
    assert.equal(base(adminRequest()).status, 401);
    assert.equal(head(adminRequest()).status, 401);
    assert.equal(head(adminRequest('unknown-session')).status, 401);
  }));

  test('an authenticated nonadministrator reaches protected records at head through the public dispatcher', () => withFixture('admin-guard-review', (root) => {
    const base = dispatcher(root, 'base');
    const head = dispatcher(root, 'head');
    const request = adminRequest('fixture-member-a');
    assert.equal(base(request).status, 403);
    const response = head(request);
    assert.equal(response.status, 200);
    assert.equal(response.body.members.length, 2);
    assert.ok(response.body.members.every((member) => member.organizationId === 'fictional-org-a'));
    assert.ok(response.body.members.every((member) => typeof member.internalNote === 'string'));
    const configuration = read(root, 'shared/deployment.json');
    assert.equal(configuration.applicationVisibility, 'public');
    assert.equal(configuration.edgeRoleFilter, false);
    assert.deepEqual(configuration.additionalAuthorizationMiddleware, []);
  }));

  test('the demonstrated missing role boundary does not imply a missing organization or session boundary', () => withFixture('admin-guard-review', (root) => {
    const base = dispatcher(root, 'base');
    const head = dispatcher(root, 'head');
    const forged = { ...adminRequest('fixture-member-a'), session: { role: 'admin', organizationId: 'fictional-org-b' } };
    assert.equal(base(forged).status, 403);
    const response = head(forged);
    assert.ok(response.body.members.every((member) => member.organizationId === 'fictional-org-a'));
    const otherOrganization = head(adminRequest('fixture-member-b'));
    assert.equal(otherOrganization.body.members.length, 1);
    assert.equal(otherOrganization.body.members[0].organizationId, 'fictional-org-b');
    assert.equal(head({ ...adminRequest('fixture-member-a'), method: 'POST' }).status, 404);
    assert.equal(head({ ...adminRequest('fixture-member-a'), path: '/admin/unknown' }).status, 404);
  }));

  test('reviewer disagreement remains unverified input and all dispatches leave source/session/member fixtures unchanged', () => {
    withFixture('admin-guard-review', (root) => {
      const context = read(root, 'review-context.json');
      assert.equal(context.comments.length, 2);
      assert.equal(new Set(context.comments.map((comment) => comment.reviewer)).size, 2);
      assert.equal(context.statementsVerified, false);
      assert.equal(context.verdict, null);
      for (const comment of context.comments) assert.ok(fs.existsSync(path.join(root, comment.sourceView, comment.path)));
      const before = snapshot(root);
      const dispatch = dispatcher(root, 'head');
      const first = dispatch(adminRequest('fixture-admin-a'));
      first.body.members[0].internalNote = 'Mutation of a returned copy';
      assert.notEqual(dispatch(adminRequest('fixture-admin-a')).body.members[0].internalNote, first.body.members[0].internalNote);
      assert.deepEqual(snapshot(root), before);
    });
    for (const family of families) assert.deepEqual(snapshot(path.join(fixtureRoot, family)), originals[family]);
  });
} finally {
  const resolved = path.resolve(temp);
  if (path.dirname(resolved) !== path.resolve(os.tmpdir()) || !path.basename(resolved).startsWith('craftroster-review-auth-')) throw new Error('Unsafe auth fixture cleanup target');
  fs.rmSync(resolved, { recursive: true, force: true });
}
console.log(`${passed} authorization review author-fixture checks passed; model, network, browser, and real identity-provider results remain not_run.`);
