'use strict';

// A JSON-only virtual file service. This is not a JavaScript/OS sandbox.
// A future model adapter must expose only call(), never the inspector or host tools.
const crypto = require('crypto');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
// Capture provenance when this module executes, including when later callers
// receive this instance from require.cache. Broker requests never read files.
const loadedSourceSha256 = hash(fs.readFileSync(__filename));
const copy = value => JSON.parse(JSON.stringify(value));
const ordered = values => [...values].sort((a, b) => a < b ? -1 : a > b ? 1 : 0);
const LIMITS = { max_file_bytes: 4 * 1024 * 1024, max_total_bytes: 64 * 1024 * 1024, max_calls: 1000 };
const TOOL_KEYS = {
  list_files: ['prefix'], read_file: ['path', 'encoding'],
  write_file: ['path', 'content', 'encoding'], delete_file: ['path'],
};

function validPath(value) {
  return typeof value === 'string' && value.length > 0 && value.length <= 1024
    && !/[\\\x00-\x1f\x7f:<>"|?*]/.test(value) && !value.startsWith('/')
    && value === value.normalize('NFC')
    && value.split('/').every(part => part && part !== '.' && part !== '..' && !/[. ]$/.test(part)
      && !/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part));
}

function publicPath(value) {
  return validPath(value) && (['task.txt', 'skill-catalog.json'].includes(value)
    || value.startsWith('workspace/') || value.startsWith('skills/'))
    && !value.split('/').some(part => ['evals', '.git', '.codex', '.agents'].includes(part.toLowerCase()));
}

function manifest(files) {
  return ordered(files.keys()).map(path => ({ path, sha256: hash(files.get(path)), bytes: files.get(path).length }));
}

function collision(files, candidate, allowExact) {
  const lower = candidate.toLowerCase();
  return [...files.keys()].some(existing => {
    if (allowExact && existing === candidate) return false;
    const other = existing.toLowerCase();
    if (other === lower || other.startsWith(lower + '/') || lower.startsWith(other + '/')) return true;
    // Reject differently cased directory names too, including paths with distinct basenames.
    const a = existing.split('/'), b = candidate.split('/');
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
      if (a[i].toLowerCase() !== b[i].toLowerCase()) break;
      if (a[i] !== b[i]) return true;
    }
    return false;
  });
}

