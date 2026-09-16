'use strict';
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { createResponsesTransport, DEFAULT_LIMITS, CEILINGS } = require('../scripts/lib/skill-responses-transport');
const { runTaskTrial } = require('../scripts/lib/skill-task-driver');
const ENDPOINT = 'https://api.openai.com/v1/responses';
const KEY = 'sk-FAKE-TRANSPORT-CREDENTIAL-DO-NOT-USE';
const PRIVATE = 'PRIVATE-RUBRIC-SHOULD-NOT-LEAVE-DRIVER';
const HIDDEN = 'PROVIDER-HIDDEN-REASONING-NOT-PERSISTED';
const hash = text => crypto.createHash('sha256').update(text).digest('hex');
const clone = value => JSON.parse(JSON.stringify(value));
const settle = () => new Promise(resolve => setImmediate(resolve));
const final = text => ({ type: 'final', text });
const tool = (name, args) => ({ type: 'tool_call', request: { tool: name, arguments: args } });
const publicRequest = () => JSON.stringify({ protocol: 'skill-task-driver-v1', turn: 1, tool_schema: {}, response_schema: {},
  write_grants: { writable_paths: ['workspace/result.json'], writable_roots: [] },
  messages: [{ role: 'user', content: { task: 'Write the requested result.', skill_catalog: '{"skills":[]}' } }] });
const args = (requestJson = publicRequest(), controller = new AbortController()) => ({ requestJson, signal: controller.signal });
const provider = (action = final('Done.')) => ({ object: 'response', status: 'completed', store: false, error: null,
  incomplete_details: null, model: 'fixture-reported-model', reasoning: { effort: 'low' },
  output: [{ type: 'message', id: 'msg_fixture', status: 'completed', role: 'assistant',
    content: [{ type: 'output_text', text: JSON.stringify({ action }), annotations: [] }] }],
  usage: { input_tokens: 10, output_tokens: 3, total_tokens: 13,
    input_tokens_details: { cached_tokens: 4 }, output_tokens_details: { reasoning_tokens: 1 } } });
function response(value, options = {}) {
  const bytes = Buffer.isBuffer(value) ? value : Buffer.from(typeof value === 'string' ? value : JSON.stringify(value));
  let offset = 0;
  return { status: 200, url: ENDPOINT, redirected: false,
    headers: { get: name => name === 'content-type' ? 'application/json; charset=utf-8' : PRIVATE },
    body: new ReadableStream({ pull(controller) {
      if (offset === bytes.length) { controller.close(); return; }
      const next = Math.min(bytes.length, offset + (options.chunkSize || bytes.length));
      controller.enqueue(bytes.subarray(offset, next)); offset = next;
    } }), ...options };
}
function transport(fetchImpl, options = {}) {
  return createResponsesTransport({ model: 'fixture-requested-model', apiKey: KEY, fetchImpl, ...options });
}
async function rejects(call, code) {
  await assert.rejects(call, error => { assert.equal(error.code, code); assert.equal(error.message, `Responses transport: ${code}`); return true; });
}
function first(instance) { return instance.inspect().attempts[0]; }
let passed = 0;
async function test(name, fn) { await fn(); passed++; console.log('PASS ' + name); }

