'use strict';

// Trusted adapter orchestration, not an OS/JavaScript sandbox or a model eval.
// Only serialized public messages and a fresh cancellation signal cross the
// adapter interface. Caller-owned inputs and private graders never cross it.
const fs = require('node:fs');
const crypto = require('node:crypto');
const { performance } = require('node:perf_hooks');
const { createBroker, gradeArtifacts, LOADED_PROVENANCE: brokerProvenance } = require('./skill-eval-broker');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const loadedImplementation = Object.freeze({ driver: hash(fs.readFileSync(__filename)),
  broker: brokerProvenance.source_sha256, private_grader: brokerProvenance.private_grader_sha256 });
const brokerFilename = require.resolve('./skill-eval-broker');
const DEFAULT_LIMITS = Object.freeze({ max_adapter_turns: 32, timeout_ms: 30000, max_request_bytes: 2097152,
  max_response_bytes: 262144, max_history_bytes: 4194304, max_final_text_bytes: 65536 });
const CEILINGS = Object.freeze({ max_adapter_turns: 128, timeout_ms: 60000, max_request_bytes: 8388608,
  max_response_bytes: 1048576, max_history_bytes: 16777216, max_final_text_bytes: 262144 });
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const keys = (value, required) => object(value) && Object.keys(value).length === required.length
  && required.every(key => Object.hasOwn(value, key));
const toolSchema = {
  list_files: { type: 'object', additionalProperties: false, properties: { prefix: { type: 'string' } } },
  read_file: { type: 'object', additionalProperties: false, required: ['path'], properties: { path: { type: 'string' }, encoding: { enum: ['utf8', 'base64'] } } },
  write_file: { type: 'object', additionalProperties: false, required: ['path', 'content'], properties: { path: { type: 'string' }, content: { type: 'string' }, encoding: { enum: ['utf8', 'base64'] } } },
  delete_file: { type: 'object', additionalProperties: false, required: ['path'], properties: { path: { type: 'string' } } },
};
const responseSchema = { oneOf: [
  { type: 'object', additionalProperties: false, required: ['type', 'request'], properties: { type: { const: 'tool_call' }, request: { type: 'object', additionalProperties: false, required: ['tool', 'arguments'], properties: { tool: { type: 'string' }, arguments: { type: 'object' } } } } },
  { type: 'object', additionalProperties: false, required: ['type', 'text'], properties: { type: { const: 'final' }, text: { type: 'string' } } },
] };
const protocol = { protocol: 'skill-task-driver-v1', tool_schema: toolSchema, response_schema: responseSchema };

function jsonCopy(value) {
  const ancestors = new Set();
  function validate(item, depth) {
    if (depth > 64) throw new Error('JSON depth limit');
    if (item === null || typeof item === 'string' || typeof item === 'boolean') return;
    if (typeof item === 'number' && Number.isFinite(item)) return;
    if (!item || typeof item !== 'object' || ancestors.has(item)
      || (!Array.isArray(item) && ![Object.prototype, null].includes(Object.getPrototypeOf(item)))) throw new Error('JSON data required');
    ancestors.add(item);
    for (const descriptor of Object.values(Object.getOwnPropertyDescriptors(item))) {
      if (descriptor.get || descriptor.set) throw new Error('JSON data required');
      if (descriptor.enumerable) validate(descriptor.value, depth + 1);
    }
    ancestors.delete(item);
  }
  validate(value, 0);
  const serialized = JSON.stringify(value);
  if (serialized.length > 1048576 || Buffer.byteLength(serialized) > 1048576) throw new Error('Configuration byte limit');
  return JSON.parse(serialized);
}
function limitsFor(value) {
  if (!object(value) || Object.keys(value).some(key => !Object.hasOwn(CEILINGS, key))) throw new Error('Invalid limits');
  const limits = { ...DEFAULT_LIMITS, ...value };
  if (Object.entries(limits).some(([key, count]) => !Number.isSafeInteger(count) || count < 1 || count > CEILINGS[key])) throw new Error('Invalid limits');
  return limits;
}
function parseResponse(raw) {
  const response = JSON.parse(raw);
  if (keys(response, ['type', 'text']) && response.type === 'final' && typeof response.text === 'string') return response;
  if (keys(response, ['type', 'request']) && response.type === 'tool_call'
    && keys(response.request, ['tool', 'arguments']) && typeof response.request.tool === 'string' && object(response.request.arguments)) return response;
  throw new Error('Invalid response envelope');
}