function createBroker(publicFiles, options = {}) {
  if (!Array.isArray(publicFiles) || publicFiles.length === 0) throw new Error('Public files required');
  const limits = { ...LIMITS, ...(options.limits || {}) };
  if (Object.keys(limits).some(key => !(key in LIMITS))
    || Object.entries(limits).some(([key, value]) => !Number.isSafeInteger(value) || value < 1 || value > LIMITS[key])) {
    throw new Error('Limits may only reduce the fixed resource ceilings');
  }
  const writes = options.writable_paths || [];
  const roots = options.writable_roots || [];
  if (!Array.isArray(writes) || !Array.isArray(roots)
    || writes.some(file => !publicPath(file) || !file.startsWith('workspace/'))
    || roots.some(root => typeof root !== 'string' || !root.endsWith('/')
      || !(root === 'workspace/' || (publicPath(root.slice(0, -1)) && root.startsWith('workspace/'))))) {
    throw new Error('Write grants must be explicit workspace paths or directory prefixes');
  }
  const policy = { writable_paths: ordered(new Set(writes)), writable_roots: ordered(new Set(roots)), limits };
  const files = new Map();
  let totalBytes = 0;
  for (const file of publicFiles) {
    if (!publicPath(file.path) || !Buffer.isBuffer(file.bytes) || collision(files, file.path, false)) throw new Error('Invalid or colliding public file');
    if (file.bytes.length > limits.max_file_bytes || totalBytes + file.bytes.length > limits.max_total_bytes) throw new Error('Public files exceed resource limits');
    files.set(file.path, Buffer.from(file.bytes));
    totalBytes += file.bytes.length;
  }
  const initial = manifest(files);
  const events = [];
  const loaded = new Set();
  let attempts = 0;
  let overflow = 0;
  function dispatch(tool, args) {
    if (!Object.hasOwn(TOOL_KEYS, tool)) return { ok: false, reason: 'unknown_tool' };
    if (!args || typeof args !== 'object' || Array.isArray(args)
      || Object.keys(args).some(key => !TOOL_KEYS[tool].includes(key))) return { ok: false, reason: 'invalid_arguments' };
    if (tool === 'list_files') {
      const prefix = args.prefix === undefined ? '' : args.prefix;
      if (typeof prefix !== 'string' || (prefix && (!prefix.endsWith('/') || !validPath(prefix.slice(0, -1))))) return { ok: false, reason: 'invalid_path' };
      return { ok: true, files: ordered(files.keys()).filter(file => file.startsWith(prefix)) };
    }
    const target = args.path;
    if (!publicPath(target)) return { ok: false, reason: 'invalid_or_private_path' };
    if (tool === 'read_file') {
      if (!files.has(target)) return { ok: false, reason: 'missing_file' };
      if (args.encoding !== undefined && !['utf8', 'base64'].includes(args.encoding)) return { ok: false, reason: 'invalid_encoding' };
      const bytes = files.get(target), encoding = args.encoding || 'utf8';
      const content = bytes.toString(encoding);
      if (encoding === 'utf8' && !Buffer.from(content).equals(bytes)) return { ok: false, reason: 'binary_requires_base64' };
      if (/^skills\/[^/]+\/SKILL\.md$/.test(target)) loaded.add(target);
      return { ok: true, path: target, encoding, content, sha256: hash(bytes) };
    }
    if (!policy.writable_paths.includes(target) && !policy.writable_roots.some(root => target.startsWith(root))) return { ok: false, reason: 'write_not_granted' };
    if (tool === 'delete_file') {
      if (!files.has(target)) return { ok: false, reason: 'missing_file' };
      totalBytes -= files.get(target).length;
      files.delete(target);
      return { ok: true, path: target };
    }
    if (collision(files, target, true)) return { ok: false, reason: 'path_collision' };
    if (typeof args.content !== 'string') return { ok: false, reason: 'invalid_content' };
    const encoding = args.encoding || 'utf8';
    if (!['utf8', 'base64'].includes(encoding)) return { ok: false, reason: 'invalid_encoding' };
    if (args.content.length > limits.max_file_bytes * 2) return { ok: false, reason: 'file_limit' };
    const bytes = Buffer.from(args.content, encoding);
    if (bytes.toString(encoding) !== args.content) return { ok: false, reason: 'noncanonical_content' };
    if (bytes.length > limits.max_file_bytes) return { ok: false, reason: 'file_limit' };
    const nextTotal = totalBytes - (files.get(target)?.length || 0) + bytes.length;
    if (nextTotal > limits.max_total_bytes) return { ok: false, reason: 'total_limit' };
    files.set(target, bytes);
    totalBytes = nextTotal;
    return { ok: true, path: target, bytes: bytes.length, sha256: hash(bytes) };
  }

  // String JSON transport deliberately excludes caller objects/getters/functions.
  function call(requestJson) {
    attempts++;
    if (attempts > limits.max_calls) {
      overflow++;
      return { ok: false, reason: 'call_limit' };
    }
    let request, result;
    const requestLimit = limits.max_file_bytes * 6 + 4096;
    // Check UTF-16 length first, before any full scan/encoding/hash of an oversized string.
    const boundedRequest = typeof requestJson === 'string' && requestJson.length <= requestLimit
      && Buffer.byteLength(requestJson) <= requestLimit;
    if (!boundedRequest) result = { ok: false, reason: 'invalid_request' };
    else {
      try { request = JSON.parse(requestJson); }
      catch { result = { ok: false, reason: 'invalid_json' }; }
    }
    if (!result) {
      if (!request || Array.isArray(request) || typeof request !== 'object'
        || Object.keys(request).some(key => !['tool', 'arguments'].includes(key)) || typeof request.tool !== 'string') result = { ok: false, reason: 'invalid_request' };
      else result = dispatch(request.tool, request.arguments);
    }
    events.push({ sequence: attempts, tool: typeof request?.tool === 'string' ? request.tool.slice(0, 128) : null,
      path: typeof request?.arguments?.path === 'string' ? request.arguments.path.slice(0, 1024) : null,
      request_sha256: boundedRequest ? hash(requestJson) : null,
      request_chars: typeof requestJson === 'string' ? requestJson.length : null,
      decision: result.ok ? 'accepted' : 'denied', reason: result.reason || null,
      response_sha256: hash(JSON.stringify(result)) });
    return result;
  }

  return Object.freeze({
    call,
    // Trusted driver/graders only. Never pass the broker object to a model runtime.
    inspect: () => ({ initial_manifest: copy(initial), final_manifest: manifest(files), trace: copy(events),
      calls_attempted: attempts, calls_not_recorded: overflow, trace_complete: overflow === 0,
      loaded_skill_entries: ordered(loaded), activation_observed: false,
      policy: copy(policy), toolset_sha256: hash(JSON.stringify({ tools: TOOL_KEYS, policy })),
      public_bundle_sha256: hash(JSON.stringify(initial)) }),
    snapshot: () => ordered(files.keys()).map(path => ({ path, bytes: Buffer.from(files.get(path)) })),
  });
}

