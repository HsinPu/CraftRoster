'use strict';
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { createCodexTransport, DEFAULT_LIMITS, CEILINGS } = require('../scripts/lib/skill-codex-transport');
const { runTaskTrial } = require('../scripts/lib/skill-task-driver');
const PRIVATE = 'PRIVATE-RUBRIC-DO-NOT-SEND';
const HIDDEN = 'HIDDEN-REASONING-DO-NOT-PERSIST';
const hash = text => crypto.createHash('sha256').update(text).digest('hex');
const clone = value => JSON.parse(JSON.stringify(value));
const settle = () => new Promise(resolve => setImmediate(resolve));
const final = text => ({ type: 'final', text });
const tool = (name, args) => ({ type: 'tool_call', request: { tool: name, arguments: args } });
const usage = { input_tokens: 10, cached_input_tokens: 4, output_tokens: 3 };
const request = () => JSON.stringify({ protocol: 'skill-task-driver-v1', tool_schema: {}, response_schema: {}, turn: 1,
  write_grants: { writable_paths: ['workspace/result.json'], writable_roots: [] },
  messages: [{ role: 'user', content: { task: 'Write the result.', skill_catalog: '{"skills":[]}' } }] });
const args = (requestJson = request(), controller = new AbortController()) => ({ requestJson, signal: controller.signal });
const message = action => ({ type: 'item.completed', item: { id: 'item_1', type: 'agent_message', text: JSON.stringify({ action }) } });
const events = (action = final('Done.'), extra = []) => [{ type: 'thread.started', thread_id: 'thread_fixture' },
  { type: 'turn.started' }, ...extra, message(action), { type: 'turn.completed', usage }];
const result = (items = events(), extra = {}) => ({ stdout: items.map(item => typeof item === 'string' ? item : JSON.stringify(item)).join('\n') + '\n',
  stderr: '', exit_code: 0, ...extra });
const transport = (executeTurn, extra = {}) => createCodexTransport({ executeTurn, model: 'fixture-requested-model', effort: 'low', ...extra });
const first = instance => instance.inspect().attempts[0];
async function rejects(promise, code) { await assert.rejects(promise, error => {
  assert.equal(error.code, code); assert.equal(error.message, `Codex transport: ${code}`); return true;
}); }
let passed = 0;
async function test(name, fn) { await fn(); passed++; console.log('PASS ' + name); }

