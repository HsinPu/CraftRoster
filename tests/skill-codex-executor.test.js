'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { EventEmitter } = require('node:events');
const { createCodexExecutor } = require('../scripts/lib/skill-codex-executor');
const { createCodexTransport } = require('../scripts/lib/skill-codex-transport');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const PRIVATE = 'PRIVATE-RAW-OUTPUT-AND-ERROR';
const settle = () => new Promise(resolve => setImmediate(resolve));
const temporaryRoot = fs.realpathSync(os.tmpdir());
const fixture = fs.mkdtempSync(path.join(temporaryRoot, 'craftroster-codex-executor-test-'));
const executable = path.join(fixture, 'codex.exe'), codexHome = path.join(fixture, 'home');
const executableBytes = Buffer.from('author fake executable: never launch this file');
fs.writeFileSync(executable, executableBytes); fs.mkdirSync(codexHome);
fs.writeFileSync(path.join(codexHome, 'auth.json'), 'FAKE AUTH CONTENT MUST NEVER BE READ');
fs.writeFileSync(path.join(codexHome, 'config.toml'), 'FAKE CONFIG CONTENT MUST NEVER BE READ');
const base = { executable, executableSha256: hash(executableBytes), codexHome, model: 'gpt-6-astra', effort: 'low' };
const input = (change = {}) => ({ prompt: 'PUBLIC_DRIVER_REQUEST:\npublic task',
  outputSchema: { type: 'object', properties: { action: { type: 'object' } }, required: ['action'], additionalProperties: false },
  model: base.model, effort: base.effort, signal: new AbortController().signal,
  limits: { max_request_bytes: 1048576, max_stdout_bytes: 262144, max_stderr_bytes: 1024, timeout_ms: 1000 }, ...change });
class FakeChild extends EventEmitter {
  constructor(behavior, ignoreKill = false) {
    super(); this.stdout = new EventEmitter(); this.stderr = new EventEmitter(); this.stdin = new EventEmitter();
    this.kills = []; this.finished = false; this.stdin.end = prompt => { this.prompt = prompt; setImmediate(() => behavior(this)); };
    this.kill = signal => { this.kills.push(signal); if (!ignoreKill) setImmediate(() => this.finish(null)); return true; };
  }
  finish(code = 0) { if (!this.finished) { this.finished = true; this.emit('close', code); } }
  out(name, content) { this[name].emit('data', Buffer.isBuffer(content) ? content : Buffer.from(content)); }
}
function factory(behavior = child => child.finish(), extra = {}, ignoreKill = false) {
  let child, observed;
  const executor = createCodexExecutor({ ...base, spawnImpl(exe, args, options) {
    child = new FakeChild(behavior, ignoreKill); observed = { exe, args, options }; return child;
  }, ...extra });
  return { executor, child: () => child, observed: () => observed };
}
async function rejects(promise, code) { await assert.rejects(promise, error => { assert.equal(error.code, code); assert.equal(error.message, `Codex executor: ${code}`); return true; }); }
let passed = 0;
async function test(name, fn) { await fn(); passed++; console.log('PASS ' + name); }
const usage = { input_tokens: 10, cached_input_tokens: 2, output_tokens: 3 };
const transcript = [{ type: 'thread.started', thread_id: 'fixture' }, { type: 'turn.started' },
  { type: 'item.completed', item: { type: 'agent_message', text: '{"action":{"type":"final","text":"done"}}' } },
  { type: 'turn.completed', usage }].map(JSON.stringify).join('\n');