function gradeArtifacts(broker, checks) {
  if (!Array.isArray(checks)) throw new Error('Private checks must be an array');
  const state = broker.inspect();
  const files = new Map(broker.snapshot().map(file => [file.path, file.bytes]));
  const ids = new Set();
  const results = checks.map(check => {
    if (!check || typeof check.id !== 'string' || !check.id || ids.has(check.id)) throw new Error('Unique private check IDs required');
    ids.add(check.id);
    if (check.type === 'manual') return { id: check.id, status: 'unverified', evidence: null };
    if (!['file_sha256', 'file_unchanged', 'file_absent', 'json_value', 'tool_decisions'].includes(check.type)) throw new Error('Unsupported private check type');
    if (check.type !== 'tool_decisions' && !publicPath(check.path)) throw new Error('Private check requires a public artifact path');
    let passed = false, evidence = null;
    const bytes = files.get(check.path);
    if (check.type === 'file_sha256') {
      if (!/^[a-f0-9]{64}$/.test(check.sha256)) throw new Error('Expected SHA-256 required');
      evidence = bytes ? hash(bytes) : null;
      passed = evidence === check.sha256;
    } else if (check.type === 'file_unchanged') {
      const before = state.initial_manifest.find(file => file.path === check.path);
      evidence = bytes ? hash(bytes) : null;
      passed = Boolean(before && before.sha256 === evidence);
    } else if (check.type === 'file_absent') {
      evidence = { present: files.has(check.path) };
      passed = !evidence.present;
    } else if (check.type === 'json_value') {
      if (!Array.isArray(check.keys) || check.keys.some(key => typeof key !== 'string') || !Object.hasOwn(check, 'equals')) throw new Error('JSON check requires keys and expected value');
      try {
        let actual = JSON.parse(bytes?.toString('utf8'));
        for (const key of check.keys) {
          if (actual === null || typeof actual !== 'object' || !Object.hasOwn(actual, key)) throw new Error('missing');
          actual = actual[key];
        }
        assert.deepStrictEqual(actual, check.equals);
        passed = true;
      } catch { /* Missing/invalid JSON and value mismatches are ordinary artifact failures. */ }
      evidence = { artifact_sha256: bytes ? hash(bytes) : null, matched: passed };
    } else {
      if (!Array.isArray(check.equals)) throw new Error('Expected tool decisions required');
      evidence = state.trace.map(({ tool, path, decision, reason }) => ({ tool, path, decision, reason }));
      try { assert.deepStrictEqual(evidence, check.equals); passed = state.trace_complete; } catch { /* mismatch */ }
    }
    return { id: check.id, status: passed ? 'passed' : 'failed', evidence };
  });
  const status = results.some(check => check.status === 'failed') ? 'failed'
    : results.some(check => check.status === 'unverified') ? 'unverified' : results.length ? 'passed' : 'not_run';
  return { status, checks: results };
}

function runScriptedProbe({ publicFiles, policy, actions, checks = [] }) {
  if (!Array.isArray(actions)) throw new Error('Scripted actions must be an array');
  const broker = createBroker(publicFiles, policy);
  for (const action of actions) broker.call(JSON.stringify(action));
  return { schema_version: 1, evaluation_kind: 'scripted_virtual_tool_probe', status: 'not_run',
    model_execution: false, model_effective: null, cost: null,
    artifact_grading: gradeArtifacts(broker, checks), ...broker.inspect(),
    limitations: [
      'Scripted actions are authored harness checks, not model output or proof of task success.',
      'This virtual file service has no shell, network, browser, Git, or arbitrary code execution.',
      'Only a future adapter exposing call() exclusively can make this a model tool boundary; no host isolation has been verified.',
      'A successful Skill file read records access only, not automatic routing or instruction adherence.',
      'Deterministic artifact checks do not replace the remaining semantic/manual rubric.',
    ] };
}

const LOADED_PROVENANCE = Object.freeze({ source_sha256: loadedSourceSha256, private_grader_sha256: hash(gradeArtifacts.toString()) });
module.exports = { createBroker, gradeArtifacts, runScriptedProbe, LOADED_PROVENANCE };