async function runTaskTrial(options = {}) {
  const started = performance.now();
  let broker = null, privateChecks = [], limits = { ...DEFAULT_LIMITS }, timer = null, external = null;
  let stopped = null, finished = false, interrupt;
  const controller = new AbortController();
  const interruption = new Promise(resolve => { interrupt = resolve; });
  const report = { schema_version: 1, evaluation_kind: 'transport_neutral_task_driver', status: 'not_run',
    model_execution: null, activation_observed: false, host_isolation_enforced: false,
    run_status: 'error', error: null, limits, configuration_sha256: null,
    protocol_sha256: hash(JSON.stringify(protocol)), implementation_sha256: { ...loadedImplementation },
    private_checks_sha256: null, public_bundle_sha256: null, tool_policy_sha256: null, toolset_sha256: null,
    turns: [], transport_totals: { requests_bytes: 0, responses_bytes: 0 },
    final_text: null, final_text_sha256: null, artifact_grading: { status: 'not_run', checks: [] },
    broker_trace: [], trace_complete: true, calls_attempted: 0, calls_not_recorded: 0,
    initial_manifest: [], final_manifest: [], loaded_skill_entries: [],
    usage: null, cost: null, usage_complete: false,
    limitations: [
      'This records trusted adapter/harness flow, not a verified model task outcome, Skill activation or host isolation.',
      'The adapter is trusted JavaScript. Callback execution is not an OS or JavaScript sandbox; no generated code is evaluated by this driver.',
      'Timeout or cancellation stops further driver dispatch and signals the adapter; it cannot terminate an arbitrary callback or undo its independent side effects.',
      'Previously accepted virtual writes remain as partial artifacts after failure or cancellation; there is no implied rollback.',
      'Only complete, uninterrupted, trace-complete final responses receive artifact grading; manual checks remain unverified and absent checks remain not_run.',
      'Provider usage, cost, model identity and actual activation are unavailable. Public file reads do not establish instruction adherence.',
      'Implementation hashes identify the loaded module instances; changed or unavailable source files require a fresh process/module load before another trial.',
    ] };
  function fail(status, category, code) { report.run_status = status; report.error = { category, code }; }
  function checkSources() {
    try {
      if (hash(fs.readFileSync(__filename)) === loadedImplementation.driver
        && hash(fs.readFileSync(brokerFilename)) === loadedImplementation.broker) return true;
    } catch { /* Missing or unreadable source cannot authenticate the loaded instance. */ }
    fail('error', 'provenance', 'loaded_source_changed');
    return false;
  }
  function stop(status) {
    if (stopped || finished) return;
    stopped = status;
    controller.abort(); // Never forward a caller/provider error or abort reason.
    interrupt({ kind: 'stopped' });
  }
  const onAbort = () => stop('cancelled');
  function checkStop() {
    if (external?.aborted) stop('cancelled');
    if (!stopped && performance.now() - started >= limits.timeout_ms) stop('timed_out');
    if (!stopped) return false;
    fail(stopped, stopped === 'cancelled' ? 'cancellation' : 'timeout', stopped === 'cancelled' ? 'external_abort' : 'total_timeout');
    return true;
  }
  function boundedHistory(messages) {
    const text = JSON.stringify(messages);
    return text.length <= limits.max_history_bytes && Buffer.byteLength(text) <= limits.max_history_bytes;
  }
  let artifacts = [];
  try {
    if (!object(options) || typeof options.adapter !== 'function') throw new Error('Invalid configuration');
    limits = limitsFor(jsonCopy(options.limits === undefined ? {} : options.limits)); report.limits = limits;
    if (options.signal !== undefined && !(options.signal instanceof AbortSignal)) throw new Error('Invalid signal');
    external = options.signal;
    const policy = jsonCopy(options.policy === undefined ? {} : options.policy);
    if (!object(policy) || Object.keys(policy).some(key => !['writable_paths','writable_roots','limits'].includes(key))) throw new Error('Invalid policy');
    // createBroker copies all public bytes and validates public paths/grants.
    broker = createBroker(options.publicFiles, policy);
    const state = broker.inspect();
    report.public_bundle_sha256 = state.public_bundle_sha256;
    report.tool_policy_sha256 = hash(JSON.stringify(state.policy)); report.toolset_sha256 = state.toolset_sha256;
    privateChecks = jsonCopy(options.checks === undefined ? [] : options.checks);
    // Configuration validation only. Discard this initial result, including
    // ordinary artifact failures: no pre-execution grade is exposed anywhere.
    gradeArtifacts(broker, privateChecks);
    report.private_checks_sha256 = hash(JSON.stringify(privateChecks));
    report.configuration_sha256 = hash(JSON.stringify({ limits, policy: state.policy, protocol: report.protocol_sha256,
      public_bundle: state.public_bundle_sha256, private_checks: report.private_checks_sha256, implementation: report.implementation_sha256 }));
    const publicMap = new Map(broker.snapshot().map(file => [file.path, file.bytes]));
    function initialText(name) {
      const bytes = publicMap.get(name);
      if (!bytes) throw new Error('Missing initial public input');
      const text = bytes.toString('utf8');
      if (!Buffer.from(text).equals(bytes)) throw new Error('Initial input must be UTF-8');
      return text;
    }
    const messages = [{ role: 'user', content: { task: initialText('task.txt'), skill_catalog: initialText('skill-catalog.json') } }];
    const writeGrants = { writable_paths: state.policy.writable_paths, writable_roots: state.policy.writable_roots };
    if (external) external.addEventListener('abort', onAbort, { once: true });
    timer = setTimeout(() => stop('timed_out'), Math.max(1, limits.timeout_ms - (performance.now() - started)));
    for (let turn = 1; turn <= limits.max_adapter_turns; turn++) {
      if (checkStop()) break;
      if (!checkSources()) break;
      if (!boundedHistory(messages)) { fail('limit_exceeded','limit','history_bytes'); break; }
      const requestJson = JSON.stringify({ ...protocol, turn, write_grants: writeGrants, messages });
      const requestBytes = Buffer.byteLength(requestJson);
      if (requestJson.length > limits.max_request_bytes || requestBytes > limits.max_request_bytes) { fail('limit_exceeded','limit','request_bytes'); break; }
      const transport = { turn, request_sha256: hash(requestJson), request_bytes: requestBytes,
        response_sha256: null, response_bytes: null, response_type: null, status: 'pending' };
      report.turns.push(transport); report.transport_totals.requests_bytes += requestBytes;
      const pending = Promise.resolve().then(() => {
        if (!checkSources()) return { kind: 'source_changed' };
        if (checkStop()) return { kind: 'stopped' };
        return Promise.resolve(options.adapter({ requestJson, signal: controller.signal }))
          .then(value => ({ kind: 'response', value }), () => ({ kind: 'adapter_error' }));
      }).catch(() => ({ kind: 'adapter_error' }));
      const result = await Promise.race([pending, interruption]);
      if (checkStop() || result.kind === 'stopped') { transport.status = 'interrupted'; break; }
      if (result.kind === 'source_changed') { transport.status = 'error'; break; }
      if (result.kind === 'adapter_error') { transport.status = 'error'; fail('error','transport','adapter_threw'); break; }
      const raw = result.value;
      if (typeof raw !== 'string') { transport.status = 'error'; fail('error','protocol','non_string_response'); break; }
      if (raw.length > limits.max_response_bytes) { transport.status = 'limit_exceeded'; fail('limit_exceeded','limit','response_bytes'); break; }
      transport.response_bytes = Buffer.byteLength(raw);
      if (transport.response_bytes > limits.max_response_bytes) { transport.status = 'limit_exceeded'; fail('limit_exceeded','limit','response_bytes'); break; }
      report.transport_totals.responses_bytes += transport.response_bytes; transport.response_sha256 = hash(raw);
      let response;
      try { response = parseResponse(raw); }
      catch { transport.status = 'error'; fail('error','protocol','invalid_response'); break; }
      if (checkStop()) { transport.status = 'interrupted'; break; }
      transport.response_type = response.type;
      if (response.type === 'final') {
        if (response.text.length > limits.max_final_text_bytes || Buffer.byteLength(response.text) > limits.max_final_text_bytes) {
          transport.status = 'limit_exceeded'; fail('limit_exceeded','limit','final_text_bytes'); break;
        }
        // A final response is retained only by the evaluator, never sent to the
        // adapter again. It still counts against the complete history bound.
        if (!boundedHistory([...messages, { role: 'assistant', content: response }])) {
          transport.status = 'limit_exceeded'; fail('limit_exceeded','limit','history_bytes'); break;
        }
        if (!checkSources()) { transport.status = 'error'; break; }
        if (checkStop()) { transport.status = 'interrupted'; break; }
        if (!broker.inspect().trace_complete) { transport.status = 'limit_exceeded'; fail('limit_exceeded','limit','broker_call_limit'); break; }
        const graded = gradeArtifacts(broker, privateChecks);
        if (checkStop()) { transport.status = 'interrupted'; break; }
        report.final_text = response.text; report.final_text_sha256 = hash(response.text);
        // Keep arbitrary private IDs and grader evidence out of public logs.
        // Trusted callers can join by index/hash and inspect returned artifacts.
        report.artifact_grading = { status: graded.status, checks: graded.checks.map((check, index) => ({ index,
          id_sha256: hash(check.id), status: check.status, evidence_sha256: check.evidence === null ? null : hash(JSON.stringify(check.evidence)) })) };
        report.run_status = 'completed'; report.error = null; transport.status = 'final'; break;
      }
      const next = [...messages, { role: 'assistant', content: response }];
      if (!boundedHistory(next)) { transport.status = 'limit_exceeded'; fail('limit_exceeded','limit','history_bytes'); break; }
      const toolRequest = JSON.stringify(response.request);
      if (!checkSources()) { transport.status = 'error'; break; }
      if (checkStop()) { transport.status = 'interrupted'; break; } // Last check before any dispatch.
      const toolResult = broker.call(toolRequest);
      transport.status = toolResult.ok ? 'tool_accepted' : 'tool_denied';
      if (!broker.inspect().trace_complete) { fail('limit_exceeded','limit','broker_call_limit'); break; }
      if (checkStop()) { transport.status = 'interrupted'; break; }
      next.push({ role: 'tool', content: toolResult });
      if (!boundedHistory(next)) { fail('limit_exceeded','limit','history_bytes'); break; }
      messages.splice(0, messages.length, ...next);
      if (turn === limits.max_adapter_turns) fail('limit_exceeded','limit','adapter_turns');
    }
  } catch {
    // No exception message, stack, adapter payload, grader expectation or raw
    // tool response is copied into the report or printed by this module.
    fail('error', broker && report.turns.length ? 'driver' : 'configuration', broker && report.turns.length ? 'driver_failure' : 'invalid_configuration');
    report.artifact_grading = { status: 'not_run', checks: [] };
  } finally {
    finished = true; if (timer !== null) clearTimeout(timer);
    if (external) external.removeEventListener('abort', onAbort);
    if (report.run_status !== 'completed') report.artifact_grading = { status: 'not_run', checks: [] };
    if (broker) {
      const state = broker.inspect();
      report.broker_trace = state.trace; report.trace_complete = state.trace_complete;
      report.calls_attempted = state.calls_attempted; report.calls_not_recorded = state.calls_not_recorded;
      report.initial_manifest = state.initial_manifest; report.final_manifest = state.final_manifest;
      report.loaded_skill_entries = state.loaded_skill_entries;
      artifacts = broker.snapshot();
    }
    report.elapsed_ms = Math.max(0, performance.now() - started);
  }
  return { report, artifacts };
}

module.exports = { runTaskTrial, DEFAULT_LIMITS, CEILINGS };