async function main() {
  await test('execution injection, requested settings and fixed resource ceilings are explicit', async () => {
    const good = { executeTurn: async () => result(), model: 'fixture-model', effort: 'low' };
    for (const change of [{ executeTurn: undefined }, { model: undefined }, { effort: undefined }, { model: 'bad\nmodel' },
      { effort: 'invented' }, { credentials: 'forbidden' }, { limits: null }, { limits: { max_processes: 0 } },
      { limits: { max_processes: CEILINGS.max_processes + 1 } }, { limits: { max_requests: 1 } }, { limits: { timeout_ms: NaN } }]) {
      assert.throws(() => createCodexTransport({ ...good, ...change }), { code: 'invalid_configuration' });
    }
    assert.deepEqual(transport(good.executeTurn).inspect().limits, DEFAULT_LIMITS);
  });
  await test('only public request and fixed virtual protocol cross the execution boundary', async () => {
    let observed;
    const instance = transport(async input => { observed = input; return result(); });
    assert.deepEqual(JSON.parse(await instance.adapter(args())), final('Done.'));
    assert.deepEqual(Object.keys(observed).sort(), ['effort','limits','model','outputSchema','prompt','signal']);
    assert.ok(observed.signal instanceof AbortSignal);
    assert.equal(observed.model, 'fixture-requested-model'); assert.equal(observed.effort, 'low');
    assert.ok(observed.prompt.endsWith('PUBLIC_DRIVER_REQUEST:\n' + request()));
    assert.equal(observed.outputSchema.type, 'object'); assert.equal(observed.outputSchema.anyOf, undefined);
    assert.equal(observed.outputSchema.properties.action.anyOf.length, 5);
    const inspectSchema = node => { if (!node || typeof node !== 'object') return;
      if (node.type === 'object') { assert.equal(node.additionalProperties, false); assert.deepEqual(node.required, Object.keys(node.properties)); }
      Object.values(node).forEach(value => Array.isArray(value) ? value.forEach(inspectSchema) : inspectSchema(value));
    }; inspectSchema(observed.outputSchema);
    assert.equal(first(instance).public_request_sha256, hash(request()));
    assert.equal(first(instance).prompt_sha256, hash(observed.prompt));
    assert.deepEqual(first(instance).usage, usage); assert.equal(first(instance).usage_source, 'cli_reported');
    const state = instance.inspect(); assert.equal(state.status, 'not_run'); assert.equal(state.model_execution, null);
    assert.equal(state.activation_observed, false); assert.equal(state.host_isolation_enforced, false);
    assert.equal(state.model_effective, null); assert.equal(state.effort_effective, null); assert.equal(state.provider_requests, null);
    assert.equal(state.provider_requests_enforced, false);
  });
  await test('strict action parsing accepts every virtual tool and refuses coercion or extra fields', async () => {
    for (const action of [tool('list_files', { prefix: '' }), tool('read_file', { path: 'task.txt', encoding: 'utf8' }),
      tool('write_file', { path: 'workspace/result.json', content: 'e30=', encoding: 'base64' }), tool('delete_file', { path: 'workspace/result.json' })]) {
      assert.deepEqual(JSON.parse(await transport(async () => result(events(action))).adapter(args())), action);
    }
    for (const action of [final(null), { ...final('Done'), extra: true }, tool(['read_file'], { path: 'task.txt', encoding: 'utf8' }),
      tool('read_file', { path: 'task.txt' }), tool('read_file', { path: 'task.txt', encoding: 'hex' }), tool('shell', { command: 'ignored' })]) {
      const instance = transport(async () => result(events(action)));
      await rejects(instance.adapter(args()), 'invalid_action'); assert.deepEqual(first(instance).usage, usage);
      assert.equal(first(instance).visible_output_sha256, null);
    }
  });
  await test('native and unknown item activity is rejected at start, update and completion', async () => {
    for (const phase of ['started','updated','completed']) for (const type of ['command_execution','mcp_tool_call','request_user_input','plan','future_tool']) {
      const instance = transport(async () => result(events(final('Done.'), [{ type: `item.${phase}`, item: { type, secret: PRIVATE } }])));
      await rejects(instance.adapter(args()), 'unexpected_native_activity');
      assert.deepEqual(first(instance).unexpected_item_types, [type]); assert.deepEqual(first(instance).usage, usage);
      assert.equal(first(instance).driver_response_sha256, null); assert.ok(!JSON.stringify(instance.inspect()).includes(PRIVATE));
    }
  });
  await test('only the exact single pre-turn disabled Code Mode notice is accepted', async () => {
    const noticeText = 'Code Mode is unavailable because code-mode host is disabled. Code mode will fail closed; enable `features.code_mode_host` and install `codex-code-mode-host`.';
    const notice = { type: 'item.completed', item: { id: 'startup_notice', type: 'error', message: noticeText } };
    const before = (...items) => { const stream = events(); stream.splice(1, 0, ...items); return stream; };
    const accepted = transport(async () => result(before(notice)));
    assert.deepEqual(JSON.parse(await accepted.adapter(args())), final('Done.'));
    assert.deepEqual(first(accepted).startup_notices, [{ code: 'code_mode_host_disabled', count: 1 }]);
    assert.deepEqual(first(accepted).unexpected_item_types, []); assert.deepEqual(first(accepted).usage, usage);
    const state = JSON.stringify(accepted.inspect()); assert.ok(!state.includes(noticeText)); assert.ok(!state.includes(hash(noticeText)));
    for (const stream of [before({ ...notice, item: { ...notice.item, message: noticeText + ' ' } }),
      before({ ...notice, item: { ...notice.item, message: 'Other startup error' } }), before(notice, notice),
      events(final('Done.'), [notice]), [...events(), notice],
      before({ ...notice, type: 'item.started' }), before({ ...notice, type: 'item.updated' }),
      before({ ...notice, item: { ...notice.item, extra: true } })]) {
      const rejected = transport(async () => result(stream));
      await assert.rejects(rejected.adapter(args()), error => ['invalid_event_order','unexpected_native_activity'].includes(error.code));
      assert.equal(first(rejected).status, 'error'); assert.equal(first(rejected).driver_response_sha256, null);
      assert.ok(!JSON.stringify(rejected.inspect()).includes(noticeText));
    }
  });
  await test('malformed JSONL, unknown events and malformed item types fail closed', async () => {
    for (const [bad, code] of [['not JSON', 'malformed_jsonl'], ['WARNING: cannot treat a warning as a valid event', 'malformed_jsonl'],
      [{ type: 'future.event', secret: PRIVATE }, 'unknown_event'], [{ type: 'item.started', item: { type: ['agent_message'] } }, 'malformed_item'],
      [{ type: 'item.updated', item: null }, 'malformed_item'], [[], 'malformed_event'], [{ type: 'turn.started', extra: true }, 'multiple_turns']]) {
      const instance = transport(async () => result(events(final('Done'), [bad])));
      await rejects(instance.adapter(args()), code); assert.ok(!JSON.stringify(instance.inspect()).includes(PRIVATE));
    }
  });
  await test('one started and completed turn with exactly one completed message is required', async () => {
    for (const [items, code] of [[events().slice(0, -1), 'incomplete_turn'],
      [events().slice(1), 'missing_thread'],
      [[events()[0], ...events()], 'invalid_event_order'],
      [[message(final('Done')), { type: 'turn.completed', usage }], 'invalid_event_order'],
      [events().filter(e => e.type !== 'item.completed'), 'missing_agent_message'],
      [events(final('Done'), [message(final('Another'))]), 'multiple_agent_messages'],
      [[...events(), { type: 'turn.completed', usage }], 'multiple_turns'],
      [[...events(), message(final('late'))], 'invalid_event_order'],
      [[{ type: 'turn.started' }, { type: 'turn.failed', error: { message: PRIVATE } }], 'turn_failed'],
      [events(final('Done'), [{ type: 'error', message: PRIVATE }]), 'cli_error']]) {
      await rejects(transport(async () => result(items)).adapter(args()), code);
    }
  });
  await test('valid completed-turn usage survives action errors and process exit failure', async () => {
    const instance = transport(async () => result(events(), { exit_code: 1, stderr: PRIVATE }));
    await rejects(instance.adapter(args()), 'process_exit'); assert.deepEqual(first(instance).usage, usage);
    assert.equal(first(instance).usage_complete, true); assert.equal(first(instance).usage_source, 'cli_reported');
    assert.ok(!JSON.stringify(instance.inspect()).includes(PRIVATE));
    const malformed = events(); malformed[2].item.text = 'bad action JSON';
    const actionError = transport(async () => result(malformed)); await rejects(actionError.adapter(args()), 'invalid_action');
    assert.deepEqual(first(actionError).usage, usage);
    const duplicate = transport(async () => result([...events(), { type: 'turn.completed', usage }]));
    await rejects(duplicate.adapter(args()), 'multiple_turns'); assert.equal(first(duplicate).usage, null);
  });
  await test('usage is non-negative CLI-reported integer data; absent or invalid metrics stay unknown', async () => {
    for (const data of [undefined, null, { ...usage, input_tokens: '10' }, { ...usage, cached_input_tokens: 11 },
      { ...usage, output_tokens: -1 }, { input_tokens: 1, output_tokens: 1 }, { ...usage, input_tokens: Infinity }]) {
      const items = events(); items.at(-1).usage = data; const instance = transport(async () => result(items));
      await instance.adapter(args()); assert.equal(first(instance).usage, null); assert.equal(first(instance).usage_complete, false);
    }
  });
  await test('reasoning, stderr, raw streams and their hashes are never retained', async () => {
    const instance = transport(async () => result(events(final('visible'), [
      { type: 'item.started', item: { type: 'reasoning', text: HIDDEN } },
      { type: 'item.updated', item: { type: 'reasoning', text: HIDDEN } },
      { type: 'item.completed', item: { type: 'reasoning', text: HIDDEN } },
    ]), { stderr: PRIVATE }));
    await instance.adapter(args()); const state = JSON.stringify(instance.inspect());
    for (const secret of [HIDDEN, PRIVATE, hash(HIDDEN), hash(PRIVATE)]) assert.ok(!state.includes(secret));
    assert.equal(first(instance).visible_output_sha256, hash(JSON.stringify({ action: final('visible') })));
  });
  await test('input, full invocation and output byte limits refuse dispatch or results', async () => {
    let calls = 0; const execute = async () => { calls++; return result(); };
    const small = transport(execute, { limits: { max_request_bytes: 200 } });
    await rejects(small.adapter(args()), 'request_bytes'); assert.equal(calls, 0); assert.equal(small.inspect().processes_reserved, 0);
    for (const [extra, config, code] of [[{ stdout: 'x'.repeat(101) }, { max_stdout_bytes: 100 }, 'stdout_bytes'],
      [{ stdout: Buffer.from('data') }, {}, 'invalid_execution_result'], [{ exit_code: 0.5 }, {}, 'invalid_execution_result']]) {
      const instance = transport(async () => result(events(), extra), { limits: config });
      await rejects(instance.adapter(args()), code); assert.equal(first(instance).usage, null);
    }
    const action = transport(async () => result(events(final('x'.repeat(200)))), { limits: { max_action_bytes: 100 } });
    await rejects(action.adapter(args()), 'action_bytes'); assert.deepEqual(first(action).usage, usage);
  });
  await test('oversized stderr preserves bounded complete stdout usage but never invents incomplete usage', async () => {
    for (const stderr of ['界'.repeat(40), 'x'.repeat(101)]) {
      const complete = transport(async () => result(events(), { stderr }), { limits: { max_stderr_bytes: 100 } });
      await rejects(complete.adapter(args()), 'stderr_bytes'); assert.deepEqual(first(complete).usage, usage);
      assert.equal(first(complete).usage_source, 'cli_reported'); assert.equal(first(complete).usage_complete, true);
      assert.equal(first(complete).visible_output_sha256, null); assert.equal(first(complete).driver_response_sha256, null);
      assert.ok(!JSON.stringify(complete.inspect()).includes(stderr));
    }
    for (const stream of [events().slice(1), [events()[0], ...events()], events().slice(0, -1),
      [...events(), { type: 'turn.completed', usage }]]) {
      const incomplete = transport(async () => result(stream, { stderr: 'x'.repeat(101) }), { limits: { max_stderr_bytes: 100 } });
      await rejects(incomplete.adapter(args()), 'stderr_bytes'); assert.equal(first(incomplete).usage, null);
      assert.equal(first(incomplete).usage_complete, false);
    }
    const oversized = transport(async () => result(events(), { stderr: 'x'.repeat(101) }),
      { limits: { max_stdout_bytes: 100, max_stderr_bytes: 100 } });
    await rejects(oversized.adapter(args()), 'stdout_bytes'); assert.equal(first(oversized).usage, null);
  });
  await test('shared process reservations never claim a provider request ceiling or retry', async () => {
    let calls = 0; const instance = transport(async () => { calls++; return result(); }, { limits: { max_processes: 2 } });
    await instance.adapter(args()); await instance.adapter(args()); await rejects(instance.adapter(args()), 'process_limit');
    assert.equal(calls, 2); assert.equal(instance.inspect().processes_reserved, 2); assert.equal(instance.inspect().provider_requests, null);
    const failure = transport(async () => { throw Error(PRIVATE); }); await rejects(failure.adapter(args()), 'execution_error');
    await rejects(failure.adapter(args()), 'process_limit'); assert.ok(!JSON.stringify(failure.inspect()).includes(PRIVATE));
  });
  await test('configuration and schemas are copied so callers cannot mutate future attempts', async () => {
    const limits = { max_processes: 2 }; let call = 0;
    const instance = transport(async input => { assert.equal(input.outputSchema.properties.action.anyOf.length, 5);
      input.outputSchema.properties.action.anyOf.length = 0; input.limits.max_stdout_bytes = 1; call++; return result(); }, { limits });
    limits.max_processes = 100; const snapshot = instance.inspect(); snapshot.limits.max_processes = 100;
    await instance.adapter(args()); await instance.adapter(args()); await rejects(instance.adapter(args()), 'process_limit'); assert.equal(call, 2);
  });
  await test('concurrency and cancellation keep the reserved process until late execution settles', async () => {
    let finish, observedSignal; const controller = new AbortController();
    const instance = transport(async input => { observedSignal = input.signal; return new Promise(resolve => { finish = resolve; }); }, { limits: { max_processes: 2 } });
    const running = instance.adapter(args(request(), controller)); await settle();
    await rejects(instance.adapter(args()), 'concurrent_execution'); controller.abort(PRIVATE); await rejects(running, 'cancelled');
    assert.equal(observedSignal.aborted, true); const before = clone(first(instance)); assert.equal(before.usage, null);
    assert.equal(instance.inspect().in_flight, true); await rejects(instance.adapter(args()), 'concurrent_execution');
    finish(result()); await settle(); assert.deepEqual(first(instance), before); assert.equal(instance.inspect().in_flight, false);
    assert.equal(instance.inspect().processes_reserved, 1);
  });
  await test('timeout does not refund its reservation and late usage cannot overwrite unknown data', async () => {
    let finish, observedSignal;
    const instance = transport(async input => { observedSignal = input.signal; return new Promise(resolve => { finish = resolve; }); }, { limits: { timeout_ms: 15 } });
    await rejects(instance.adapter(args()), 'timed_out'); assert.equal(observedSignal.aborted, true);
    const before = clone(first(instance)); assert.equal(before.usage, null); assert.equal(before.usage_complete, false);
    finish(result()); await settle(); assert.deepEqual(first(instance), before); await rejects(instance.adapter(args()), 'process_limit');
  });
  await test('pre-cancelled input and malformed public envelopes launch nothing', async () => {
    let calls = 0; const instance = transport(async () => { calls++; return result(); }); const cancelled = new AbortController(); cancelled.abort();
    await rejects(instance.adapter(args(request(), cancelled)), 'cancelled');
    for (const text of ['not JSON', '{}', JSON.stringify({ ...JSON.parse(request()), private_checks: PRIVATE })]) await rejects(instance.adapter(args(text)), 'invalid_request');
    assert.equal(calls, 0); assert.equal(instance.inspect().processes_reserved, 0);
  });
  await test('driver virtual write and final keep private grading local', async () => {
    let calls = 0;
    const instance = transport(async input => {
      assert.ok(!input.prompt.includes(PRIVATE)); const current = JSON.parse(input.prompt.split('PUBLIC_DRIVER_REQUEST:\n')[1]); calls++;
      if (calls === 1) return result(events(tool('write_file', { path: 'workspace/result.json', content: '{"amount":14}', encoding: 'utf8' })));
      assert.equal(current.messages.at(-1).role, 'tool'); assert.equal(current.messages.at(-1).content.ok, true);
      return result(events(final('Virtual result prepared; runtime verification unavailable.')));
    }, { limits: { max_processes: 2 } });
    const output = await runTaskTrial({ publicFiles: [{ path: 'task.txt', bytes: Buffer.from('Write amount 14.') },
      { path: 'skill-catalog.json', bytes: Buffer.from('{"skills":[]}') }], policy: { writable_paths: ['workspace/result.json'] },
    checks: [{ id: PRIVATE, type: 'json_value', path: 'workspace/result.json', keys: ['amount'], equals: 14 }], adapter: instance.adapter });
    assert.equal(output.report.run_status, 'completed'); assert.equal(output.report.artifact_grading.status, 'passed');
    assert.equal(output.artifacts.find(file => file.path === 'workspace/result.json').bytes.toString(), '{"amount":14}');
    assert.equal(output.report.status, 'not_run'); assert.equal(output.report.model_execution, null); assert.equal(calls, 2);
  });
  console.log(`\n${passed} Codex transport tests passed (injected fake execution only; no CLI, network or model calls).`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
