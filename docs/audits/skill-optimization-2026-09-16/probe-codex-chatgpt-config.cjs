/* Author-only local preflight: no exec/login/model discovery and no inherited credentials. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');

const exe = 'C:\\Users\\win10\\AppData\\Local\\OpenAI\\Codex\\bin\\12219cbfbcbddde7\\codex.exe';
const expectedExeSha256 = '960c111d47afd61669954b9df9e56083e302edbfa3ef6962d81dcc14a30051dc';
const output = path.join(__dirname, 'codex-chatgpt-config-preflight-v2.json');
const priorOutput = path.join(__dirname, 'codex-chatgpt-config-preflight.json');
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const report = {
  schema_version: 1,
  purpose: 'Native features list -c configuration acceptance only; not strict exec, authentication, or provider execution evidence',
  started_at: new Date().toISOString(),
  status: 'error',
  source: { path: path.basename(__filename), sha256: sha(fs.readFileSync(__filename)) },
  executable: { path: exe, expected_sha256: expectedExeSha256, sha256: sha(fs.readFileSync(exe)), version: null },
  prior_strict_preflight: {
    path: path.basename(priorOutput), sha256: sha(fs.readFileSync(priorOutput)),
    status: 'unsupported_or_error',
    followup_diagnostic_command: ['--strict-config', 'features', 'list'],
    followup_diagnostic_exit_code: 1,
    followup_diagnostic_stderr: 'Error: `--strict-config` is not supported for `codex features`\n',
    followup_diagnostic_cleanup: true,
    provenance: 'Separately observed in a new empty temporary home and sanitized environment before this version; not rerun here',
  },
  official_source: {
    url: 'https://learn.chatgpt.com/docs/config-file/config-reference',
    accessed_on: '2026-09-16',
    documented_settings: { forced_login_method: ['chatgpt', 'api'], model_provider: 'Provider id; default openai' },
  },
  commands: [],
  child_environment_keys: [],
  temporary_home_initially_empty: false,
  intended_model_commands: 0,
  intended_login_commands: 0,
  intended_model_discovery_commands: 0,
  real_auth_or_personal_config_read_by_recorder: false,
  inherited_credential_environment: false,
  effective_authentication: 'unverified',
  effective_model_provider: 'unverified',
  strict_exec_configuration: 'unverified; features subcommand explicitly rejects --strict-config',
  cleanup: { temporary_directory_removed: false },
  limitations: [
    'features list with -c acceptance proves local parsing only; it does not authenticate or make a model/provider request.',
    'The native features subcommand rejects --strict-config. Successful -c parsing must not be described as a strict-exec preflight.',
    'Empty redirected CODEX_HOME, user/profile directories and explicit file credential stores prevent this preflight from intentionally using the real user auth/config store.',
    'Loopback proxy environment and disabled telemetry/update settings are application controls, not OS network isolation or packet-capture proof.',
    'Running the real CLI against the original CODEX_HOME may normally write caches/logs and refresh tokens; it must not be described as leaving all host state untouched.',
    'No provider request cap, model availability, account entitlement, effective model, or token usage is established by this preflight.',
  ],
};
let scratch;
let spawnBlocked = false;

function run(label, args, env, cwd) {
  const start = new Date();
  const result = spawnSync(exe, args, { cwd, env, encoding: 'utf8', windowsHide: true,
    timeout: 20000, maxBuffer: 262144, input: '', shell: false });
  const stdout = result.stdout || '';
  const stderr = result.stderr || '';
  const lines = stdout.split(/\r?\n/).filter(Boolean);
  const featureLines = lines.filter(line => /^[a-z][a-z0-9_]*\s+[^\r\n]+\s+(true|false)\s*$/.test(line));
  const command = {
    label, args, started_at: start.toISOString(), finished_at: new Date().toISOString(),
    elapsed_ms: Date.now() - start.getTime(), exit_code: result.status, signal: result.signal,
    process_error_code: result.error?.code || null,
    stdout_bytes: Buffer.byteLength(stdout), stderr_bytes: Buffer.byteLength(stderr),
    feature_line_count: featureLines.length,
    output_summary: {
      has_strict_config_help: stdout.includes('--strict-config'),
      has_config_override_help: stdout.includes('--config <key=value>'),
      invalid_forced_login_method: /unknown variant [`'"]author_invalid[`'"]/.test(stderr) && /chatgpt/.test(stderr) && /api/.test(stderr),
      rejected_unknown_argument: /unexpected argument|unrecognized (option|argument)/i.test(stderr),
      auth_or_login_diagnostic: /not logged in|authentication required|please (log|sign) in/i.test(stderr),
      stderr_present: stderr.length > 0,
    },
  };
  if (label === 'version') {
    const match = stdout.trim().match(/^codex-cli [a-zA-Z0-9.+-]+$/);
    if (match) report.executable.version = match[0];
  }
  // Persist only fixed-shape summaries. Neither arbitrary diagnostics nor raw output is retained.
  report.commands.push(command);
  if (result.error?.code === 'EPERM') { spawnBlocked = true; throw new Error('spawn_blocked'); }
  return command;
}

try {
  if (fs.existsSync(output)) throw new Error('output_exists');
  if (report.executable.sha256 !== expectedExeSha256) throw new Error('executable_hash_mismatch');
  const temporaryParent = fs.realpathSync(os.tmpdir());
  scratch = fs.mkdtempSync(path.join(temporaryParent, 'craftroster-chatgpt-config-'));
  const dirs = Object.fromEntries(['codex-home', 'profile', 'appdata', 'localappdata', 'temp', 'workspace']
    .map(name => { const p = path.join(scratch, name); fs.mkdirSync(p); return [name, p]; }));
  report.temporary_home_initially_empty = fs.readdirSync(dirs['codex-home']).length === 0;
  const env = {
    SystemRoot: 'C:\\Windows', WINDIR: 'C:\\Windows', PATH: 'C:\\Windows\\System32',
    CODEX_HOME: dirs['codex-home'], HOME: dirs.profile, USERPROFILE: dirs.profile,
    APPDATA: dirs.appdata, LOCALAPPDATA: dirs.localappdata, TEMP: dirs.temp, TMP: dirs.temp,
    HTTP_PROXY: 'http://127.0.0.1:9', HTTPS_PROXY: 'http://127.0.0.1:9', ALL_PROXY: 'http://127.0.0.1:9',
    NO_PROXY: '127.0.0.1,localhost,::1', OTEL_SDK_DISABLED: 'true', OTEL_TRACES_EXPORTER: 'none',
    OTEL_METRICS_EXPORTER: 'none', OTEL_LOGS_EXPORTER: 'none', DO_NOT_TRACK: '1', TERM: 'dumb', NO_COLOR: '1',
  };
  report.child_environment_keys = Object.keys(env).sort();
  report.environment_policy = {
    inheritance: 'none; fixed allowlist only', profile_and_state_locations: 'new temporary subtree',
    proxy: 'closed loopback discard port; no forwarding server', credential_store: 'file in empty temporary CODEX_HOME',
  };
  const commonConfig = {
    cli_auth_credentials_store: 'file', mcp_oauth_credentials_store: 'file',
    'analytics.enabled': false, 'feedback.enabled': false, check_for_update_on_startup: false,
    'otel.exporter': 'none', 'otel.trace_exporter': 'none', 'otel.metrics_exporter': 'none',
  };
  const commonArgs = Object.entries(commonConfig).flatMap(([key, value]) => ['-c', `${key}=${JSON.stringify(value)}`]);
  const version = run('version', ['--version'], env, dirs.workspace);
  const help = run('native_help', ['--help'], env, dirs.workspace);
  const valid = run('valid_chatgpt_openai', [...commonArgs, '-c', 'forced_login_method="chatgpt"', '-c', 'model_provider="openai"', 'features', 'list'], env, dirs.workspace);
  const invalid = run('invalid_login_method_control', [...commonArgs, '-c', 'forced_login_method="author_invalid"', '-c', 'model_provider="openai"', 'features', 'list'], env, dirs.workspace);
  report.findings = {
    version_observed: version.exit_code === 0 && report.executable.version !== null,
    native_help_documents_strict_config: help.exit_code === 0 && help.output_summary.has_strict_config_help,
    requested_settings_accepted: valid.exit_code === 0 && valid.process_error_code === null && valid.feature_line_count > 0,
    invalid_enum_rejected: invalid.exit_code !== null && invalid.exit_code !== 0 && invalid.output_summary.invalid_forced_login_method,
  };
  report.status = Object.values(report.findings).every(Boolean) ? 'passed_local_config_preflight' : 'unsupported_or_error';
} catch (error) {
  report.error_code = ['output_exists', 'executable_hash_mismatch', 'spawn_blocked'].includes(error.message) ? error.message : 'local_preflight_error';
} finally {
  if (scratch) {
    const temporaryParent = fs.realpathSync(os.tmpdir());
    const resolved = path.resolve(scratch);
    if (path.dirname(resolved) === temporaryParent && path.basename(resolved).startsWith('craftroster-chatgpt-config-')) {
      try { fs.rmSync(resolved, { recursive: true, force: true, maxRetries: 3 }); report.cleanup.temporary_directory_removed = !fs.existsSync(resolved); }
      catch { report.cleanup.temporary_directory_removed = false; }
    }
  }
  if (!report.cleanup.temporary_directory_removed) report.status = 'error';
  report.executable.sha256_after = sha(fs.readFileSync(exe));
  report.executable.unchanged = report.executable.sha256_after === report.executable.sha256;
  if (!report.executable.unchanged) report.status = 'error';
  report.finished_at = new Date().toISOString();
}

// An EPERM before child creation is an environment failure, not a completed probe.
// Do not occupy the final immutable artifact path so an identical approved local retry can run.
if (!spawnBlocked && report.error_code !== 'output_exists') fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
process.stdout.write(JSON.stringify({ status: report.status, error_code: report.error_code || null,
  output_written: !spawnBlocked && report.error_code !== 'output_exists', findings: report.findings || null,
  commands: report.commands, cleanup: report.cleanup }) + '\n');
process.exitCode = report.status === 'passed_local_config_preflight' ? 0 : 1;
