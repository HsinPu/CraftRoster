'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');

// Private author checks. Only this fixed, trusted fixture is executed; no model
// output is loaded. Browser interaction/layout and model eval remain separate.
const canonical = path.resolve(__dirname, '../skills/code-review/evals/fixtures/react-checkout-review');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'craftroster-react-author-'));
const buildRequested = process.argv.includes('--build');
let copies = 0;
let passed = 0;
const read = (root, file) => fs.readFileSync(path.join(root, file), 'utf8');
const json = (root, file) => JSON.parse(read(root, file));
function snapshot(root) {
  const files = {};
  function visit(directory, prefix = '') {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      assert.equal(entry.isSymbolicLink(), false);
      const relative = prefix ? prefix + '/' + entry.name : entry.name;
      if (entry.isDirectory()) visit(path.join(directory, entry.name), relative);
      else files[relative] = crypto.createHash('sha256').update(fs.readFileSync(path.join(directory, entry.name))).digest('hex');
    }
  }
  visit(root);
  return files;
}
function copy() {
  const root = path.join(temp, 'fixture-' + ++copies);
  fs.cpSync(canonical, root, { recursive: true, errorOnExist: true });
  return root;
}
async function test(name, fn) {
  await fn();
  passed += 1;
  console.log('PASS ' + name);
}
function deferredQuotes() {
  const requests = [];
  return {
    requests,
    request(method) {
      return new Promise((resolve, reject) => requests.push({ method, resolve, reject }));
    }
  };
}
function controller(root, variant, api) {
  return require(path.join(root, variant, 'controller.cjs')).createCheckoutController(api.request);
}
async function race(root, variant, oldFails = false) {
  const api = deferredQuotes();
  const checkout = controller(root, variant, api);
  const old = checkout.select('standard');
  const current = checkout.select('express');
  assert.deepEqual(api.requests.map(request => request.method), ['standard', 'express']);
  api.requests[1].resolve({ method: 'express', totalCents: 1800 });
  await current;
  assert.equal(checkout.snapshot().quote.totalCents, 1800);
  if (oldFails) api.requests[0].reject(new Error('Old Standard quote failed'));
  else api.requests[0].resolve({ method: 'standard', totalCents: 1200 });
  await old;
  return checkout;
}
function execute(root, args, timeout = 15000) {
  const result = spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8', timeout, windowsHide: true });
  assert.ifError(result.error);
  assert.equal(result.signal, null);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result;
}

