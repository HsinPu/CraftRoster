'use strict';

// The only execution entry is executeTurn. Construction is a local preflight;
// it never starts Codex, reads authentication/config contents, or copies them.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { spawn } = require('node:child_process');
const { performance } = require('node:perf_hooks');
const CLOSE_GRACE_MS = 5000;
const PREFIX = 'craftroster-codex-exec-';
const CEILINGS = { max_request_bytes: 8388608, max_stdout_bytes: 8388608, max_stderr_bytes: 1048576, timeout_ms: 120000 };
const EFFORTS = ['none','minimal','low','medium','high','xhigh','max','ultra'];
const DISABLED = (`apps artifact auth_elicitation browser_use browser_use_external browser_use_full_cdp_access
chronicle code_mode code_mode_host code_mode_interrupt code_mode_only code_mode_prewarm computer_use
current_time_reminder default_mode_request_user_input deferred_executor deferred_tool_world_state
enable_mcp_apps enable_request_compression exec_permission_approvals executor_capability_discovery
external_agent_memory_import fast_mode goals guardian_approval guardian_ext guardianv2 hooks image_generation
in_app_browser in_app_chat in_app_dictation in_app_local_automation in_app_updates memories multi_agent multi_agent_v2
network_proxy plugin_sharing plugins recommended_plugins remote_compaction_v2 remote_plugin request_permissions_tool
runtime_metrics secret_auth_storage shell_snapshot shell_snapshot_v2 shell_tool shell_zsh_fork
skill_mcp_dependency_install skill_search sleep_tool standalone_web_search step_model_switching
tool_call_mcp_elicitation tool_suggest unbounded_connection_retries unified_exec unified_exec_tty view_image
workspace_dependencies worktrees`).split(/\s+/);
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const copy = value => JSON.parse(JSON.stringify(value));
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const exact = (value, keys) => object(value) && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
class ExecutorError extends Error {
  constructor(code) { super(`Codex executor: ${code}`); this.name = 'CodexExecutorError'; this.code = code; }
}
const error = code => new ExecutorError(code);
function realPath(value, directory) {
  if (typeof value !== 'string' || !path.isAbsolute(value)) throw error('invalid_path');
  const resolved = path.resolve(value);
  try {
    if (fs.realpathSync(resolved) !== resolved || (directory ? !fs.statSync(resolved).isDirectory() : !fs.statSync(resolved).isFile())) throw error('invalid_path');
  } catch { throw error('invalid_path'); }
  return resolved;
}
function toml(value) {
  if (Array.isArray(value)) return `[${value.map(toml).join(', ')}]`;
  if (object(value)) return `{ ${Object.entries(value).map(([key, item]) => `${JSON.stringify(key)} = ${toml(item)}`).join(', ')} }`;
  return JSON.stringify(value);
}
function jsonSchema(value) {
  const seen = new Set();
  function check(item, depth) {
    if (depth > 64) throw error('invalid_request');
    if (item === null || typeof item === 'string' || typeof item === 'boolean' || (typeof item === 'number' && Number.isFinite(item))) return;
    if (!item || typeof item !== 'object' || seen.has(item) || (!Array.isArray(item) && ![Object.prototype, null].includes(Object.getPrototypeOf(item)))) throw error('invalid_request');
    seen.add(item);
    for (const descriptor of Object.values(Object.getOwnPropertyDescriptors(item))) {
      if (descriptor.get || descriptor.set) throw error('invalid_request');
      if (descriptor.enumerable) check(descriptor.value, depth + 1);
    }
    seen.delete(item);
  }
  if (!object(value)) throw error('invalid_request');
  check(value, 0);
  return JSON.stringify(value);
}

