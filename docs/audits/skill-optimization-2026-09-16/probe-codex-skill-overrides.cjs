'use strict';

// Test documented per-skill overrides against the two system entries seen in v4.
// One author-only loopback request-shape probe. Never return model output, proxy traffic,
// load credentials, or execute returned actions. This is not a model evaluation.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const crypto = require('node:crypto');
const { spawn } = require('node:child_process');

const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const OUTPUT = path.join(__dirname, 'codex-tool-surface-probe-v5.json');
const LIMITS = Object.freeze({ processes: 1, timeout_ms: 30000, requests: 2, request_bytes: 2097152, output_bytes: 2097152 });
const MODEL = 'author-loopback-request-shape-probe-not-a-model';
const PROMPT = 'AUTHOR_LOCAL_SHAPE_PROBE_ONLY. This is a synthetic local request-shape probe with no sensitive data. Do not use tools or perform actions. No real model response is expected.';
// These names were checked against this installed binary's `codex features list`.
// Only supported non-removed flags are used; no global feature settings are changed.
const DISABLED = [
  'apps', 'artifact', 'auth_elicitation', 'browser_use', 'browser_use_external',
  'browser_use_full_cdp_access', 'chronicle', 'code_mode', 'code_mode_host',
  'code_mode_interrupt', 'code_mode_only', 'code_mode_prewarm', 'computer_use',
  'current_time_reminder', 'default_mode_request_user_input', 'deferred_executor',
  'deferred_tool_world_state', 'enable_mcp_apps', 'enable_request_compression',
  'exec_permission_approvals', 'executor_capability_discovery', 'external_agent_memory_import',
  'fast_mode', 'goals', 'guardian_approval', 'guardian_ext', 'guardianv2', 'hooks',
  'image_generation', 'in_app_browser', 'in_app_chat', 'in_app_dictation',
  'in_app_local_automation', 'in_app_updates', 'memories', 'multi_agent', 'multi_agent_v2',
  'network_proxy', 'plugin_sharing', 'plugins', 'recommended_plugins', 'remote_compaction_v2',
  'remote_plugin', 'request_permissions_tool', 'runtime_metrics', 'secret_auth_storage',
  'shell_snapshot', 'shell_snapshot_v2', 'shell_tool', 'shell_zsh_fork',
  'skill_mcp_dependency_install', 'skill_search', 'sleep_tool', 'standalone_web_search',
  'step_model_switching', 'tool_call_mcp_elicitation', 'tool_suggest',
  'unbounded_connection_retries', 'unified_exec', 'unified_exec_tty', 'view_image',
  'workspace_dependencies', 'worktrees'
];
const MARKERS = Object.freeze({
  probe_prompt: /AUTHOR_LOCAL_SHAPE_PROBE_ONLY/,
  skills_header: /(?:^|\n)#{1,3} Skills\b/,
  available_skills: /Available skills|<skills_instructions>/,
  skill_creator: /\bskill-creator\b/,
  openai_docs_skill: /\bopenai-docs\b/,
  repository_guidance: /Repository Agent Guidance/,
  repository_name: /CraftRoster/i,
  agent_guidance_file: /AGENTS\.md/,
  environment_context: /<environment_context>/,
  permissions_context: /<permissions instructions>|sandbox_mode|sandbox policy/i,
  system_identity: /You are (?:Codex|an? .*assistant)/,
  app_context: /<app-context>/,
  host_skill_path: /\.codex[\\/]skills|\.codex[\\/]plugins/
});
const markerSummary = text => Object.fromEntries(Object.entries(MARKERS).map(([key, re]) => [key, re.test(text)]));
const summary = text => ({ bytes: Buffer.byteLength(text), sha256: hash(text), markers: markerSummary(text) });
const safeToken = value => typeof value === 'string' && /^[A-Za-z0-9_.:-]{1,160}$/.test(value) ? value : null;

function tomlLiteral(value) {
  if (Array.isArray(value)) return `[${value.map(tomlLiteral).join(', ')}]`;
  if (value && typeof value === 'object') return `{ ${Object.entries(value).map(([key, item]) => `${JSON.stringify(key)} = ${tomlLiteral(item)}`).join(', ')} }`;
  return JSON.stringify(value);
}