async function main() {
  await test('explicit injected fetch, bounded configuration and fixed endpoint are mandatory', async () => {
    const good = { model: 'fixture-model', apiKey: KEY, fetchImpl: async () => response(provider()) };
    for (const change of [{ fetchImpl: undefined }, { model: undefined }, { apiKey: undefined }, { apiKey: 'bad\nkey' },
      { model: KEY }, { endpoint: 'https://example.invalid' }, { effort: 'invented' }, { effort: 'ultra' }, { limits: null },
      { limits: { max_requests: 0 } }, { limits: { max_output_tokens: CEILINGS.max_output_tokens + 1 } },
      { limits: { unknown: 1 } }, { limits: { timeout_ms: Infinity } }]) {
      assert.throws(() => createResponsesTransport({ ...good, ...change }), { code: 'invalid_configuration' });
    }
    assert.deepEqual(transport(good.fetchImpl).inspect().limits, DEFAULT_LIMITS);
    let sent;
    await transport(async (_url, init) => { sent = JSON.parse(init.body); return response(provider()); }, { effort: 'max' }).adapter(args());
    assert.equal(sent.reasoning.effort, 'max'); // Vocabulary acceptance does not assert any model supports it.
  });
  await test('payload uses one public input and strict nested union with no provider tools or state', async () => {
    let observed;
    const instance = transport(async (url, init) => { observed = { url, init }; return response(provider()); }, { effort: 'low' });
    assert.deepEqual(JSON.parse(await instance.adapter(args())), final('Done.'));
    assert.equal(observed.url, ENDPOINT); assert.equal(observed.init.method, 'POST'); assert.equal(observed.init.redirect, 'error');
    assert.ok(observed.init.signal instanceof AbortSignal);
    assert.deepEqual(observed.init.headers, { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` });
    const body = JSON.parse(observed.init.body);
    assert.deepEqual(Object.keys(body).sort(), ['background','input','instructions','max_output_tokens','model','reasoning','store','stream','text','tool_choice','tools','truncation']);
    assert.equal(body.input, publicRequest()); assert.equal(body.model, 'fixture-requested-model');
    assert.equal(body.store, false); assert.equal(body.stream, false); assert.equal(body.background, false);
    assert.equal(body.truncation, 'disabled'); assert.deepEqual(body.tools, []); assert.equal(body.tool_choice, 'none');
    assert.equal(body.text.format.strict, true); assert.equal(body.text.format.type, 'json_schema');
    const schema = body.text.format.schema;
    assert.equal(schema.type, 'object'); assert.equal(schema.anyOf, undefined); assert.equal(schema.properties.action.anyOf.length, 5);
    function inspectSchema(node) {
      if (!node || typeof node !== 'object') return;
      if (node.type === 'object') { assert.equal(node.additionalProperties, false); assert.deepEqual(node.required, Object.keys(node.properties)); }
      Object.values(node).forEach(value => Array.isArray(value) ? value.forEach(inspectSchema) : inspectSchema(value));
    }
    inspectSchema(schema);
    const record = first(instance);
    assert.equal(record.request_sha256, hash(observed.init.body)); assert.equal(record.public_request_sha256, hash(publicRequest()));
    assert.equal(record.request_bytes, Buffer.byteLength(observed.init.body));
    assert.equal(record.status, 'completed'); assert.equal(record.model_requested, body.model);
    assert.equal(record.model_reported, 'fixture-reported-model'); assert.equal(record.effort_requested, 'low'); assert.equal(record.effort_reported, 'low');
    assert.deepEqual(record.usage, { input_tokens: 10, output_tokens: 3, total_tokens: 13, cached_input_tokens: 4, reasoning_output_tokens: 1 });
    assert.equal(record.usage_complete, true); assert.equal(record.cost, null);
    const snapshot = instance.inspect(); assert.equal(snapshot.status, 'not_run'); assert.equal(snapshot.model_execution, null);
    assert.equal(snapshot.activation_observed, false); assert.equal(snapshot.task_outcome, null); assert.equal(snapshot.cost, null);
    assert.ok(!JSON.stringify(snapshot).includes(KEY)); assert.ok(!JSON.stringify(snapshot).includes(hash(KEY)));
  });
  await test('all four virtual operations map exactly to the existing driver protocol', async () => {
    const actions = [tool('list_files', { prefix: '' }), tool('read_file', { path: 'task.txt', encoding: 'utf8' }),
      tool('write_file', { path: 'workspace/out.bin', content: 'AA==', encoding: 'base64' }), tool('delete_file', { path: 'workspace/result.json' })];
    for (const action of actions) assert.deepEqual(JSON.parse(await transport(async () => response(provider(action))).adapter(args())), action);
  });
  await test('strict action validation rejects coercion, extra keys, batches and incomplete tool arguments', async () => {
    const invalid = [null, [], { action: final('x'), extra: true }, { action: { ...final('x'), extra: true } },
      { action: { type: 'final', text: 1 } }, { action: { type: 'final', text: 'x', request: {} } },
      { action: tool(['write_file'], { path: 'workspace/result.json', content: '{}', encoding: 'utf8' }) },
      { action: tool('shell', {}) }, { action: tool('read_file', { path: 'task.txt' }) },
      { action: tool('read_file', { path: 'task.txt', encoding: 'hex' }) },
      { action: tool('write_file', { path: 'workspace/result.json', content: '{}', encoding: 'utf8', mode: 'append' }) },
      { action: { type: 'tool_call', request: { tool: 'list_files', arguments: { prefix: '' }, extra: true } } }];
    for (const action of invalid) {
      const value = provider(); value.output[0].content[0].text = JSON.stringify(action);
      const instance = transport(async () => response(value)); await rejects(() => instance.adapter(args()), 'invalid_action');
      assert.equal(first(instance).visible_output_sha256, null); assert.equal(first(instance).usage.total_tokens, 13);
      assert.equal(first(instance).usage_source, 'provider_reported');
    }
  });
  await test('provider refusals, incomplete status, native calls and ambiguous visible output fail closed', async () => {
    const scenarios = [
      ['provider_refusal', p => { p.output[0].content = [{ type: 'refusal', refusal: PRIVATE }]; }],
      ['response_not_completed', p => { p.status = 'incomplete'; }],
      ['response_not_completed', p => { p.error = { message: PRIVATE }; }],
      ['response_not_completed', p => { p.incomplete_details = { reason: PRIVATE }; }],
      ['response_not_completed', p => { p.store = true; }],
      ['provider_tool_or_unknown_output', p => { p.output.push({ type: 'function_call', arguments: PRIVATE }); }],
      ['provider_tool_or_unknown_output', p => { p.output.push({ type: 'web_search_call', action: PRIVATE }); }],
      ['invalid_output', p => { p.output.push(clone(p.output[0])); }],
      ['invalid_output', p => { p.output = []; }],
      ['invalid_output', p => { p.output[0].status = 'in_progress'; }],
      ['invalid_output', p => { p.output[0].role = 'user'; }],
      ['invalid_output', p => { p.output[0].phase = 'commentary'; }],
      ['invalid_output', p => { p.output[0].extra = PRIVATE; }],
      ['invalid_output', p => { p.output[0].content[0].annotations = [{ url: PRIVATE }]; }],
      ['invalid_output', p => { p.output[0].content.push({ type: 'output_text', text: PRIVATE }); }],
      ['invalid_output', p => { p.output[0].content[0].extra = PRIVATE; }],
    ];
    for (const [code, mutate] of scenarios) {
      const value = provider(); mutate(value); const instance = transport(async () => response(value));
      await rejects(() => instance.adapter(args()), code); assert.equal(first(instance).usage_complete, true);
      assert.equal(first(instance).usage.total_tokens, 13); assert.equal(first(instance).usage_source, 'provider_reported');
      assert.ok(!JSON.stringify(instance.inspect()).includes(PRIVATE));
    }
  });
  await test('HTTP failures and redirects consume one attempt without body reads, retries or raw errors', async () => {
    for (const status of [302, 401, 429, 500]) {
      let calls = 0, reads = 0;
      const instance = transport(async () => { calls++; return { status, url: ENDPOINT, headers: PRIVATE,
        body: { getReader() { reads++; throw Error(PRIVATE); } } }; });
      await rejects(() => instance.adapter(args()), status === 302 ? 'redirect_rejected' : 'http_error');
      await rejects(() => instance.adapter(args()), 'request_limit');
      assert.equal(calls, 1); assert.equal(reads, 0); assert.equal(first(instance).http_status, status);
      assert.equal(first(instance).usage, null); assert.ok(!JSON.stringify(instance.inspect()).includes(PRIVATE));
    }
    for (const change of [{ redirected: true }, { url: 'https://untrusted.invalid' }]) {
      await rejects(() => transport(async () => response(provider(), change)).adapter(args()), 'redirect_rejected');
    }
    const thrown = transport(async () => { throw new Error(`${KEY} ${PRIVATE}`); });
    await rejects(() => thrown.adapter(args()), 'transport_error'); assert.ok(!JSON.stringify(thrown.inspect()).includes(KEY));
  });
  await test('bounded streamed body rejects oversized, invalid UTF-8, invalid JSON and missing bodies', async () => {
    const value = provider(), bytes = Buffer.from(JSON.stringify(value));
    const exact = transport(async () => response(bytes, { chunkSize: 1 }), { limits: { max_response_bytes: bytes.length } });
    await exact.adapter(args()); assert.equal(first(exact).response_bytes, bytes.length); assert.equal(first(exact).response_complete, true);
    const small = transport(async () => response(bytes, { chunkSize: 17 }), { limits: { max_response_bytes: bytes.length - 1 } });
    await rejects(() => small.adapter(args()), 'response_bytes'); assert.equal(first(small).response_complete, false);
    assert.equal(first(small).visible_output_sha256, null);
    for (const [value, code] of [[Buffer.from([0xff]), 'invalid_response_body'], ['{bad', 'invalid_response_json']])
      await rejects(() => transport(async () => response(value)).adapter(args()), code);
    await rejects(() => transport(async () => response(provider(), { body: null })).adapter(args()), 'missing_response_body');
    await rejects(() => transport(async () => response(provider(), { headers: { get: () => 'text/html' } })).adapter(args()), 'invalid_content_type');
  });
  await test('public request bounds, unknown envelopes and credential copies fail before reserving a request', async () => {
    let calls = 0; const instance = transport(async () => { calls++; return response(provider()); }, { limits: { max_requests: 8 } });
    for (const value of ['{bad', JSON.stringify({ ...JSON.parse(publicRequest()), privateChecks: PRIVATE }), '{}'])
      await rejects(() => instance.adapter(args(value)), 'invalid_request');
    const withKey = JSON.parse(publicRequest()); withKey.messages[0].content.task = KEY;
    await rejects(() => instance.adapter(args(JSON.stringify(withKey))), 'credential_in_public_input');
    await rejects(() => instance.adapter(args(JSON.stringify(withKey).replace('sk-', '\\u0073k-'))), 'credential_in_public_input');
    const small = transport(async () => { calls++; return response(provider()); }, { limits: { max_request_bytes: 100 } });
    await rejects(() => small.adapter(args()), 'request_bytes');
    const cancelled = new AbortController(); cancelled.abort(KEY);
    await rejects(() => instance.adapter(args(publicRequest(), cancelled)), 'cancelled');
    assert.equal(calls, 0); assert.equal(instance.inspect().requests_reserved, 0); assert.equal(small.inspect().requests_reserved, 0);
  });
  await test('shared instance aggregates attempts and protects copied configuration and inspect snapshots', async () => {
    let calls = 0; const options = { limits: { max_requests: 2 }, effort: 'low' };
    const instance = transport(async () => { calls++; return response(provider()); }, options);
    options.limits.max_requests = 100; options.effort = 'high';
    await instance.adapter(args()); const snapshot = instance.inspect(); snapshot.attempts[0].status = 'spoofed'; snapshot.limits.max_requests = 100;
    await instance.adapter(args()); await rejects(() => instance.adapter(args()), 'request_limit');
    assert.equal(calls, 2); assert.equal(first(instance).status, 'completed'); assert.equal(first(instance).effort_requested, 'low');
    assert.equal(instance.inspect().requests_remaining, 0); assert.equal(instance.inspect().requests_reserved, 2);
  });
  await test('concurrency is refused and cancelled late fetches cannot update records or refund attempts', async () => {
    let resolveFetch, calls = 0;
    const deferred = new Promise(resolve => { resolveFetch = resolve; });
    const instance = transport(async () => { calls++; return deferred; }, { limits: { max_requests: 2 } });
    const controller = new AbortController(), running = instance.adapter(args(publicRequest(), controller));
    await settle(); await rejects(() => instance.adapter(args()), 'concurrent_request');
    controller.abort(PRIVATE); await rejects(() => running, 'cancelled');
    const before = clone(first(instance)); assert.equal(instance.inspect().in_flight, true);
    await rejects(() => instance.adapter(args()), 'concurrent_request');
    resolveFetch(response(provider(tool('write_file', { path: 'workspace/result.json', content: 'late', encoding: 'utf8' }))));
    await settle(); assert.deepEqual(first(instance), before); assert.equal(instance.inspect().in_flight, false);
    assert.equal(calls, 1); assert.equal(instance.inspect().requests_reserved, 1); assert.equal(before.usage, null);
  });
  await test('timeout bounds non-cooperating fetch and ignores eventual completion', async () => {
    let resolveFetch, observedSignal;
    const instance = transport(async (_url, init) => { observedSignal = init.signal; return new Promise(resolve => { resolveFetch = resolve; }); },
      { limits: { timeout_ms: 20 } });
    await rejects(() => instance.adapter(args()), 'timed_out'); assert.equal(observedSignal.aborted, true);
    const before = clone(first(instance)); assert.equal(before.usage_complete, false); assert.equal(before.status, 'timed_out');
    resolveFetch(response(provider())); await settle(); assert.deepEqual(first(instance), before);
    await rejects(() => instance.adapter(args()), 'request_limit');
  });
  await test('abort during a stalled body cancels its reader and rejects late bytes', async () => {
    let resolveRead, reads = 0, cancels = 0;
    const controller = new AbortController();
    const instance = transport(async () => response(provider(), { body: { getReader: () => ({
      read() { reads++; return new Promise(resolve => { resolveRead = resolve; }); }, cancel() { cancels++; return Promise.resolve(); },
    }) } }));
    const running = instance.adapter(args(publicRequest(), controller)); await settle(); assert.equal(reads, 1);
    controller.abort(); await rejects(() => running, 'cancelled'); assert.ok(cancels >= 1);
    const before = clone(first(instance)); resolveRead({ done: false, value: Buffer.from(JSON.stringify(provider())) });
    await settle(); assert.deepEqual(first(instance), before); assert.equal(before.response_bytes, 0); assert.equal(before.usage, null);
  });
  await test('abort at body completion cannot return an action', async () => {
    const controller = new AbortController(), bytes = Buffer.from(JSON.stringify(provider())); let reads = 0;
    const instance = transport(async () => response(provider(), { body: { getReader: () => ({
      async read() { if (++reads === 1) return { done: false, value: bytes }; controller.abort(); return { done: true }; }, cancel() {},
    }) } }));
    await rejects(() => instance.adapter(args(publicRequest(), controller)), 'cancelled');
    assert.equal(first(instance).visible_output_sha256, null); assert.equal(first(instance).usage, null);
  });
  await test('usage is numeric provider data only; absent or invalid data remains unknown', async () => {
    for (const usage of [undefined, null, { input_tokens: '10', output_tokens: 3, total_tokens: 13 },
      { input_tokens: -1, output_tokens: 3, total_tokens: 2 }, { input_tokens: 10, output_tokens: 3, total_tokens: 99 },
      { input_tokens: 10, output_tokens: 3, total_tokens: 13, output_tokens_details: { reasoning_tokens: 4 } }]) {
      const value = provider(); value.usage = usage; const instance = transport(async () => response(value));
      await instance.adapter(args()); assert.equal(first(instance).usage, null); assert.equal(first(instance).usage_complete, false);
    }
    const value = provider(); value.usage.secret = PRIVATE; value.usage.input_tokens_details.secret = KEY;
    const instance = transport(async () => response(value)); await instance.adapter(args());
    assert.equal(first(instance).usage_complete, true); assert.ok(!JSON.stringify(instance.inspect()).includes(PRIVATE));
    assert.ok(!JSON.stringify(instance.inspect()).includes(KEY));
  });
  await test('hidden reasoning and headers are discarded; only validated visible output is hashed', async () => {
    const a = provider(), b = provider();
    a.output.unshift({ type: 'reasoning', summary: [{ text: HIDDEN }], encrypted_content: KEY });
    b.output.unshift({ type: 'reasoning', summary: [{ text: 'DIFFERENT-SECRET' }] });
    const firstTransport = transport(async () => response(a)), secondTransport = transport(async () => response(b));
    await firstTransport.adapter(args()); await secondTransport.adapter(args());
    assert.equal(first(firstTransport).visible_output_sha256, hash(a.output[1].content[0].text));
    assert.equal(first(firstTransport).visible_output_sha256, first(secondTransport).visible_output_sha256);
    const snapshot = JSON.stringify(firstTransport.inspect());
    for (const secret of [HIDDEN, KEY, PRIVATE, hash(KEY), hash(JSON.stringify(a))]) assert.ok(!snapshot.includes(secret));
    const echo = provider(); echo.model = KEY;
    const echoed = transport(async () => response(echo)); await echoed.adapter(args()); assert.equal(first(echoed).model_reported, null);
    const effortResponse = provider(); effortResponse.reasoning.effort = 'high';
    const effortEcho = transport(async () => response(effortResponse), { apiKey: 'high' });
    await effortEcho.adapter(args()); assert.equal(first(effortEcho).effort_reported, null);
  });
  await test('literal or JSON-escaped credential output is never returned or hashed', async () => {
    for (const escape of [false, true]) {
      const value = provider(final(KEY)); if (escape) value.output[0].content[0].text = value.output[0].content[0].text.replace('sk-', '\\u0073k-');
      const instance = transport(async () => response(value)); await rejects(() => instance.adapter(args()), 'credential_in_output');
      assert.equal(first(instance).visible_output_sha256, null); assert.equal(first(instance).driver_response_sha256, null);
      assert.ok(!JSON.stringify(instance.inspect()).includes(KEY));
    }
    const encoded = provider(tool('write_file', { path: 'workspace/result.json', content: Buffer.from(`prefix-${KEY}-suffix`).toString('base64'), encoding: 'base64' }));
    const instance = transport(async () => response(encoded)); await rejects(() => instance.adapter(args()), 'credential_in_output');
    assert.equal(first(instance).visible_output_sha256, null); assert.equal(first(instance).driver_response_sha256, null);
    assert.ok(!JSON.stringify(instance.inspect()).includes(KEY));
  });
  await test('fake transport drives a virtual write and final while private grading stays local', async () => {
    const requests = [];
    const instance = transport(async (_url, init) => {
      const body = JSON.parse(init.body); requests.push(body); const request = JSON.parse(body.input);
      assert.deepEqual(body.tools, []); assert.ok(!init.body.includes(PRIVATE));
      if (requests.length === 1) return response(provider(tool('write_file', { path: 'workspace/result.json', content: '{"amount":14}', encoding: 'utf8' })));
      assert.equal(request.messages.at(-1).role, 'tool'); assert.equal(request.messages.at(-1).content.ok, true);
      return response(provider(final('Prepared virtual result; runtime verification remains unavailable.')));
    }, { limits: { max_requests: 2 } });
    const result = await runTaskTrial({ publicFiles: [
      { path: 'task.txt', bytes: Buffer.from('Write amount 14 to workspace/result.json.') },
      { path: 'skill-catalog.json', bytes: Buffer.from('{"skills":[]}') },
    ], policy: { writable_paths: ['workspace/result.json'] },
    checks: [{ id: PRIVATE, type: 'json_value', path: 'workspace/result.json', keys: ['amount'], equals: 14 }],
    adapter: instance.adapter });
    assert.equal(result.report.run_status, 'completed'); assert.equal(result.report.artifact_grading.status, 'passed');
    assert.equal(result.artifacts.find(file => file.path === 'workspace/result.json').bytes.toString(), '{"amount":14}');
    assert.equal(result.report.status, 'not_run'); assert.equal(result.report.model_execution, null); assert.equal(result.report.activation_observed, false);
    assert.equal(instance.inspect().status, 'not_run'); assert.equal(instance.inspect().requests_reserved, 2); assert.equal(requests.length, 2);
  });
  await test('driver cancellation never executes a late provider virtual write', async () => {
    let resolveFetch; const controller = new AbortController();
    const instance = transport(async () => new Promise(resolve => { resolveFetch = resolve; }));
    const running = runTaskTrial({ publicFiles: [
      { path: 'task.txt', bytes: Buffer.from('Prepare result.') }, { path: 'skill-catalog.json', bytes: Buffer.from('{"skills":[]}') },
    ], policy: { writable_paths: ['workspace/result.json'] }, adapter: instance.adapter, signal: controller.signal });
    await settle(); controller.abort(PRIVATE); const result = await running;
    assert.equal(result.report.artifact_grading.status, 'not_run'); assert.equal(result.report.broker_trace.length, 0);
    resolveFetch(response(provider(tool('write_file', { path: 'workspace/result.json', content: 'late', encoding: 'utf8' }))));
    await settle(); assert.ok(!result.artifacts.some(file => file.path === 'workspace/result.json'));
    assert.equal(first(instance).status, 'cancelled'); assert.equal(first(instance).usage, null);
  });
  console.log(`\n${passed} Responses transport tests passed (fake fetch only; no network or model calls).`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