function createCodexExecutor(options) {
  if (!object(options) || Object.keys(options).some(key => !['executable','executableSha256','codexHome','model','effort','spawnImpl'].includes(key))
    || typeof options.executableSha256 !== 'string' || !/^[a-f0-9]{64}$/i.test(options.executableSha256)
    || typeof options.model !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._:/-]{0,199}$/.test(options.model)
    || !EFFORTS.includes(options.effort) || (options.spawnImpl !== undefined && typeof options.spawnImpl !== 'function')) throw error('invalid_configuration');
  const executable = realPath(options.executable, false), codexHome = realPath(options.codexHome, true);
  if (path.basename(executable).toLowerCase() !== 'codex.exe') throw error('invalid_path');
  const executableSha256 = options.executableSha256.toLowerCase(), { model, effort } = options;
  const spawnImpl = options.spawnImpl || spawn, injected = options.spawnImpl !== undefined;
  function verifyExecutable() {
    if (realPath(executable, false) !== executable || hash(fs.readFileSync(executable)) !== executableSha256) throw error('executable_drift');
    if (realPath(codexHome, true) !== codexHome) throw error('home_drift');
  }
  verifyExecutable();
  // Deliberately read only these named path variables, never all of process.env.
  const profile = realPath(process.env.USERPROFILE || os.homedir(), true);
  const systemRoot = realPath(process.env.SystemRoot || 'C:\\Windows', true);
  const appData = realPath(process.env.APPDATA || path.join(profile, 'AppData', 'Roaming'), true);
  const localAppData = realPath(process.env.LOCALAPPDATA || path.join(profile, 'AppData', 'Local'), true);
  const tempRoot = fs.realpathSync(os.tmpdir());
  const config = { suppress_unstable_features_warning: true, model_provider: 'openai', forced_login_method: 'chatgpt', model,
    model_reasoning_effort: effort, cli_auth_credentials_store: 'file', mcp_oauth_credentials_store: 'file',
    web_search: 'disabled', 'agents.enabled': false, 'analytics.enabled': false, 'feedback.enabled': false,
    check_for_update_on_startup: false, 'otel.exporter': 'none', 'otel.trace_exporter': 'none', 'otel.metrics_exporter': 'none',
    'otel.log_user_prompt': false, 'memories.generate_memories': false, 'memories.use_memories': false,
    project_doc_max_bytes: 0, project_root_markers: [], allow_login_shell: false,
    'shell_environment_policy.inherit': 'none', approval_policy: 'never',
    'skills.config': ['openai-docs','skill-creator'].flatMap(name => {
      const directory = path.join(codexHome, 'skills', '.system', name);
      return [directory, path.join(directory, 'SKILL.md')].map(skillPath => ({ path: skillPath, enabled: false }));
    }) };
  const environment = temporary => ({ SystemRoot: systemRoot, WINDIR: systemRoot, PATH: path.join(systemRoot, 'System32'),
    CODEX_HOME: codexHome, HOME: profile, USERPROFILE: profile, APPDATA: appData, LOCALAPPDATA: localAppData,
    TEMP: temporary, TMP: temporary, OTEL_SDK_DISABLED: 'true', OTEL_TRACES_EXPORTER: 'none', OTEL_METRICS_EXPORTER: 'none',
    OTEL_LOGS_EXPORTER: 'none', DO_NOT_TRACK: '1', TERM: 'dumb', NO_COLOR: '1' });
  const argumentsFor = (workspace, schema) => ['exec', '--ignore-user-config', '--ignore-rules', '--strict-config', '--ephemeral',
    '--sandbox', 'read-only', '--skip-git-repo-check', '--json', '--color', 'never', '--output-schema', schema, '-C', workspace,
    ...Object.entries(config).flatMap(([key, value]) => ['-c', `${key}=${toml(value)}`]),
    ...DISABLED.flatMap(feature => ['--disable', feature]), '--enable', 'skip_host_skill_discovery', '-'];
  const launch = { executable, executable_sha256: executableSha256, codex_home: codexHome, model, effort,
    args: argumentsFor('<scratch>/workspace', '<scratch>/output-schema.json'), environment: environment('<scratch>/temp'),
    cwd: '<scratch>/workspace', shell: false, windowsHide: true, stdio: ['pipe','pipe','pipe'], close_grace_ms: CLOSE_GRACE_MS };
  const configurationHash = hash(JSON.stringify(launch)), attempts = [];
  let active = null, disposed = false;
  function cleanup(state) {
    if (!state.record.cleanup.child_closed || state.record.cleanup.scratch_removed) return;
    try {
      const resolved = path.resolve(state.scratch);
      if (path.dirname(resolved) !== tempRoot || !path.basename(resolved).startsWith(PREFIX)
        || fs.realpathSync(resolved) !== resolved) throw error('cleanup_boundary');
      fs.rmSync(resolved, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
      state.record.cleanup.scratch_removed = !fs.existsSync(resolved);
    } catch { state.record.error_code ||= 'cleanup_failed'; }
  }
  async function executeTurn(input) {
    if (disposed) throw error('executor_closed');
    if (active) throw error('concurrent_execution');
    if (!exact(input, ['prompt','outputSchema','model','effort','signal','limits']) || typeof input.prompt !== 'string'
      || input.model !== model || input.effort !== effort || !(input.signal instanceof AbortSignal)
      || !exact(input.limits, Object.keys(CEILINGS)) || Object.entries(input.limits).some(([key, value]) => !Number.isSafeInteger(value) || value < 1 || value > CEILINGS[key])) throw error('invalid_request');
    if (input.signal.aborted) throw error('cancelled');
    const limits = { ...input.limits }, prompt = input.prompt;
    if (prompt.length > limits.max_request_bytes || Buffer.byteLength(prompt) > limits.max_request_bytes) throw error('request_bytes');
    const schema = jsonSchema(input.outputSchema);
    const serialized = JSON.stringify({ prompt, outputSchema: JSON.parse(schema), model, effort, limits });
    if (serialized.length > limits.max_request_bytes || Buffer.byteLength(serialized) > limits.max_request_bytes) throw error('request_bytes');
    verifyExecutable();
    const scratch = fs.mkdtempSync(path.join(tempRoot, PREFIX));
    const record = { attempt: attempts.length + 1, status: 'starting', error_code: null, executable_sha256: executableSha256,
      request_sha256: hash(serialized), request_bytes: Buffer.byteLength(serialized), schema_sha256: hash(schema),
      stdout_bytes: 0, stderr_bytes: 0, exit_code: null, elapsed_ms: null,
      cleanup: { child_closed: true, scratch_removed: false } };
    attempts.push(record);
    const state = { scratch, record, child: null, stop: null, closed: null, waiting: null };
    active = state;
    const started = performance.now();
    let timer, graceTimer, onAbort, completedOutput, detached = false;
    try {
      const workspace = path.join(scratch, 'workspace'), temporary = path.join(scratch, 'temp'), schemaPath = path.join(scratch, 'output-schema.json');
      fs.mkdirSync(workspace); fs.mkdirSync(temporary); fs.writeFileSync(schemaPath, schema + '\n', { flag: 'wx' });
      const args = argumentsFor(workspace, schemaPath), env = environment(temporary);
      const buffers = { stdout: Buffer.allocUnsafe(limits.max_stdout_bytes), stderr: Buffer.allocUnsafe(limits.max_stderr_bytes) };
      const sizes = { stdout: 0, stderr: 0 }, oversized = { stdout: false, stderr: false };
      let resolveClose, resolveGrace;
      state.closed = new Promise(resolve => { resolveClose = resolve; });
      const grace = new Promise(resolve => { resolveGrace = resolve; });
      state.waiting = Promise.race([state.closed.then(() => 'closed'), grace]);
      state.stop = code => {
        record.error_code ||= code;
        if (record.cleanup.child_closed) return;
        try { state.child.kill('SIGKILL'); } catch { /* retain close failure, never raw process errors */ }
        if (!graceTimer) graceTimer = setTimeout(() => resolveGrace('close_timeout'), CLOSE_GRACE_MS);
      };
      // Pin the binary again immediately before the only spawn call.
      verifyExecutable();
      if (input.signal.aborted) throw error('cancelled');
      if (performance.now() - started >= limits.timeout_ms) throw error('timed_out');
      const child = spawnImpl(executable, args, { cwd: workspace, env, shell: false, windowsHide: true, stdio: ['pipe','pipe','pipe'] });
      state.child = child; record.cleanup.child_closed = false; record.status = 'running';
      child.once('error', () => state.stop('spawn_error'));
      child.once('close', code => {
        record.cleanup.child_closed = true;
        clearTimeout(graceTimer); clearTimeout(timer);
        if (onAbort) input.signal.removeEventListener('abort', onAbort);
        if (record.elapsed_ms === null) record.exit_code = Number.isSafeInteger(code) ? code : null;
        resolveClose();
        if (detached) { cleanup(state); if (active === state) active = null; }
      });
      for (const name of ['stdout','stderr']) {
        child[name].on('error', () => state.stop(`${name}_error`));
        child[name].on('data', chunk => {
          if (record.elapsed_ms !== null || record.cleanup.child_closed) return;
          if (!(chunk instanceof Uint8Array)) { state.stop(`${name}_invalid_chunk`); return; }
          record[`${name}_bytes`] += chunk.byteLength;
          if (oversized[name]) return;
          if (sizes[name] + chunk.byteLength > limits[`max_${name}_bytes`]) { oversized[name] = true; state.stop(`${name}_bytes`); return; }
          buffers[name].set(chunk, sizes[name]); sizes[name] += chunk.byteLength;
        });
      }
      child.stdin.on('error', () => state.stop('stdin_error'));
      onAbort = () => state.stop('cancelled'); input.signal.addEventListener('abort', onAbort, { once: true });
      timer = setTimeout(() => state.stop('timed_out'), Math.max(1, limits.timeout_ms - (performance.now() - started)));
      if (input.signal.aborted) state.stop('cancelled');
      else child.stdin.end(prompt);
      if (await state.waiting !== 'closed') {
        detached = true; record.error_code = 'close_timeout'; throw error('close_timeout');
      }
      if (input.signal.aborted) throw error('cancelled');
      if (performance.now() - started >= limits.timeout_ms) throw error('timed_out');
      if (['cancelled','timed_out','closed'].includes(record.error_code)) throw error(record.error_code);
      if (oversized.stdout || ['stdout_error','stdout_invalid_chunk'].includes(record.error_code)) throw error(record.error_code || 'stdout_bytes');
      const stdoutBytes = buffers.stdout.subarray(0, sizes.stdout), stdout = stdoutBytes.toString('utf8');
      if (!Buffer.from(stdout).equals(stdoutBytes)) throw error('stdout_invalid_utf8');
      let stderr = '';
      if (!oversized.stderr) {
        const bytes = buffers.stderr.subarray(0, sizes.stderr); stderr = bytes.toString('utf8');
        if (!Buffer.from(stderr).equals(bytes)) { record.error_code ||= 'stderr_invalid_utf8'; stderr = ''; }
      }
      if (performance.now() - started >= limits.timeout_ms) throw error('timed_out');
      record.status = !record.error_code && record.exit_code === 0 ? 'completed' : 'error';
      completedOutput = { stdout, stderr: record.error_code ? '' : stderr, exit_code: record.error_code ? null : record.exit_code };
      return completedOutput;
    } catch (cause) {
      const code = cause instanceof ExecutorError ? cause.code : 'execution_error';
      record.error_code ||= code; record.status = 'error';
      if (state.child && !record.cleanup.child_closed && !detached) {
        state.stop(code);
        if (await state.waiting !== 'closed') { detached = true; record.error_code = 'close_timeout'; }
      }
      throw error(record.error_code);
    } finally {
      clearTimeout(timer); if (onAbort) input.signal.removeEventListener('abort', onAbort);
      record.elapsed_ms = Math.max(0, performance.now() - started);
      if (record.cleanup.child_closed) {
        clearTimeout(graceTimer); cleanup(state); if (active === state) active = null;
        if (!record.cleanup.scratch_removed) {
          record.status = 'error';
          // Only an already decoded, complete bounded stdout can preserve usage.
          // Change the returned status before resolution so cleanup can never pass.
          if (completedOutput) { completedOutput.stderr = ''; completedOutput.exit_code = null; }
          else throw error('cleanup_failed');
        }
      }
    }
  }
  async function close() {
    disposed = true;
    const current = active;
    if (!current) return;
    current.stop?.('closed');
    if (current.waiting && await current.waiting !== 'closed') throw error('close_timeout');
    if (!current.record.cleanup.child_closed) throw error('close_timeout');
    cleanup(current); if (active === current) active = null;
    if (!current.record.cleanup.scratch_removed) throw error('cleanup_failed');
  }
  return Object.freeze({ executeTurn, close, inspect: () => copy({ schema_version: 1, evaluation_kind: 'codex_cli_executor', status: 'not_run',
    configuration_sha256: configurationHash, executable_sha256: executableSha256, executable_path_sha256: hash(executable), codex_home_path_sha256: hash(codexHome),
    model_requested: model, effort_requested: effort, model_effective: null, effort_effective: null, model_execution: injected ? false : null,
    injected_process: injected, provider_requests: null, provider_requests_enforced: false, host_isolation_enforced: false,
    launch: { model_provider: 'openai', forced_login_method: 'chatgpt', disabled_features: DISABLED, enabled_features: ['skip_host_skill_discovery'],
      environment_keys: Object.keys(environment('<scratch>/temp')).sort(), output_schema_path: '<scratch>/output-schema.json',
      cwd: '<scratch>/workspace', shell: false, windowsHide: true, close_grace_ms: CLOSE_GRACE_MS },
    closed: disposed, in_flight: active !== null, attempts,
    limitations: ['The caller must authorize any real execution; constructing or inspecting this factory starts nothing.',
      'The provided existing Codex home is passed by path only. The executor never reads or copies auth/config contents; Codex itself may write normal cache, logs or refreshed authentication.',
      'Built-in OpenAI with ChatGPT login is fixed. No API-key environment, proxy, custom provider, base URL, retry override or model fallback is supplied.',
      'A process can make multiple provider requests. Process budgets belong to the transport; provider request counts and costs remain unknown.',
      'Disabled tools, an empty working directory and read-only CLI settings do not prove OS isolation or authenticated tool parity.',
      'Close timeout preserves the tracked child and scratch until its actual close event. A still-tracked child blocks every subsequent launch.',
      'A complete bounded stdout may accompany exit_code null after stderr or cleanup failure, so the transport can preserve reported usage while rejecting the action. Cleanup failures remain recorded and raw outputs are never retained in inspect.'] }) });
}
module.exports = { createCodexExecutor };
