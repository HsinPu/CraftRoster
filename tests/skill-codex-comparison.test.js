'use strict';

// Windows historical author suite. Exact proposal bytes and Git history are
// required. Every child below is an in-process fake; no native CLI or model runs.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { EventEmitter } = require('node:events');
const ROOT = path.resolve(__dirname, '..');
const RUNNER = path.join(ROOT, 'docs/audits/skill-optimization-2026-09-16/run-codex-comparison.cjs');
const PROPOSAL = path.join(ROOT, 'docs/audits/skill-optimization-2026-09-16/driver-comparison-proposal.json');
const { preflightComparison, freezeComparison, runComparison } = require(RUNNER);
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const clone = value => JSON.parse(JSON.stringify(value));
const final = text => ({ type: 'final', text });
const read = file => ({ type: 'tool_call', request: { tool: 'read_file', arguments: { path: file, encoding: 'utf8' } } });
const write = content => ({ type: 'tool_call', request: { tool: 'write_file', arguments: { path: 'workspace/locales/en.json', encoding: 'utf8', content } } });
const HIDDEN = 'PRIVATE-REASONING-NOT-PERSISTED';
const usage = { input_tokens: 10, cached_input_tokens: 2, output_tokens: 3 };
function events(action, extra = []) {
  return [{ type: 'thread.started', thread_id: 'fake' }, { type: 'turn.started' },
    { type: 'item.completed', item: { type: 'reasoning', text: HIDDEN } }, ...extra,
    { type: 'item.completed', item: { type: 'agent_message', text: JSON.stringify({ action }) } },
    { type: 'turn.completed', usage }].map(JSON.stringify).join('\n') + '\n';
}
function fakeSpawn(actor) {
  return (exe, args, options) => {
    assert.equal(path.basename(exe), 'codex.exe'); assert.equal(options.shell, false);
    assert.equal(options.windowsHide, true); assert.ok(args.includes('--strict-config'));
    assert.ok(args.includes('forced_login_method="chatgpt"')); assert.ok(args.includes('model_provider="openai"'));
    const child = new EventEmitter(); child.stdin = new EventEmitter(); child.stdout = new EventEmitter(); child.stderr = new EventEmitter();
    let closed = false;
    const finish = code => { if (!closed) { closed = true; child.emit('close', code); } };
    child.kill = () => { setImmediate(() => finish(null)); return true; };
    child.stdin.end = prompt => setImmediate(async () => {
      try {
        const marker = 'PUBLIC_DRIVER_REQUEST:\n';
        const request = JSON.parse(prompt.slice(prompt.indexOf(marker) + marker.length));
        const output = await actor(request, prompt);
        if (closed) return;
        child.stdout.emit('data', Buffer.from(typeof output === 'string' ? output : events(output)));
        finish(0);
      } catch (error) { child.emit('error', error); finish(null); }
    });
    return child;
  };
}
let passed = 0;
async function test(name, fn) { await fn(); passed++; console.log('PASS ' + name); }
async function rejects(fn, code) { await assert.rejects(fn, error => error.code === code); }
async function main() {
  const scratch = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), 'craftroster-codex-comparison-test-'));
  try {
    const executable = path.join(scratch, 'codex.exe'), codexHome = path.join(scratch, 'home');
    const executableBytes = Buffer.from('FAKE EXECUTABLE NEVER LAUNCH'); fs.writeFileSync(executable, executableBytes); fs.mkdirSync(codexHome);
    const settings = { model: 'gpt-6-astra', effort: 'low', executable, executableSha256: hash(executableBytes), codexHome };
    const original = await preflightComparison(settings), originalProposalHash = hash(fs.readFileSync(PROPOSAL));
    const sourceRoot = path.join(scratch, 'source'); fs.mkdirSync(sourceRoot);
    for (const file of original.binding.sources) {
      const target = path.join(sourceRoot, file.path); fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.copyFileSync(path.join(ROOT, file.path), target);
    }
    const proposalPath = path.join(scratch, 'proposal.json'); fs.copyFileSync(PROPOSAL, proposalPath);
    const local = { ...settings, sourceRoot, proposalPath }, manifest = await preflightComparison(local);
    assert.deepEqual(manifest, original);
    const run = (actor, extra = {}) => runComparison({ ...local, manifest, spawnImpl: fakeSpawn(actor), ...extra });
    const localePath = path.join(sourceRoot, 'skills/code-change-workflow/evals/fixtures/locale-label/locales/en.json');
    const localeOriginal = fs.readFileSync(localePath);
    await test('preflight binds exact order, owner-only differences, grants and honest process limits', async () => {
      assert.equal(manifest.execution_authorized, false); assert.equal(manifest.status, 'not_run');
      assert.equal(manifest.binding.proposal_sha256, originalProposalHash);
      assert.deepEqual(manifest.binding.order.map(x => x.variant), ['baseline','candidate','candidate','baseline']);
      assert.deepEqual(manifest.binding.runtime, { node: process.version, platform: process.platform, arch: process.arch });
      assert.match(manifest.binding.executor_configuration_sha256, /^[a-f0-9]{64}$/);
      assert.equal(manifest.binding.transport_limits.max_processes, 48); assert.equal(manifest.binding.driver_limits.max_adapter_turns, 12);
      assert.equal(manifest.binding.driver_limits.timeout_ms, 60000); assert.equal(manifest.binding.provider_requests_enforced, false);
      assert.equal(manifest.binding.provider_requests, null); assert.equal(manifest.binding.max_output_tokens, null); assert.equal(manifest.cost, null);
      for (const item of manifest.binding.cases) {
        const [base, candidate] = item.variants;
        assert.deepEqual(base.public_manifest.filter((f, i) => f.sha256 !== candidate.public_manifest[i].sha256).map(f => f.path), [base.owner.path]);
        assert.equal(base.toolset_sha256, candidate.toolset_sha256); assert.equal(base.private_checks_sha256, candidate.private_checks_sha256);
      }
      assert.deepEqual(manifest.binding.cases.map(x => x.policy), [{ writable_paths: ['workspace/locales/en.json'] }, {}]);
    });
    await test('configuration and new-file freeze reject overrides without spawning', async () => {
      await rejects(() => preflightComparison({ ...settings, model: 'other' }), 'fixed_model_configuration');
      await rejects(() => preflightComparison({ ...settings, effort: undefined }), 'explicit_model_and_effort_required');
      await rejects(() => preflightComparison({ ...settings, limits: {} }), 'invalid_options');
      await rejects(() => run(() => { throw Error('must not spawn'); }, { order: [] }), 'invalid_options');
      const outputPath = path.join(scratch, 'frozen.json');
      assert.deepEqual(await freezeComparison({ ...local, outputPath }), manifest);
      await rejects(() => freezeComparison({ ...local, outputPath }), 'new_output_path_required');
    });
    await test('four fake trials exercise executor, transport and broker without leaking private rubric', async () => {
      let trial = -1, calls = 0; const owners = [], firstInputs = [];
      const rubrics = JSON.parse(fs.readFileSync(PROPOSAL)).cases.flatMap(x => x.private_rubric);
      const result = await run((request, prompt) => {
        calls++; assert(!prompt.includes('PRIVATE-COMPARISON-RUBRIC')); assert(rubrics.every(text => !prompt.includes(text)));
        if (request.turn === 1) { trial++; firstInputs.push(JSON.stringify(request)); }
        const locale = trial < 2;
        if (request.turn === 1) return read(locale ? 'skills/code-change-workflow/SKILL.md' : 'skills/verified-software-delivery/SKILL.md');
        if (request.turn === 2) {
          owners.push(request.messages.at(-1).content.sha256);
          return locale ? write('{"auth":{"signIn":"Log in"}}\n') : final('Staging B evidence is not_run; readiness incomplete.');
        }
        return final('Locale updated; no browser verification performed.');
      });
      assert.equal(calls, 10); assert.equal(result.report.executor_invocations, 10);
      assert.deepEqual(owners, manifest.binding.order.map(o => manifest.binding.cases.find(c => c.case_id === o.case_id).variants.find(v => v.variant === o.variant).owner.sha256));
      assert.equal(firstInputs[0], firstInputs[1]); assert.equal(firstInputs[2], firstInputs[3]);
      assert.equal(result.report.run_status, 'completed'); assert.equal(result.report.status, 'not_run');
      assert.equal(result.report.model_execution, false); assert.equal(result.report.model_calls, 0); assert.equal(result.report.task_outcome, 'unverified');
      assert.equal(result.report.provider_requests, null); assert.equal(result.report.activation_observed, false);
      assert.equal(result.report.executor.in_flight, false); assert.equal(result.report.executor.closed, true);
      assert(result.report.executor.attempts.every(a => a.cleanup.child_closed && a.cleanup.scratch_removed));
      assert(result.report.trials.every(t => t.run_status === 'completed' && t.manual_rubric.status === 'unverified'));
      assert.equal(result.report.transport.attempts.reduce((n, a) => n + a.usage.output_tokens, 0), 30);
      assert.deepEqual(result.report.trials.map(t => t.attempt_numbers), [[1,2,3],[4,5,6],[7,8],[9,10]]);
      assert(!JSON.stringify(result).includes(HIDDEN)); assert(!JSON.stringify(result).includes('PRIVATE-COMPARISON-RUBRIC'));
      for (const artifact of result.artifacts.slice(0, 2)) assert.deepEqual(JSON.parse(artifact.files.find(f => f.path === 'workspace/locales/en.json').content), { auth: { signIn: 'Log in' } });
    });
    await test('native tool events stop later trials and retain known usage', async () => {
      const result = await run(() => events(final('discarded'), [{ type: 'item.completed', item: { type: 'command_execution', command: HIDDEN } }]));
      assert.equal(result.report.executor_invocations, 1); assert.equal(result.report.run_status, 'stopped');
      assert.deepEqual(result.report.transport.attempts[0].usage, usage);
      assert(result.report.trials.slice(1).every(t => t.run_status === 'not_run'));
      assert(!JSON.stringify(result).includes(HIDDEN));
    });
    await test('a later error preserves completed trials and the shared attempt ledger', async () => {
      let calls = 0;
      const result = await run(() => ++calls === 1 ? final('No edit claimed.') : events({ type: 'final', text: null }));
      assert.equal(result.report.executor_invocations, 2);
      assert.deepEqual(result.report.trials.map(t => t.run_status), ['completed','error','not_run','not_run']);
      assert.deepEqual(result.report.transport.attempts.map(a => a.attempt), [1,2]);
      assert.deepEqual(result.report.transport.attempts[1].usage, usage);
    });
    await test('source/proposal/manifest/executable drift fail before any process', async () => {
      let calls = 0; const actor = () => { calls++; return final('unreachable'); };
      fs.writeFileSync(localePath, '{}');
      try { await rejects(() => run(actor), 'source_drift'); } finally { fs.writeFileSync(localePath, localeOriginal); }
      fs.appendFileSync(proposalPath, '\n');
      try { await rejects(() => run(actor), 'proposal_drift'); } finally { fs.copyFileSync(PROPOSAL, proposalPath); }
      for (const alter of [m => m.binding.order.reverse(), m => { m.binding.runtime.node = 'v0'; }, m => { m.binding.cases[1].policy = { writable_roots: ['workspace/'] }; }]) {
        const forged = clone(manifest); alter(forged); await rejects(() => run(actor, { manifest: forged }), 'manifest_drift');
      }
      fs.writeFileSync(executable, 'changed');
      try { await assert.rejects(() => run(actor)); } finally { fs.writeFileSync(executable, executableBytes); }
      assert.equal(calls, 0);
    });
    await test('source drift during output blocks a virtual write while preserving usage', async () => {
      try {
        const result = await run(() => { fs.writeFileSync(localePath, '{}'); return write('{"auth":{"signIn":"Log in"}}'); });
        assert.equal(result.report.stopped_reason, 'source_drift'); assert.equal(result.report.executor_invocations, 1);
        assert.deepEqual(result.report.transport.attempts[0].usage, usage);
        assert.equal(result.report.trials[0].driver_report.artifact_grading.status, 'not_run');
        assert.equal(result.artifacts[0].files.find(f => f.path === 'workspace/locales/en.json').sha256, hash(localeOriginal));
      } finally { fs.writeFileSync(localePath, localeOriginal); }
    });
    await test('pre-abort invokes no process; in-flight cancellation keeps partial artifact and unknown usage', async () => {
      const pre = new AbortController(); pre.abort(); let calls = 0;
      const stopped = await run(() => { calls++; }, { signal: pre.signal });
      assert.equal(calls, 0); assert.equal(stopped.report.stopped_reason, 'cancelled');
      assert(stopped.report.trials.every(t => t.run_status === 'not_run'));
      const active = new AbortController();
      const result = await run(() => { calls++; if (calls === 1) return write('{"auth":{"signIn":"Log in"}}'); active.abort(); return new Promise(() => {}); }, { signal: active.signal });
      assert.equal(calls, 2); assert.equal(result.report.trials[0].run_status, 'cancelled');
      assert.equal(result.report.transport.attempts[1].usage, null); assert.equal(result.report.usage_complete, false);
      assert.equal(result.report.executor.in_flight, false); assert(result.report.executor.attempts.every(a => a.cleanup.scratch_removed));
      assert.equal(result.artifacts[0].files.find(f => f.path === 'workspace/locales/en.json').content, '{"auth":{"signIn":"Log in"}}');
    });
    await test('canonical source bytes and frozen caller manifest remain unchanged', async () => {
      assert.deepEqual(manifest, original); assert.equal(hash(fs.readFileSync(PROPOSAL)), originalProposalHash);
      for (const file of original.binding.sources) assert.equal(hash(fs.readFileSync(path.join(ROOT, file.path))), file.sha256);
    });
  } finally {
    const resolved = path.resolve(scratch);
    assert.equal(path.dirname(resolved), fs.realpathSync(os.tmpdir()));
    assert(path.basename(resolved).startsWith('craftroster-codex-comparison-test-'));
    fs.rmSync(resolved, { recursive: true, force: true });
  }
  console.log(`${passed} Codex comparison author tests passed; 0 native CLI/model calls.`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