async function main() {
  await test('construction pins explicit paths and bytes, never starts a process or reads home contents', async () => {
    const read = fs.readFileSync; let calls = 0;
    fs.readFileSync = (filename, ...rest) => { assert.ok(!path.resolve(String(filename)).startsWith(codexHome + path.sep)); return read(filename, ...rest); };
    try {
      const fake = createCodexExecutor({ ...base, spawnImpl: () => { calls++; throw Error('unreachable'); } });
      const native = createCodexExecutor(base); assert.equal(calls, 0);
      assert.equal(fake.inspect().configuration_sha256, native.inspect().configuration_sha256);
      assert.equal(fake.inspect().injected_process, true); assert.equal(native.inspect().injected_process, false);
      assert.equal(fake.inspect().model_execution, false); assert.equal(native.inspect().model_execution, null);
      await fake.close(); await native.close(); assert.equal(calls, 0);
      for (const change of [{ executable: 'codex.exe' }, { codexHome: executable }, { executableSha256: 'a'.repeat(64) },
        { executableSha256: '' }, { model: 'bad\nmodel' }, { effort: 'invented' }, { endpoint: 'https://invalid.example' }, { spawnImpl: true }]) {
        assert.throws(() => createCodexExecutor({ ...base, ...change }));
      }
    } finally { fs.readFileSync = read; }
  });
  await test('launch is fixed ChatGPT/OpenAI with empty workspace, exact schema and sanitized environment', async () => {
    let scratch, schema;
    const f = factory(child => { child.out('stdout', transcript); child.out('stderr', PRIVATE); child.finish(0); });
    const original = input(), writes = [], write = fs.writeFileSync;
    fs.writeFileSync = (filename, ...rest) => { writes.push(path.resolve(String(filename))); return write(filename, ...rest); };
    let result; try { result = await f.executor.executeTurn(original); } finally { fs.writeFileSync = write; }
    const observed = f.observed(); scratch = path.dirname(observed.options.cwd); const args = observed.args;
    schema = args[args.indexOf('--output-schema') + 1];
    assert.equal(observed.exe, executable); assert.equal(observed.options.shell, false); assert.equal(observed.options.windowsHide, true);
    assert.deepEqual(observed.options.stdio, ['pipe','pipe','pipe']); assert.equal(f.child().prompt, original.prompt);
    assert.ok(writes.every(filename => filename.startsWith(scratch + path.sep))); assert.equal(writes.length, 1); assert.equal(writes[0], schema);
    for (const flag of ['--ignore-user-config','--ignore-rules','--strict-config','--ephemeral','--skip-git-repo-check','--json']) assert.ok(args.includes(flag));
    assert.equal(args[args.indexOf('--sandbox') + 1], 'read-only');
    const config = args.flatMap((value, index) => value === '-c' ? [args[index + 1]] : []);
    assert.ok(config.includes('model_provider="openai"')); assert.ok(config.includes('forced_login_method="chatgpt"'));
    assert.ok(config.includes('model="gpt-6-astra"')); assert.ok(config.includes('model_reasoning_effort="low"'));
    assert.ok(config.includes('suppress_unstable_features_warning=true'));
    assert.ok(!config.some(value => /base_url|model_providers\.|max_retries/.test(value)));
    assert.ok(args.includes('skip_host_skill_discovery')); assert.ok(config.some(value => value.startsWith('skills.config=') && value.includes('openai-docs') && value.includes('skill-creator')));
    const env = observed.options.env;
    assert.deepEqual(Object.keys(env).sort(), f.executor.inspect().launch.environment_keys);
    for (const name of Object.keys(env)) assert.ok(!/API_KEY|TOKEN|PROXY|NODE_OPTIONS|PYTHON|GIT_|AUTH/i.test(name));
    assert.equal(env.CODEX_HOME, codexHome); assert.equal(env.PATH, path.join(env.SystemRoot, 'System32'));
    assert.ok(env.TEMP.startsWith(scratch + path.sep)); assert.equal(env.TMP, env.TEMP);
    assert.equal(result.stdout, transcript); assert.equal(result.stderr, PRIVATE); assert.equal(result.exit_code, 0);
    assert.equal(fs.existsSync(scratch), false); assert.ok(fs.existsSync(path.join(codexHome, 'auth.json')));
    const state = f.executor.inspect(); assert.equal(state.in_flight, false); assert.ok(!JSON.stringify(state).includes(PRIVATE));
    assert.ok(!JSON.stringify(state).includes(hash(PRIVATE))); assert.ok(!JSON.stringify(state).includes(hash(transcript)));
    assert.deepEqual(state.attempts[0].cleanup, { child_closed: true, scratch_removed: true }); await f.executor.close();
  });
  await test('schema is copied to only the temporary output-schema path without reading external auth/config', async () => {
    const expected = input(); let observedSchema;
    const read = fs.readFileSync;
    fs.readFileSync = (filename, ...rest) => { assert.ok(!path.resolve(String(filename)).startsWith(codexHome + path.sep)); return read(filename, ...rest); };
    const executor = createCodexExecutor({ ...base, spawnImpl(_exe, args, options) {
      assert.deepEqual(fs.readdirSync(options.cwd), []);
      observedSchema = JSON.parse(fs.readFileSync(args[args.indexOf('--output-schema') + 1], 'utf8'));
      return new FakeChild(child => child.finish());
    } });
    try { await executor.executeTurn(expected); assert.deepEqual(observedSchema, expected.outputSchema); await executor.close(); }
    finally { fs.readFileSync = read; }
  });
  await test('changed executable and invalid requests fail before any spawn', async () => {
    let calls = 0; const executor = createCodexExecutor({ ...base, spawnImpl: () => { calls++; throw Error('unreachable'); } });
    fs.writeFileSync(executable, 'changed executable');
    try { await rejects(executor.executeTurn(input()), 'executable_drift'); } finally { fs.writeFileSync(executable, executableBytes); }
    const cancelled = new AbortController(); cancelled.abort(PRIVATE);
    await rejects(executor.executeTurn(input({ signal: cancelled.signal })), 'cancelled');
    for (const change of [{ model: 'different' }, { effort: 'high' }, { prompt: null }, { signal: null },
      { limits: { ...input().limits, timeout_ms: 0 } }, { limits: { ...input().limits, max_processes: 5 } },
      { outputSchema: { bad: () => {} } }]) await rejects(executor.executeTurn(input(change)), 'invalid_request');
    await rejects(executor.executeTurn(input({ prompt: 'x'.repeat(200), limits: { ...input().limits, max_request_bytes: 100 } })), 'request_bytes');
    assert.equal(calls, 0); assert.equal(executor.inspect().attempts.length, 0); await executor.close();
  });
  await test('stdout overflow and invalid UTF8 are rejected after actual child close', async () => {
    for (const [content, code] of [[Buffer.alloc(101), 'stdout_bytes'], [Buffer.from([0xff]), 'stdout_invalid_utf8']]) {
      const f = factory(child => { child.out('stdout', content); if (content.length < 100) child.finish(); });
      await rejects(f.executor.executeTurn(input({ limits: { ...input().limits, max_stdout_bytes: 100 } })), code);
      assert.equal(f.child().finished, true); assert.equal(f.executor.inspect().in_flight, false);
      assert.equal(f.executor.inspect().attempts[0].cleanup.scratch_removed, true); await f.executor.close();
    }
  });
  await test('stderr overflow or invalid UTF8 preserves complete stdout with a rejected exit status', async () => {
    for (const stderr of [Buffer.alloc(1025), Buffer.from([0xff])]) {
      const f = factory(child => { child.out('stdout', transcript); child.out('stderr', stderr); if (stderr.length < 1000) child.finish(0); });
      const result = await f.executor.executeTurn(input()); assert.equal(result.stdout, transcript); assert.equal(result.stderr, ''); assert.equal(result.exit_code, null);
      assert.equal(f.executor.inspect().attempts[0].status, 'error'); await f.executor.close();
    }
    const f = factory(child => { child.out('stdout', transcript); child.out('stderr', Buffer.alloc(262145)); });
    const t = createCodexTransport({ executeTurn: f.executor.executeTurn, model: base.model, effort: base.effort });
    const requestJson = JSON.stringify({ protocol: 'skill-task-driver-v1', tool_schema: {}, response_schema: {}, turn: 1, write_grants: {}, messages: [{ role: 'user', content: 'public' }] });
    await assert.rejects(t.adapter({ requestJson, signal: new AbortController().signal }), { code: 'process_exit' });
    assert.deepEqual(t.inspect().attempts[0].usage, usage); await f.executor.close();
  });
  await test('cleanup failure preserves complete stdout usage while rejecting the action and reporting retained scratch', async () => {
    const remove = fs.rmSync, retained = [];
    fs.rmSync = (filename, ...rest) => {
      const resolved = path.resolve(String(filename));
      if (path.dirname(resolved) === temporaryRoot && path.basename(resolved).startsWith('craftroster-codex-exec-')) {
        retained.push(resolved); throw Error(PRIVATE);
      }
      return remove(filename, ...rest);
    };
    try {
      const direct = factory(child => { child.out('stdout', transcript); child.out('stderr', PRIVATE); child.finish(0); });
      const result = await direct.executor.executeTurn(input());
      assert.deepEqual(result, { stdout: transcript, stderr: '', exit_code: null });
      const integrated = factory(child => { child.out('stdout', transcript); child.finish(0); });
      const t = createCodexTransport({ executeTurn: integrated.executor.executeTurn, model: base.model, effort: base.effort });
      const requestJson = JSON.stringify({ protocol: 'skill-task-driver-v1', tool_schema: {}, response_schema: {}, turn: 1, write_grants: {}, messages: [{ role: 'user', content: 'public' }] });
      await assert.rejects(t.adapter({ requestJson, signal: new AbortController().signal }), { code: 'process_exit' });
      assert.deepEqual(t.inspect().attempts[0].usage, usage);
      for (const f of [direct, integrated]) {
        const state = f.executor.inspect();
        assert.equal(state.in_flight, false); assert.equal(state.attempts[0].status, 'error');
        assert.equal(state.attempts[0].error_code, 'cleanup_failed');
        assert.deepEqual(state.attempts[0].cleanup, { child_closed: true, scratch_removed: false });
        assert.ok(!JSON.stringify(state).includes(PRIVATE)); assert.ok(!JSON.stringify(state).includes(transcript));
        await f.executor.close();
      }
      assert.equal(retained.length, 2); assert.ok(retained.every(filename => fs.existsSync(filename)));
    } finally {
      fs.rmSync = remove;
      for (const filename of new Set(retained)) {
        assert.equal(fs.realpathSync(filename), filename); assert.equal(path.dirname(filename), temporaryRoot);
        assert.ok(path.basename(filename).startsWith('craftroster-codex-exec-'));
        remove(filename, { recursive: true, force: true });
      }
    }
  });
  await test('spawn exceptions and child errors retain no raw error details or outside writes', async () => {
    const thrown = factory(undefined, { spawnImpl: () => { throw Error(PRIVATE); } });
    await rejects(thrown.executor.executeTurn(input()), 'execution_error'); assert.ok(!JSON.stringify(thrown.executor.inspect()).includes(PRIVATE));
    assert.equal(thrown.executor.inspect().attempts[0].cleanup.scratch_removed, true); await thrown.executor.close();
    const emitted = factory(child => child.emit('error', Error(PRIVATE)));
    const result = await emitted.executor.executeTurn(input()); assert.equal(result.exit_code, null);
    assert.equal(emitted.executor.inspect().attempts[0].error_code, 'spawn_error'); assert.ok(!JSON.stringify(emitted.executor.inspect()).includes(PRIVATE)); await emitted.executor.close();
  });
  await test('abort and close wait for child closure, reject parallel work and ignore late stream data', async () => {
    const f = factory(() => {}, {}, true), controller = new AbortController();
    const running = f.executor.executeTurn(input({ signal: controller.signal })); await settle();
    await rejects(f.executor.executeTurn(input()), 'concurrent_execution'); controller.abort(PRIVATE); await settle();
    assert.equal(f.executor.inspect().in_flight, true); assert.ok(f.child().kills.includes('SIGKILL'));
    f.child().finish(null); await rejects(running, 'cancelled');
    const before = f.executor.inspect(); f.child().out('stdout', PRIVATE); assert.deepEqual(f.executor.inspect(), before);
    assert.equal(before.attempts[0].cleanup.scratch_removed, true); await f.executor.close();
    const closing = factory(() => {}); const pending = closing.executor.executeTurn(input()); await settle();
    const closingResult = closing.executor.close(); await rejects(pending, 'closed'); await closingResult;
    assert.equal(closing.executor.inspect().in_flight, false); await rejects(closing.executor.executeTurn(input()), 'executor_closed');
  });
  await test('execution timeout kills then waits for close and removes only its scratch', async () => {
    const f = factory(() => {});
    await rejects(f.executor.executeTurn(input({ limits: { ...input().limits, timeout_ms: 15 } })), 'timed_out');
    assert.ok(f.child().kills.includes('SIGKILL')); assert.equal(f.child().finished, true);
    assert.deepEqual(f.executor.inspect().attempts[0].cleanup, { child_closed: true, scratch_removed: true }); await f.executor.close();
    let calls = 0; const preSpawn = createCodexExecutor({ ...base, spawnImpl: () => { calls++; throw Error('unreachable'); } });
    const read = fs.readFileSync;
    fs.readFileSync = (filename, ...rest) => {
      if (path.resolve(String(filename)) === executable) { const until = performance.now() + 8; while (performance.now() < until) { /* bounded verification delay */ } }
      return read(filename, ...rest);
    };
    try { await rejects(preSpawn.executeTurn(input({ limits: { ...input().limits, timeout_ms: 5 } })), 'timed_out'); }
    finally { fs.readFileSync = read; }
    assert.equal(calls, 0); assert.equal(preSpawn.inspect().attempts[0].cleanup.scratch_removed, true); await preSpawn.close();
  });
  await test('uncooperative child is reported unresolved after close grace and cleaned only on late close', async () => {
    const f = factory(() => {}, {}, true);
    const running = f.executor.executeTurn(input({ limits: { ...input().limits, timeout_ms: 120000 } })); await settle();
    const outcomes = await Promise.allSettled([running, f.executor.close()]);
    assert.ok(outcomes.every(value => value.status === 'rejected' && value.reason.code === 'close_timeout'));
    const record = f.executor.inspect().attempts[0]; assert.equal(record.error_code, 'close_timeout');
    assert.equal(f.executor.inspect().in_flight, true); assert.deepEqual(record.cleanup, { child_closed: false, scratch_removed: false });
    await rejects(f.executor.executeTurn(input()), 'executor_closed');
    f.child().out('stdout', PRIVATE); f.child().finish(null); await settle();
    const after = f.executor.inspect(); assert.equal(after.in_flight, false); assert.equal(after.attempts[0].error_code, 'close_timeout');
    assert.deepEqual(after.attempts[0].cleanup, { child_closed: true, scratch_removed: true }); assert.ok(!JSON.stringify(after).includes(PRIVATE));
  });
  console.log(`\n${passed} Codex executor tests passed (fake ChildProcess only; no CLI, network or model calls).`);
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => {
  const resolved = fs.realpathSync(fixture);
  assert.equal(path.dirname(resolved), temporaryRoot); assert.ok(path.basename(resolved).startsWith('craftroster-codex-executor-test-'));
  fs.rmSync(resolved, { recursive: true, force: true });
});
