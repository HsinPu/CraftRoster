'use strict';

// Read-only, in-memory GitHub-shaped fixture service. No filesystem or network API.
const crypto = require('crypto');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const clone = value => JSON.parse(JSON.stringify(value));
const isSha = value => typeof value === 'string' && /^[a-f0-9]{40}$/.test(value);
const filePath = value => typeof value === 'string' && value.length <= 1024 && value.length > 0
  && !/[\\\x00-\x1f\x7f:<>"|?*]/.test(value) && value === value.normalize('NFC')
  && value.split('/').every(part => part && !['.', '..', '.git', '.codex', '.agents'].includes(part.toLowerCase())
    && !/[. ]$/.test(part) && !/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part));
const OPERATIONS = {
  get_pr: 'pr', get_commits: 'commits', get_comments: 'comments', get_checks: 'checks',
  get_changed_files: 'changed_files', get_review_history: 'review_history', get_file: null,
};
const ROOT_KEYS = ['schema_version', 'fixture_only', 'repository', 'pr', 'revisions', 'commits', 'comments', 'checks', 'review_history', 'changed_files', 'provenance'];
const REQUEST_LIMIT = 64 * 1024;

function createReviewSnapshot(input) {
  const serialized = JSON.stringify(input);
  if (typeof serialized !== 'string' || serialized.length > 4 * 1024 * 1024 || Buffer.byteLength(serialized) > 4 * 1024 * 1024) throw new Error('Snapshot size limit exceeded');
  const data = JSON.parse(serialized);
  if (!data || Object.keys(data).some(key => !ROOT_KEYS.includes(key)) || data.schema_version !== 1 || data.fixture_only !== true
    || typeof data.repository !== 'string' || !/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(data.repository)
    || data.repository.split('/').some(part => ['.', '..'].includes(part))
    || !data.pr || !Number.isSafeInteger(data.pr.number) || data.pr.number < 1
    || !['OPEN', 'CLOSED', 'MERGED'].includes(data.pr.state) || typeof data.pr.draft !== 'boolean'
    || ![data.pr.base_sha, data.pr.head_sha, data.pr.merge_base_sha].every(isSha)
    || !data.revisions || Array.isArray(data.revisions) || typeof data.revisions !== 'object') throw new Error('Invalid snapshot identity');
  for (const [sha, revision] of Object.entries(data.revisions)) {
    if (!isSha(sha) || !revision || !revision.files || typeof revision.files !== 'object' || Array.isArray(revision.files)
      || Object.entries(revision.files).some(([name, content]) => !filePath(name) || typeof content !== 'string')) throw new Error('Invalid revision files');
  }
  if (![data.pr.base_sha, data.pr.head_sha, data.pr.merge_base_sha].every(sha => Object.hasOwn(data.revisions, sha))) throw new Error('Missing frozen revision');
  for (const key of ['commits', 'comments', 'checks', 'review_history', 'changed_files']) {
    if (!Array.isArray(data[key])) throw new Error(`Missing snapshot collection: ${key}`);
  }
  if (data.commits.some(commit => !isSha(commit.sha) || !Object.hasOwn(data.revisions, commit.sha))
    || data.checks.some(check => !isSha(check.head_sha) || check.head_sha !== data.pr.head_sha)
    || data.changed_files.some(file => !filePath(file.path) || typeof file.patch !== 'string')) throw new Error('Inconsistent snapshot references');
  const baseline = { repository: data.repository, number: data.pr.number, base_sha: data.pr.base_sha,
    head_sha: data.pr.head_sha, merge_base_sha: data.pr.merge_base_sha, snapshot_sha256: hash(serialized) };
  const trace = [];
  let attempts = 0;
  function call(requestJson) {
    attempts++;
    if (attempts > 1000) return { ok: false, reason: 'call_limit' };
    let request, result;
    const bounded = typeof requestJson === 'string' && requestJson.length <= REQUEST_LIMIT && Buffer.byteLength(requestJson) <= REQUEST_LIMIT;
    if (!bounded) result = { ok: false, reason: 'invalid_request' };
    else {
      try { request = JSON.parse(requestJson); } catch { result = { ok: false, reason: 'invalid_json' }; }
    }
    if (!result) {
      if (!request || typeof request !== 'object' || Array.isArray(request)
        || Object.keys(request).some(key => !['operation', 'repository', 'number', 'head_sha', 'ref', 'path'].includes(key))
        || typeof request.operation !== 'string') result = { ok: false, reason: 'invalid_request' };
      else if (!Object.hasOwn(OPERATIONS, request.operation)) result = { ok: false, reason: 'operation_not_allowed' };
      else if (request.repository !== baseline.repository || request.number !== baseline.number || request.head_sha !== baseline.head_sha) result = { ok: false, reason: 'baseline_mismatch' };
      else if (request.operation === 'get_file') {
        if (!isSha(request.ref) || !Object.hasOwn(data.revisions, request.ref) || !filePath(request.path)) result = { ok: false, reason: 'invalid_ref_or_path' };
        else if (!Object.hasOwn(data.revisions[request.ref].files, request.path)) result = { ok: false, reason: 'missing_file' };
        else result = { ok: true, fixture_only: true, baseline: clone(baseline),
          data: { ref: request.ref, path: request.path, content: data.revisions[request.ref].files[request.path] } };
      } else if (Object.hasOwn(request, 'ref') || Object.hasOwn(request, 'path')) result = { ok: false, reason: 'invalid_request' };
      else result = { ok: true, fixture_only: true, baseline: clone(baseline), data: clone(data[OPERATIONS[request.operation]]) };
    }
    trace.push({ sequence: attempts, operation: typeof request?.operation === 'string' ? request.operation.slice(0, 128) : null,
      decision: result.ok ? 'accepted' : 'denied', reason: result.reason || null,
      request_sha256: bounded ? hash(requestJson) : null, request_chars: typeof requestJson === 'string' ? requestJson.length : null,
      response_sha256: hash(JSON.stringify(result)) });
    return result;
  }
  return Object.freeze({ call, inspect: () => ({ baseline: clone(baseline), trace: clone(trace),
    calls_attempted: attempts, calls_not_recorded: Math.max(0, attempts - 1000), trace_complete: attempts <= 1000,
    snapshot_sha256: baseline.snapshot_sha256, model_execution: false,
    limitation: 'An offline read-only fixture service; no GitHub access, model run, host isolation, or review verdict is asserted.' }) });
}

module.exports = { createReviewSnapshot };