async function main() {
  const before = snapshot(canonical);
  await test('public source views use pinned real React packages and record no unexecuted results', () => {
    const root = copy();
    const manifest = json(root, 'package.json');
    const lock = json(root, 'package-lock.json');
    assert.deepEqual(manifest.dependencies, { react: '19.1.1', 'react-dom': '19.1.1' });
    assert.deepEqual(manifest.devDependencies, { esbuild: '0.25.9' });
    assert.deepEqual(lock.packages[''].dependencies, manifest.dependencies);
    assert.deepEqual(lock.packages[''].devDependencies, manifest.devDependencies);
    for (const [name, version] of Object.entries({ ...manifest.dependencies, ...manifest.devDependencies })) {
      assert.equal(lock.packages['node_modules/' + name].version, version);
    }
    for (const [name, pkg] of Object.entries(lock.packages)) {
      if (!name) continue;
      assert.ok(pkg.resolved.startsWith('https://registry.npmjs.org/'));
      assert.match(pkg.integrity, /^sha512-/);
    }
    for (const variant of ['base', 'head']) {
      assert.match(read(root, variant + '/Checkout.jsx'), /from 'react'/);
      assert.match(read(root, variant + '/Checkout.jsx'), /createCheckoutController\(api\.request\)/);
      assert.match(read(root, variant + '/main.jsx'), /from 'react-dom\/client'/);
      assert.match(read(root, variant + '/main.jsx'), /\.render\(<Checkout \/>\)/);
    }
    const scenario = json(root, 'scenario.json');
    assert.equal(scenario.fictional, true);
    assert.equal(scenario.sourceViewsAreGitCommits, false);
    assert.deepEqual(scenario.modelEvaluation, { status: 'not_run', attempts: 0 });
    assert.deepEqual(scenario.browserEvidence, { status: 'not_run' });
    assert.equal(scenario.externalOrderService, false);
    assert.equal(scenario.paymentService, false);
    for (const file of Object.keys(before)) assert.doesNotMatch(file, /(^|\/)(node_modules|\.build|\.git)(\/|$)|\.tmp$/);
  });
  await test('ordinary sequential error/retry checks pass for both source views', async () => {
    const root = copy();
    const { run } = require(path.join(root, 'shared/test/controller.test.cjs'));
    for (const variant of ['base', 'head']) {
      assert.deepEqual(await run(root, variant), { variant, status: 'passed', scope: 'sequential core controller only; no React DOM or browser execution' });
    }
  });
  await test('new loading states clear quote/order and prevent premature confirmation', async () => {
    const root = copy();
    for (const variant of ['base', 'head']) {
      const api = deferredQuotes();
      const checkout = controller(root, variant, api);
      const first = checkout.select('standard');
      api.requests[0].resolve({ method: 'standard', totalCents: 1200 });
      await first;
      assert.deepEqual(checkout.confirm(), { method: 'standard', totalCents: 1200 });
      const next = checkout.select('express');
      assert.deepEqual(checkout.snapshot(), { method: 'express', status: 'loading', quote: null, error: null, order: null });
      assert.equal(checkout.confirm(), null);
      api.requests[1].resolve({ method: 'express', totalCents: 1800 });
      await next;
      assert.deepEqual(checkout.confirm(), { method: 'express', totalCents: 1800 });
      checkout.dispose();
    }
  });
  await test('out-of-order success reproduces the candidate quote/confirmation mismatch only', async () => {
    const root = copy();
    const base = await race(root, 'base');
    const head = await race(root, 'head');
    assert.deepEqual(base.confirm(), { method: 'express', totalCents: 1800 });
    assert.equal(base.snapshot().quote.method, 'express');
    assert.equal(head.snapshot().method, 'express');
    assert.equal(head.snapshot().quote.method, 'standard');
    assert.deepEqual(head.confirm(), { method: 'express', totalCents: 1200 });
    base.dispose(); head.dispose();
  });
  await test('a superseded error only replaces the candidate current success', async () => {
    const root = copy();
    const base = await race(root, 'base', true);
    const head = await race(root, 'head', true);
    assert.equal(base.snapshot().status, 'ready');
    assert.equal(base.snapshot().error, null);
    assert.equal(head.snapshot().status, 'error');
    assert.equal(head.snapshot().error, 'Old Standard quote failed');
    assert.equal(head.confirm(), null);
    base.dispose(); head.dispose();
  });
  await test('dispose evidence is limited to controller state; neither emits to removed subscribers', async () => {
    const root = copy();
    for (const variant of ['base', 'head']) {
      const api = deferredQuotes();
      const checkout = controller(root, variant, api);
      let calls = 0;
      checkout.subscribe(() => { calls += 1; });
      const pending = checkout.select('standard');
      assert.equal(calls, 1);
      checkout.dispose();
      const disposedState = checkout.snapshot();
      api.requests[0].resolve({ method: 'standard', totalCents: 1200 });
      await pending;
      assert.equal(calls, 1);
      if (variant === 'base') assert.deepEqual(checkout.snapshot(), disposedState);
      else assert.equal(checkout.snapshot().status, 'ready');
    }
  });
  await test('a fixed author repair in a fresh copy removes both race regressions', async () => {
    const root = copy();
    const file = path.join(root, 'head/controller.cjs');
    let source = fs.readFileSync(file, 'utf8');
    const success = '      const quote = await loadQuote(method);\n';
    const failure = '    } catch (error) {\n';
    source = source.replace(/\r\n/g, '\n');
    assert.equal(source.split(success).length, 2);
    assert.equal(source.split(failure).length, 2);
    const guard = '      if (disposed || request !== generation) return;\n';
    fs.writeFileSync(file, source.replace(success, success + guard).replace(failure, failure + guard));
    const successCheckout = await race(root, 'head');
    assert.deepEqual(successCheckout.confirm(), { method: 'express', totalCents: 1800 });
    const errorCheckout = await race(root, 'head', true);
    assert.equal(errorCheckout.snapshot().status, 'ready');
    const { run } = require(path.join(root, 'shared/test/controller.test.cjs'));
    await run(root, 'head');
    successCheckout.dispose(); errorCheckout.dispose();
  });
  await test('the real local timer adapter returns both totals and fails exactly the next request', async () => {
    const root = copy();
    const { createQuoteApi } = require(path.join(root, 'shared/fake-quotes.cjs'));
    const api = createQuoteApi();
    const order = [];
    const [standard, express] = await Promise.all([
      api.request('standard').then(value => { order.push(value.method); return value; }),
      api.request('express').then(value => { order.push(value.method); return value; })
    ]);
    assert.deepEqual(order, ['express', 'standard']);
    assert.deepEqual(standard, { method: 'standard', totalCents: 1200 });
    assert.deepEqual(express, { method: 'express', totalCents: 1800 });
    api.failNext();
    await assert.rejects(api.request('express'), /Quote unavailable/);
    assert.deepEqual(await api.request('express'), express);
    await assert.rejects(api.request('overnight'), /Unknown shipping method/);
  });
  if (buildRequested) {
    await test('fresh npm ci with scripts disabled compiles real React source views in a temp copy', () => {
      const npmCli = process.env.CRAFTROSTER_NPM_CLI || process.env.npm_execpath;
      assert.ok(npmCli && fs.statSync(npmCli).isFile(), 'Set CRAFTROSTER_NPM_CLI to the installed npm CLI .js file for --build');
      const root = copy();
      fs.writeFileSync(path.join(root, 'npm-user-config'), 'registry=https://registry.npmjs.org/\n');
      fs.writeFileSync(path.join(root, 'npm-global-config'), '');
      const lockBefore = fs.readFileSync(path.join(root, 'package-lock.json'));
      execute(root, [npmCli, 'ci', '--ignore-scripts', '--no-audit', '--no-fund', '--userconfig', './npm-user-config', '--globalconfig', './npm-global-config', '--cache', './npm-cache'], 120000);
      assert.deepEqual(fs.readFileSync(path.join(root, 'package-lock.json')), lockBefore);
      assert.equal(json(root, 'node_modules/react/package.json').version, '19.1.1');
      assert.equal(json(root, 'node_modules/react-dom/package.json').version, '19.1.1');
      execute(root, ['tools/build.cjs']);
      for (const variant of ['base', 'head']) {
        const output = '.build/' + variant + '/';
        assert.ok(fs.statSync(path.join(root, output + 'app.js')).size > 100000);
        assert.ok(fs.statSync(path.join(root, output + 'app.css')).size > 0);
        const map = json(root, output + 'app.js.map');
        assert.ok(map.sources.some(source => /node_modules\/react\/cjs\/react/.test(source)));
        assert.ok(map.sources.some(source => /node_modules\/react-dom\/cjs\/react-dom-client/.test(source)));
        assert.ok(map.sources.some(source => source.endsWith(variant + '/Checkout.jsx')));
        assert.ok(map.sources.some(source => source.endsWith(variant + '/controller.cjs')));
        assert.match(read(root, output + 'index.html'), /name="viewport"/);
        assert.match(read(root, output + 'index.html'), /src="\.\/app\.js"/);
      }
    });
  } else {
    console.log('NOT RUN dependency installation/build (opt in with --build and CRAFTROSTER_NPM_CLI)');
  }
  await test('all canonical fixture bytes remain unchanged and no build/dependency artifacts were added', () => {
    assert.deepEqual(snapshot(canonical), before);
    assert.equal(fs.existsSync(path.join(canonical, 'node_modules')), false);
    assert.equal(fs.existsSync(path.join(canonical, '.build')), false);
  });
  console.log(JSON.stringify({ authorChecksPassed: passed, build: buildRequested ? 'passed' : 'not_run', browser: 'not_run', modelEvaluation: 'not_run' }));
}

main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => {
  const resolved = path.resolve(temp);
  assert.equal(path.dirname(resolved), path.resolve(os.tmpdir()));
  assert.ok(path.basename(resolved).startsWith('craftroster-react-author-'));
  fs.rmSync(resolved, { recursive: true, force: true });
});