function configurationDiagnostic(stderr, requestCount) {
  if (requestCount !== 0 || !/(?:invalid type|invalid value|unknown field|unknown variant|missing field|(?:load|pars|invalid|unknown).*config)/i.test(stderr)) return null;
  const lines = stderr.split(/\r?\n/).filter(line => /^(?:Error(?: loading config(?:uration)?)?:|Caused by:|\s*(?:invalid type|invalid value|unknown field|unknown variant|missing field|expected |in `|failed to (?:load|parse)|\d+:))/.test(line));
  return lines.join('\n').replace(/[A-Za-z]:[\\/][^\r\n`"']+/g, '<absolute-path>')
    .replace(/\/(?:Users|home|tmp|var)\/[^\s`"']+/g, '<absolute-path>').slice(0, 512) || null;
}

function startupDiagnostic(stderr, stdout, requestCount) {
  // Only for this fixed synthetic prompt, empty credential stores and terminal
  // loopback provider, before any request or stdout. Never a model transcript.
  if (requestCount !== 0 || stdout.length !== 0) return null;
  return stderr.slice(0, 2048).replace(/(?:Bearer\s+\S+|sk-[A-Za-z0-9_-]+)/gi, '<redacted>')
    .replace(/((?:authorization|cookie|api[_-]?key)\s*[:=])[^\r\n]*/gi, '$1<redacted>')
    .replace(/[A-Za-z]:[\\/][^\r\n`"']+/g, '<absolute-path>')
    .replace(/\/(?:Users|home|tmp|var)\/[^\s`"']+/g, '<absolute-path>').slice(0, 512) || null;
}

function summarizeRequest(bytes) {
  let body;
  try { body = JSON.parse(bytes.toString('utf8')); } catch { return { json_valid: false, bytes: bytes.length, sha256: hash(bytes) }; }
  const tools = [];
  function visitTools(items, namespace = null) {
    if (!Array.isArray(items)) return;
    for (const tool of items.slice(0, 256)) {
      if (!tool || typeof tool !== 'object') continue;
      const name = safeToken(tool.name || tool.function?.name);
      const type = safeToken(tool.type);
      tools.push({ namespace, name, type });
      if (tools.length > 256) throw new Error('tool_summary_limit');
      if (Array.isArray(tool.tools)) visitTools(tool.tools, name);
    }
  }
  visitTools(body.tools);
  const input = Array.isArray(body.input) ? body.input : [];
  const messages = input.slice(0, 256).map(item => {
    const texts = typeof item?.content === 'string' ? [item.content] : Array.isArray(item?.content)
      ? item.content.filter(part => typeof part?.text === 'string').map(part => part.text) : [];
    return { type: safeToken(item?.type), role: safeToken(item?.role), content: summary(texts.join('\n')) };
  });
  return { json_valid: true, bytes: bytes.length, sha256: hash(bytes),
    top_level_keys: Object.keys(body).map(safeToken), requested_dummy_model_matches: body.model === MODEL,
    instructions: summary(typeof body.instructions === 'string' ? body.instructions : ''),
    input_items: input.length, input_summary_truncated: input.length > 256, messages, tools,
    tools_sha256: hash(JSON.stringify(body.tools ?? null)),
    context_markers: markerSummary(JSON.stringify({ instructions: body.instructions, input: body.input })),
    streaming_requested: body.stream === true };
}

async function main() {
  const executable = process.argv[2];
  if (!executable || !path.isAbsolute(executable) || path.basename(executable).toLowerCase() !== 'codex.exe') {
    throw new Error('Provide the inspected absolute codex.exe path; no PATH lookup or provider selection is allowed.');
  }
  if (fs.existsSync(OUTPUT)) throw new Error('Probe report already exists; refusing to overwrite or repeat the probe.');
  const executableBytes = fs.readFileSync(executable);
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'craftroster-loopback-shape-'));
  const directories = Object.fromEntries(['codex-home', 'profile', 'temp', 'workspace', 'appdata', 'localappdata'].map(name => [name, path.join(scratch, name)]));
  for (const directory of Object.values(directories)) fs.mkdirSync(directory);
  const report = {
    schema_version: 1, evaluation_kind: 'local_loopback_codex_request_shape_probe', status: 'not_run',
    source_version: 5,
    previous_probe: { report: 'codex-tool-surface-probe-v4.json', harness_sha256: '20d5d7cdcb13bfdb8bf52cd7e06d2af193953b7a40e7fa939fdf5b4e01ab35ac',
      outcome: 'V4 observed request_user_input and system openai-docs/skill-creator metadata. V5 adds only documented per-skill disabled overrides for their scratch-home folder and SKILL.md paths.' },
    model_execution: false, model_calls: 0, activation_observed: false, host_isolation_enforced: false,
    started_at: new Date().toISOString(), finished_at: null, run_status: 'starting',
    harness_sha256: hash(fs.readFileSync(__filename)),
    host: { cli_version_preflight: 'codex-cli 0.154.0-alpha.6.2', executable_sha256: hash(executableBytes), node: process.version, platform: process.platform },
    documentation_checked: ['https://learn.chatgpt.com/docs/build-skills', 'https://learn.chatgpt.com/docs/config-file/config-reference'],
    limits: LIMITS, prompt: summary(PROMPT), provider: { id: 'author_loopback_probe', dummy_model: MODEL,
      address: 'http://127.0.0.1:<ephemeral>/v1', wire_api: 'responses', requires_openai_auth: false,
      request_max_retries: 0, stream_max_retries: 0, supports_websockets: false },
    disabled_features: DISABLED, enabled_features: ['skip_host_skill_discovery'],
    config: null, config_sha256: null, environment_keys: [],
    process_count: 0, request_count: 0, proxy_connect_attempts: 0, upgrade_attempts: 0, requests: [],
    child: null, error_code: null,
    cleanup: { child_closed: false, server_closed: false, scratch_removed: false },
    usage: null, cost: null, usage_complete: false,
    limitations: [
      'Author-only initial request probe; a terminal local HTTP 400 cannot assess model behavior, Skill activation, broker routing, or task success.',
      'The script never forwards requests and supplies no generated actions. Configuration and allowlisted environment do not constitute OS-level network or filesystem isolation.',
      'Proxy variables point only at the rejecting loopback server; this is defense in depth, not packet-level proof that every CLI subsystem honors proxies.',
      'No raw request instructions, HTTP headers, general child output, credentials, or personal directory paths are retained. Only zero-request configuration-startup error lines may be retained, redacted and capped at 512 characters.',
      'Feature flags were inspected for this executable before the run. No claim is made about other versions or default settings.'
    ]
  };
  let child, timer, server, closed = false;
  const sockets = new Set();
  const stop = code => { report.error_code ||= code; if (child && !closed) child.kill('SIGKILL'); };
  const terminalBody = JSON.stringify({ error: { type: 'invalid_request_error', code: 'author_probe_terminal', message: 'Local author probe complete. No model service exists here.' } });
  function reject(res) { res.writeHead(400, { 'Content-Type': 'application/json', Connection: 'close' }); res.end(terminalBody); }
  function countAttempt() { report.request_count++; if (report.request_count > LIMITS.requests) { stop('request_limit'); return false; } return true; }
  const interrupt = () => stop('interrupted');
  process.once('SIGINT', interrupt);
  process.once('SIGTERM', interrupt);
  try {
    server = http.createServer({ maxHeaderSize: 8192 }, (req, res) => {
      if (!countAttempt()) { reject(res); return; }
      const item = { ordinal: report.request_count, route: req.method === 'POST' && req.url === '/v1/responses' ? 'responses' : 'other_rejected', response_status: 400 };
      report.requests.push(item);
      let size = 0;
      const chunks = [];
      req.on('data', chunk => {
        size += chunk.length;
        if (size > LIMITS.request_bytes) { item.body_limit_exceeded = true; chunks.length = 0; reject(res); req.destroy(); stop('request_bytes_limit'); }
        else chunks.push(chunk);
      });
      req.on('end', () => {
        if (item.body_limit_exceeded) return;
        const bytes = Buffer.concat(chunks);
        try { item.body = summarizeRequest(bytes); } catch { item.summary_error = 'bounded_summary_rejected'; stop('summary_limit'); }
        reject(res);
        if (report.request_count >= LIMITS.requests) server.close();
      });
      req.on('error', () => { item.body_interrupted = true; });
    });
    server.requestTimeout = 5000;
    server.headersTimeout = 5000;
    server.keepAliveTimeout = 1000;
    server.on('connection', socket => { sockets.add(socket); socket.once('close', () => sockets.delete(socket)); });
    server.on('connect', (_req, socket) => { countAttempt(); report.proxy_connect_attempts++; socket.end('HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n'); });
    server.on('upgrade', (_req, socket) => { countAttempt(); report.upgrade_attempts++; socket.end('HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n'); });
    await new Promise((resolve, rejectListen) => { server.once('error', rejectListen); server.listen(0, '127.0.0.1', resolve); });
    const origin = `http://127.0.0.1:${server.address().port}`;
    const config = {
      model_provider: 'author_loopback_probe', model: MODEL,
      'model_providers.author_loopback_probe.name': 'Local author-only terminal mock',
      'model_providers.author_loopback_probe.base_url': `${origin}/v1`,
      'model_providers.author_loopback_probe.wire_api': 'responses',
      'model_providers.author_loopback_probe.requires_openai_auth': false,
      'model_providers.author_loopback_probe.request_max_retries': 0,
      'model_providers.author_loopback_probe.stream_max_retries': 0,
      'model_providers.author_loopback_probe.stream_idle_timeout_ms': 5000,
      'model_providers.author_loopback_probe.supports_websockets': false,
      'model_providers.author_loopback_probe.supports_standalone_web_search': false,
      cli_auth_credentials_store: 'file', mcp_oauth_credentials_store: 'file',
      web_search: 'disabled', 'agents.enabled': false,
      'analytics.enabled': false, 'feedback.enabled': false, check_for_update_on_startup: false,
      'otel.exporter': 'none', 'otel.trace_exporter': 'none', 'otel.metrics_exporter': 'none', 'otel.log_user_prompt': false,
      'memories.generate_memories': false, 'memories.use_memories': false,
      project_doc_max_bytes: 0, project_root_markers: [], allow_login_shell: false,
      'shell_environment_policy.inherit': 'none', approval_policy: 'never'
    };
    // Docs describe both a skill folder and SKILL.md path. Test both forms for
    // known system entries in this new empty scratch home, never the real home.
    config['skills.config'] = ['openai-docs', 'skill-creator'].flatMap(name => {
      const directory = path.join(directories['codex-home'], 'skills', '.system', name);
      return [directory, path.join(directory, 'SKILL.md')].map(skillPath => ({ path: skillPath, enabled: false }));
    });
    report.config = { ...config, 'model_providers.author_loopback_probe.base_url': 'http://127.0.0.1:<ephemeral>/v1',
      'skills.config': config['skills.config'].map(item => ({ ...item, path: `<scratch>/${path.relative(scratch, item.path).replaceAll('\\', '/')}` })) };
    report.config_sha256 = hash(JSON.stringify(config));
    const env = {
      SystemRoot: process.env.SystemRoot || 'C:\\Windows', WINDIR: process.env.SystemRoot || 'C:\\Windows',
      PATH: path.join(process.env.SystemRoot || 'C:\\Windows', 'System32'),
      CODEX_HOME: directories['codex-home'], HOME: directories.profile, USERPROFILE: directories.profile,
      APPDATA: directories.appdata, LOCALAPPDATA: directories.localappdata, TEMP: directories.temp, TMP: directories.temp,
      HTTP_PROXY: origin, HTTPS_PROXY: origin, ALL_PROXY: origin, NO_PROXY: '127.0.0.1,localhost,::1',
      OTEL_SDK_DISABLED: 'true', OTEL_TRACES_EXPORTER: 'none', OTEL_METRICS_EXPORTER: 'none', OTEL_LOGS_EXPORTER: 'none',
      DO_NOT_TRACK: '1', TERM: 'dumb', NO_COLOR: '1'
    };
    report.environment_keys = Object.keys(env).sort();
    const args = ['exec', '--ignore-user-config', '--ignore-rules', '--strict-config', '--ephemeral', '--sandbox', 'read-only',
      '--skip-git-repo-check', '--json', '--color', 'never', '-C', directories.workspace,
      ...Object.entries(config).flatMap(([key, value]) => ['-c', `${key}=${tomlLiteral(value)}`]),
      ...DISABLED.flatMap(feature => ['--disable', feature]), '--enable', 'skip_host_skill_discovery', '-'];
    const output = { stdout: [], stderr: [], stdout_bytes: 0, stderr_bytes: 0 };
    timer = setTimeout(() => stop('timeout'), LIMITS.timeout_ms);
    report.process_count = 1;
    child = spawn(executable, args, { cwd: directories.workspace, env, shell: false, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
    for (const name of ['stdout', 'stderr']) child[name].on('data', bytes => {
      output[`${name}_bytes`] += bytes.length;
      if (output.stdout_bytes + output.stderr_bytes > LIMITS.output_bytes) stop('child_output_limit');
      else output[name].push(bytes);
    });
    child.stdin.on('error', () => {});
    child.stdin.end(PROMPT);
    const result = await new Promise(resolve => {
      child.once('error', error => { report.error_code = ['EACCES', 'EPERM', 'ENOENT'].includes(error.code) ? `spawn_${error.code}` : 'spawn_error'; });
      child.once('close', (code, signal) => { closed = true; resolve({ exit_code: code, signal: safeToken(signal) }); });
    });
    const stderr = Buffer.concat(output.stderr).toString('utf8');
    const stdout = Buffer.concat(output.stdout).toString('utf8');
    report.child = { ...result, stdout: { bytes: output.stdout_bytes, sha256: hash(stdout) }, stderr: { bytes: output.stderr_bytes, sha256: hash(stderr) },
      configuration_diagnostic: configurationDiagnostic(stderr, report.request_count),
      startup_diagnostic: startupDiagnostic(stderr, stdout, report.request_count),
      output_markers: {
        terminal_400: /400|author_probe_terminal/.test(stderr + stdout),
        configuration_error: /unknown (?:configuration field|field|feature|variant)|invalid (?:type|value)|unrecognized|invalid config|failed to (?:load|parse).*config|Error loading config/i.test(stderr + stdout),
        authentication_error: /(?:missing|invalid).*api key|not logged in|authentication required/i.test(stderr + stdout),
        generated_action_event: /"type"\s*:\s*"(?:command_execution|mcp_tool_call|web_search|file_change)"/.test(stdout)
      } };
    report.run_status = report.error_code ? 'blocked' : report.requests.some(item => item.route === 'responses' && item.body?.json_valid) ? 'request_observed' : 'no_request_observed';
  } catch (error) {
    report.error_code ||= ['EACCES', 'EPERM', 'EADDRINUSE'].includes(error.code) ? error.code : 'probe_setup_or_runtime_error';
    report.run_status = 'blocked';
  } finally {
    clearTimeout(timer);
    if (child && !closed) { child.kill('SIGKILL'); await new Promise(resolve => child.once('close', resolve)); closed = true; }
    report.cleanup.child_closed = !child || closed;
    for (const socket of sockets) socket.destroy();
    if (server) { await new Promise(resolve => server.close(() => resolve())); report.cleanup.server_closed = !server.listening; }
    else report.cleanup.server_closed = true;
    const resolved = path.resolve(scratch);
    if (path.dirname(resolved) !== path.resolve(os.tmpdir()) || !path.basename(resolved).startsWith('craftroster-loopback-shape-')) throw new Error('Scratch cleanup boundary refused.');
    fs.rmSync(resolved, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
    report.cleanup.scratch_removed = !fs.existsSync(resolved);
    process.removeListener('SIGINT', interrupt);
    process.removeListener('SIGTERM', interrupt);
    report.finished_at = new Date().toISOString();
    if (hash(fs.readFileSync(__filename)) !== report.harness_sha256) throw new Error('Probe source changed during execution; no report recorded.');
    fs.writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`, { flag: 'wx' });
  }
  console.log(JSON.stringify({ report: path.basename(OUTPUT), run_status: report.run_status, request_count: report.request_count, error_code: report.error_code, cleanup: report.cleanup }));
}
main().catch(() => { console.error('Local probe refused or could not safely complete; no raw error payload retained.'); process.exitCode = 1; });
