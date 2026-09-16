'use strict';

// Historical author suite: requires this proposal's exact raw source bytes and
// Git baseline. Deliberately fails (never skips) on drift/shallow checkout. Every
// transport call below is an authored in-process fake; no network/model runs.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { performance } = require('node:perf_hooks');
const ROOT = path.resolve(__dirname, '..');
const RUNNER = path.join(ROOT, 'docs/audits/skill-optimization-2026-09-16/run-responses-comparison.cjs');
const PROPOSAL = path.join(ROOT, 'docs/audits/skill-optimization-2026-09-16/driver-comparison-proposal.json');
const { preflightComparison, freezeComparison, runComparison } = require(RUNNER);
const MODEL = 'author-fixture-model', EFFORT = 'low';
const KEY = 'sk-FAKE-COMPARISON-KEY-NO-SERVICE';
const HIDDEN = 'PRIVATE-PROVIDER-REASONING-SENTINEL';
const endpoint = 'https://api.openai.com/v1/responses';
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const clone = value => JSON.parse(JSON.stringify(value));
const final = text => ({ type: 'final', text });
const read = file => ({ type: 'tool_call', request: { tool: 'read_file', arguments: { path: file, encoding: 'utf8' } } });
const write = (content, encoding = 'utf8') => ({ type: 'tool_call', request: { tool: 'write_file', arguments: { path: 'workspace/locales/en.json', encoding, content } } });
function provider(action) {
  return { object: 'response', status: 'completed', model: MODEL, store: false, reasoning: { effort: EFFORT },
    output: [{ type: 'reasoning', summary: [{ text: HIDDEN }] }, { type: 'message', role: 'assistant', status: 'completed',
      content: [{ type: 'output_text', text: JSON.stringify({ action }), annotations: [] }] }],
    usage: { input_tokens: 10, output_tokens: 3, total_tokens: 13 } };
}
function response(value) {
  return { status: 200, url: endpoint, redirected: false, headers: { get: name => name === 'content-type' ? 'application/json' : HIDDEN },
    body: new ReadableStream({ start(controller) { controller.enqueue(Buffer.from(JSON.stringify(value))); controller.close(); } }) };
}
let passed = 0;
async function test(name, fn) { await fn(); passed++; console.log(`PASS ${name}`); }
async function rejects(fn, code) { await assert.rejects(fn, error => error.code === code); }

async function main() {
  const originalProposalHash = hash(fs.readFileSync(PROPOSAL));
  const settings = { model: MODEL, effort: EFFORT };
  const original = await preflightComparison(settings);
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'craftroster-comparison-author-'));
  const sourceRoot = path.join(scratch, 'source'); fs.mkdirSync(sourceRoot);
  for (const file of original.binding.sources) {
    const target = path.join(sourceRoot, file.path); fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, fs.readFileSync(path.join(ROOT, file.path)));
  }
  const proposalPath = path.join(scratch, 'proposal.json'); fs.copyFileSync(PROPOSAL, proposalPath);
  const local = { ...settings, sourceRoot, proposalPath };
  const manifest = await preflightComparison(local);
  assert.deepEqual(manifest, original);
  const run = (fetchImpl, extra = {}) => runComparison({ ...local, manifest, apiKey: KEY, fetchImpl, ...extra });
  const localePath = path.join(sourceRoot, 'skills/code-change-workflow/evals/fixtures/locale-label/locales/en.json');
  const localeOriginal = fs.readFileSync(localePath);
  try {
    await test('explicit model/effort/transport are required; caller cannot override limits or order', async () => {
      await rejects(() => preflightComparison({ model: MODEL }), 'explicit_model_and_effort_required');
      await rejects(() => preflightComparison({ effort: EFFORT }), 'explicit_model_and_effort_required');
      await rejects(() => preflightComparison({ ...settings, limits: { max_requests: 999 } }), 'invalid_options');
      await rejects(() => runComparison({ ...local, manifest, apiKey: KEY }), 'explicit_transport_required');
      await rejects(() => run(async () => { throw Error('must not call'); }, { order: [] }), 'invalid_options');
    });
    await test('concrete manifest preserves proposal, order, grants and owner-only differences', async () => {
      assert.equal(manifest.execution_authorized, false); assert.equal(manifest.status, 'not_run');
      assert.equal(manifest.manual_rubric_status, 'unverified'); assert.equal(manifest.cost, null);
      assert.equal(manifest.binding.proposal_sha256, originalProposalHash);
      assert.deepEqual(manifest.binding.runtime, { node: process.version, platform: process.platform, arch: process.arch });
      assert.deepEqual(manifest.binding.order.map(value => value.variant), ['baseline','candidate','candidate','baseline']);
      assert.equal(manifest.binding.transport_limits.max_requests, 48);
      assert.equal(manifest.binding.driver_limits.max_adapter_turns, 12);
      assert.equal(manifest.binding.driver_limits.timeout_ms, 60000);
      assert.equal(manifest.binding.transport_limits.max_output_tokens, 2048);
      for (const item of manifest.binding.cases) {
        const [base, candidate] = item.variants;
        const changed = base.public_manifest.filter((file, index) => file.sha256 !== candidate.public_manifest[index].sha256);
        assert.deepEqual(changed.map(file => file.path), [base.owner.path]);
        assert.equal(base.toolset_sha256, candidate.toolset_sha256);
        assert.equal(base.tool_policy_sha256, candidate.tool_policy_sha256);
        assert.equal(base.private_checks_sha256, candidate.private_checks_sha256);
      }
      assert.deepEqual(manifest.binding.cases.map(value => value.policy), [{ writable_paths: ['workspace/locales/en.json'] }, {}]);
    });
    await test('freeze writes only a new caller path and never overwrites', async () => {
      const outputPath = path.join(scratch, 'freeze.json');
      assert.deepEqual(await freezeComparison({ ...local, outputPath }), manifest);
      assert.deepEqual(JSON.parse(fs.readFileSync(outputPath)), manifest);
      await rejects(() => freezeComparison({ ...local, outputPath }), 'new_output_path_required');
      await rejects(() => freezeComparison({ ...local, outputPath: PROPOSAL }), 'new_output_path_required');
    });
    await test('real driver completes four ordered fake trials; private material/hidden reasoning/key stay out', async () => {
      let trialIndex = -1, calls = 0;
      const observedOwners = [], firstInputs = [];
      const privateRubric = JSON.parse(fs.readFileSync(PROPOSAL)).cases.flatMap(value => value.private_rubric);
      const result = await run(async (url, init) => {
        assert.equal(url, endpoint); assert.equal(init.redirect, 'error'); calls++;
        const body = JSON.parse(init.body), request = JSON.parse(body.input);
        assert.equal(body.model, MODEL); assert.equal(body.reasoning.effort, EFFORT);
        assert.deepEqual(body.tools, []); assert.equal(body.tool_choice, 'none'); assert.equal(body.max_output_tokens, 2048);
        assert(!init.body.includes(KEY)); assert(!init.body.includes('PRIVATE-COMPARISON-RUBRIC'));
        assert(privateRubric.every(text => !init.body.includes(text)));
        if (request.turn === 1) { trialIndex++; firstInputs.push(body.input); }
        const locale = trialIndex < 2;
        if (request.turn === 1) return response(provider(read(locale ? 'skills/code-change-workflow/SKILL.md' : 'skills/verified-software-delivery/SKILL.md')));
        if (request.turn === 2) {
          observedOwners.push(request.messages.at(-1).content.sha256);
          return response(provider(read(locale ? 'workspace/locales/en.json' : 'workspace/evidence/staging-B-smoke.json')));
        }
        if (locale && request.turn === 3) return response(provider(write('{"auth":{"signIn":"Log in"}}\n')));
        return response(provider(final(locale ? 'Locale updated. No browser verification performed.' : 'Required staging B smoke remains not_run; readiness is incomplete.')));
      });
      assert.equal(calls, 14); assert.equal(result.report.fetch_invocations, 14);
      assert.deepEqual(observedOwners, manifest.binding.order.map(order => manifest.binding.cases.find(c => c.case_id === order.case_id).variants.find(v => v.variant === order.variant).owner.sha256));
      assert.equal(firstInputs[0], firstInputs[1]); assert.equal(firstInputs[2], firstInputs[3]);
      assert.equal(result.report.run_status, 'completed'); assert.equal(result.report.status, 'not_run');
      assert.equal(result.report.model_execution, null); assert.equal(result.report.activation_observed, false);
      assert.equal(result.report.task_outcome, 'unverified'); assert.equal(result.report.cost, null);
      assert(result.report.trials.every(t => t.run_status === 'completed' && t.driver_report.artifact_grading.status === 'unverified' && t.manual_rubric.status === 'unverified'));
      assert.equal(result.report.transport.requests_reserved, 14);
      assert.equal(result.report.transport.attempts.reduce((sum, x) => sum + x.usage.total_tokens, 0), 182);
      for (const trial of result.artifacts.slice(0, 2)) assert.deepEqual(JSON.parse(trial.files.find(f => f.path === 'workspace/locales/en.json').content), { auth: { signIn: 'Log in' } });
      const serialized = JSON.stringify(result);
      assert(!serialized.includes(KEY)); assert(!serialized.includes(HIDDEN)); assert(!serialized.includes('PRIVATE-COMPARISON-RUBRIC'));
    });
    await test('shared cap permits exactly 48 attempts with monotonic numbering across trials', async () => {
      const result = await run(async (_url, init) => {
        const request = JSON.parse(JSON.parse(init.body).input);
        return response(provider(request.turn === 12 ? final('No runtime verification claimed.') : read('task.txt')));
      });
      assert.equal(result.report.fetch_invocations, 48); assert.equal(result.report.transport.requests_reserved, 48);
      assert.equal(result.report.transport.requests_remaining, 0);
      assert.deepEqual(result.report.trials.map(t => t.attempt_numbers.length), [12,12,12,12]);
      assert.deepEqual(result.report.trials[1].attempt_numbers, Array.from({ length: 12 }, (_, index) => index + 13));
      assert.equal(result.report.run_status, 'completed'); // Failed locale artifacts are outcomes, not transport failures.
      assert.equal(result.report.trials[0].driver_report.artifact_grading.status, 'failed');
    });
    await test('turn exhaustion stops later trials and retains attempted usage', async () => {
      const result = await run(async () => response(provider(read('task.txt'))));
      assert.equal(result.report.fetch_invocations, 12);
      assert.equal(result.report.trials[0].run_status, 'limit_exceeded');
      assert(result.report.trials.slice(1).every(t => t.run_status === 'not_run' && t.driver_report === null));
      assert.equal(result.report.trials[0].driver_report.artifact_grading.status, 'not_run');
      assert.equal(result.report.transport.attempts.length, 12);
    });
    await test('first HTTP failure stops all remaining trials with unknown usage and no retry', async () => {
      let calls = 0;
      const result = await run(async () => { calls++; return { status: 500, url: endpoint, body: { getReader() { throw Error('body must not be read'); } } }; });
      assert.equal(calls, 1); assert.equal(result.report.transport.attempts[0].error_code, 'http_error');
      assert.equal(result.report.transport.attempts[0].usage, null); assert.equal(result.report.usage_complete, false);
      assert(result.report.trials.slice(1).every(t => t.run_status === 'not_run'));
    });
    await test('failure after an earlier completed trial keeps the shared ledger and not_run denominator', async () => {
      let calls = 0;
      const result = await run(async () => { calls++; if (calls === 1) return response(provider(final('Incomplete edit acknowledged.')));
        const value = provider(final('discarded')); value.status = 'incomplete'; value.incomplete_details = { reason: HIDDEN }; return response(value); });
      assert.equal(calls, 2); assert.deepEqual(result.report.trials.map(t => t.run_status), ['completed','error','not_run','not_run']);
      assert.deepEqual(result.report.transport.attempts.map(a => a.attempt), [1,2]);
      assert.equal(result.report.transport.attempts[1].usage.total_tokens, 13);
      assert.equal(result.report.transport.attempts[1].error_code, 'response_not_completed');
      assert(!JSON.stringify(result).includes(HIDDEN));
    });
    await test('preflight detects public source drift before any fetch', async () => {
      let calls = 0; fs.writeFileSync(localePath, '{"auth":{"signIn":"changed"}}');
      try { await rejects(() => run(async () => { calls++; }), 'source_drift'); assert.equal(calls, 0); }
      finally { fs.writeFileSync(localePath, localeOriginal); }
    });
    await test('proposal drift and forged manifest grants/order reject before fetch', async () => {
      let calls = 0; const fetchImpl = async () => { calls++; };
      fs.appendFileSync(proposalPath, '\n');
      try { await rejects(() => run(fetchImpl), 'proposal_drift'); } finally { fs.copyFileSync(PROPOSAL, proposalPath); }
      const forged = clone(manifest); forged.binding.cases[1].policy = { writable_roots: ['workspace/'] };
      await rejects(() => run(fetchImpl, { manifest: forged }), 'manifest_drift');
      const reordered = clone(manifest); reordered.binding.order.reverse();
      await rejects(() => run(fetchImpl, { manifest: reordered }), 'manifest_drift');
      const wrongRuntime = clone(manifest); wrongRuntime.binding.runtime.node = 'v0.0.0';
      wrongRuntime.binding_sha256 = hash(JSON.stringify(wrongRuntime.binding));
      await rejects(() => run(fetchImpl, { manifest: wrongRuntime }), 'manifest_drift');
      assert.equal(calls, 0);
    });
    await test('source changes during a response invalidate grading but preserve usage and partial evidence', async () => {
      let calls = 0;
      try {
        const result = await run(async () => { calls++; fs.writeFileSync(localePath, '{}'); return response(provider(final('Cannot be accepted after drift.'))); });
        assert.equal(calls, 1); assert.equal(result.report.stopped_reason, 'source_drift');
        assert.equal(result.report.transport.attempts[0].usage.total_tokens, 13);
        assert.equal(result.report.trials[0].artifact_grading_eligible, false);
        assert.equal(result.report.trials[0].driver_report.artifact_grading.status, 'not_run');
        assert(result.report.trials.slice(1).every(t => t.run_status === 'not_run'));
      } finally { fs.writeFileSync(localePath, localeOriginal); }
    });
    await test('pre-abort makes zero fetches and keeps every trial not_run', async () => {
      const controller = new AbortController(); controller.abort(); let calls = 0;
      const result = await run(async () => { calls++; }, { signal: controller.signal });
      assert.equal(calls, 0); assert.equal(result.report.stopped_reason, 'cancelled');
      assert(result.report.trials.every(t => t.run_status === 'not_run'));
    });
    await test('cancellation retains accepted writes and uncertain second attempt without continuing', async () => {
      const controller = new AbortController(); let calls = 0;
      const result = await run(async () => { calls++; if (calls === 1) return response(provider(write('{"auth":{"signIn":"Log in"}}')));
        controller.abort(); return new Promise(() => {}); }, { signal: controller.signal });
      assert.equal(calls, 2); assert.equal(result.report.trials[0].run_status, 'cancelled');
      assert.equal(result.report.transport.requests_reserved, 2); assert.equal(result.report.transport.attempts[1].usage, null);
      assert.equal(result.report.usage_complete, false);
      assert.equal(result.artifacts[0].files.find(f => f.path === 'workspace/locales/en.json').content, '{"auth":{"signIn":"Log in"}}');
      assert(result.report.trials.slice(1).every(t => t.run_status === 'not_run'));
    });
    await test('elapsed trial deadline stops later trials without extending the frozen 60-second limit', async () => {
      const own = Object.getOwnPropertyDescriptor(performance, 'now'), now = performance.now.bind(performance); let advance = 0;
      Object.defineProperty(performance, 'now', { configurable: true, value: () => now() + advance });
      try {
        const result = await run(async () => { advance = 60001; return response(provider(final('late'))); });
        assert.equal(result.report.fetch_invocations, 1); assert.equal(result.report.trials[0].run_status, 'timed_out');
        assert(result.report.trials.slice(1).every(t => t.run_status === 'not_run'));
        assert.equal(result.report.trials[0].driver_report.artifact_grading.status, 'not_run');
      } finally { if (own) Object.defineProperty(performance, 'now', own); else delete performance.now; }
    });
    await test('binary partial artifact is encoded as base64 data without code execution', async () => {
      let calls = 0;
      const result = await run(async () => { calls++; return calls === 1 ? response(provider(write('/wAA', 'base64'))) : { status: 500, url: endpoint }; });
      const file = result.artifacts[0].files.find(f => f.path === 'workspace/locales/en.json');
      assert.equal(file.encoding, 'base64'); assert.equal(file.content, '/wAA'); assert.equal(file.bytes, 3);
      assert.equal(file.sha256, hash(Buffer.from('/wAA', 'base64')));
    });
    await test('stale cached transport exports are ignored without replacing the caller cache', async () => {
      const transportPath = require.resolve('../scripts/lib/skill-responses-transport');
      const prior = require.cache[transportPath], runnerPrior = require.cache[RUNNER];
      const sentinel = { exports: { createResponsesTransport() { throw Error('STALE-CACHED-CODE'); } } };
      require.cache[transportPath] = sentinel; delete require.cache[RUNNER];
      try {
        const fresh = require(RUNNER), freshManifest = await fresh.preflightComparison(local);
        const result = await fresh.runComparison({ ...local, manifest: freshManifest, apiKey: KEY, fetchImpl: async () => response(provider(final('manual only'))) });
        assert.equal(result.report.fetch_invocations, 4); assert.equal(require.cache[transportPath], sentinel);
      } finally { if (prior) require.cache[transportPath] = prior; else delete require.cache[transportPath]; require.cache[RUNNER] = runnerPrior; }
    });
    await test('caller manifest and canonical raw sources remain unchanged', async () => {
      assert.deepEqual(manifest, original);
      assert.equal(hash(fs.readFileSync(PROPOSAL)), originalProposalHash);
      for (const file of original.binding.sources) assert.equal(hash(fs.readFileSync(path.join(ROOT, file.path))), file.sha256);
      assert.equal(fs.readFileSync(localePath).equals(localeOriginal), true);
    });
  } finally {
    const target = path.resolve(scratch);
    if (path.dirname(target) !== path.resolve(os.tmpdir()) || !path.basename(target).startsWith('craftroster-comparison-author-')) throw Error('Unsafe test cleanup');
    fs.rmSync(target, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
  }
  console.log(`${passed} Responses comparison author checks passed; all fetch implementations were local fakes; no model or network call.`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
