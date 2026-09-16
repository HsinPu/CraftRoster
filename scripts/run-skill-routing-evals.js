#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const DEFAULT_ROOT = path.resolve(__dirname, '..');
const KINDS = ['positive', 'near_match', 'negative'];
const ROUTING_PROMPT = [
  'This is a Skill routing self-report evaluation, not an execution test.',
  'Do not perform the user task and do not read or modify files.',
  'Return only the exact lowercase Skill names that normal automatic routing would select, one per line.',
  'Return exactly none if no Skill applies. Do not use bullets, code fences, explanations, or duplicate names.',
  'Do not select a Skill merely because this evaluation asks about routing.',
  '', 'Actual user request:', '',
].join('\n');

function usage() {
  return 'Usage: node scripts/run-skill-routing-evals.js --skill <name> [--root <repository>] [--model <model>] [--effort <effort>] [--max-cases <count>] [--output <new-json-file>] [--validate-only]';
}

function parseArgs(argv) {
  const options = { root: DEFAULT_ROOT, skill: null, model: null, effort: null, maxCases: null, output: null, validateOnly: false };
  const seen = new Set();
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (seen.has(argument)) throw new Error(`Duplicate option: ${argument}`);
    seen.add(argument);
    if (argument === '--validate-only') { options.validateOnly = true; continue; }
    if (!['--root', '--skill', '--model', '--effort', '--max-cases', '--output'].includes(argument)) throw new Error(usage());
    const value = argv[++index];
    if (!value || value.startsWith('--') || value.trim() !== value) throw new Error(usage());
    if (argument === '--root') options.root = path.resolve(value);
    if (argument === '--skill') options.skill = value;
    if (argument === '--model') options.model = value;
    if (argument === '--effort') {
      if (!['none', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max', 'ultra'].includes(value)) throw new Error('Invalid --effort; the selected host and model must also support this effort');
      options.effort = value;
    }
    if (argument === '--output') options.output = path.resolve(value);
    if (argument === '--max-cases') {
      const parsed = Number(value);
      if (!Number.isSafeInteger(parsed) || parsed < 1) throw new Error('--max-cases must be a positive integer');
      options.maxCases = parsed;
    }
  }
  if (!options.skill || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(options.skill)) throw new Error('--skill must be a normalized kebab-case Skill name');
  return options;
}

function protocolError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function parseTranscript(output) {
  const messages = [];
  const trace = [];
  const unexpectedActivity = new Set();
  let usage = null;
  let completed = false;
  let failed = false;
  for (const rawLine of output.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('WARNING:')) continue;
    let event;
    try { event = JSON.parse(line); } catch {
      throw protocolError('malformed_jsonl', 'Codex output contains malformed JSONL');
    }
    if (!event || typeof event !== 'object' || typeof event.type !== 'string') throw protocolError('malformed_jsonl', 'Codex event must have a type');
    // Observe starts/updates too: a denied or interrupted tool may never complete.
    // Keep only bounded protocol labels, never tool arguments, output or reasoning.
    if (['item.started', 'item.updated', 'item.completed'].includes(event.type)) {
      const type = event.item?.type;
      if (typeof type !== 'string' || !/^[a-z][a-z0-9_]{0,63}$/.test(type)) {
        throw protocolError('malformed_item', 'Codex item must have a bounded protocol type');
      }
      if (!['agent_message', 'reasoning', 'plan'].includes(type)) unexpectedActivity.add(type);
    }
    if (event.type === 'item.completed' && event.item?.type === 'agent_message') {
      if (typeof event.item.text !== 'string') throw protocolError('malformed_response', 'Agent response must be text');
      messages.push(event.item.text);
      // Keep visible response evidence only. Never persist reasoning or tool payloads.
      trace.push(rawLine);
    }
    if (event.type === 'turn.completed') {
      completed = true;
      if (event.usage && typeof event.usage === 'object') {
        usage = {};
        for (const field of ['input_tokens', 'cached_input_tokens', 'output_tokens']) {
          usage[field] = Number.isSafeInteger(event.usage[field]) && event.usage[field] >= 0 ? event.usage[field] : null;
        }
      }
      trace.push(JSON.stringify({ type: event.type, usage }));
    }
    if (event.type === 'turn.failed' || event.type === 'error') failed = true;
  }
  return { messages, usage, completed, failed, unexpected_activity_types: [...unexpectedActivity].sort(), visible_response_jsonl: trace.join('\n') };
}

function requireRoutingOnlyTurn(transcript) {
  if (transcript.failed) throw protocolError('turn_failed', 'Codex reported a failed turn');
  if (transcript.unexpected_activity_types.length) throw protocolError('unexpected_task_activity', 'Routing-only evaluation observed tool activity or an unsupported item type');
  if (!transcript.completed) throw protocolError('incomplete_turn', 'Missing turn.completed event');
}

function parseResponse(text, knownSkills) {
  if (text === undefined) throw protocolError('missing_response', 'No completed agent response');
  const response = text.trim();
  if (response === 'none') return [];
  if (!response) throw protocolError('empty_response', 'Empty response is not an explicit none');
  const selected = [];
  for (const line of response.split(/\r?\n/)) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(line)) throw protocolError('malformed_response', 'Each response line must be one exact Skill name');
    if (line === 'none') throw protocolError('mixed_none', 'none cannot be combined with Skill names');
    if (!knownSkills.has(line)) throw protocolError('unknown_skill', `Unknown Skill name: ${line}`);
    if (selected.includes(line)) throw protocolError('duplicate_skill', `Repeated Skill name: ${line}`);
    selected.push(line);
  }
  return selected;
}

function parseSelectedSkills(output, knownSkills) {
  const transcript = parseTranscript(output);
  requireRoutingOnlyTurn(transcript);
  return parseResponse(transcript.messages.at(-1), knownSkills);
}

function scoreRoutingCase(routingCase, selectedSkills) {
  const selected = new Set(selectedSkills);
  const expected = new Set(routingCase.expected_skills);
  const allowed = new Set([...expected, ...(routingCase.allowed_skills || [])]);
  const excluded = new Set(routingCase.excluded_skills);
  for (const skill of excluded) {
    if (allowed.has(skill)) throw new Error(`Invalid routing contract: ${skill} is both allowed/expected and excluded`);
  }
  const missing = [...expected].filter((skill) => !selected.has(skill));
  const forbidden = [...excluded].filter((skill) => selected.has(skill));
  const unexpected = [...selected].filter((skill) => !allowed.has(skill) && !excluded.has(skill));
  return { passed: !missing.length && !forbidden.length && !unexpected.length, missing, forbidden, unexpected };
}

function selectCases(cases, maxCases) {
  if (!Array.isArray(cases) || cases.length === 0 || cases.some((item) => !KINDS.includes(item.kind))) throw new Error('Routing cases must be non-empty and use known kinds');
  if (maxCases !== null && (!Number.isSafeInteger(maxCases) || maxCases < 1)) throw new Error('--max-cases must be a positive integer');
  if (maxCases === null || maxCases >= cases.length) return cases;
  const groups = KINDS.map((kind) => cases.filter((item) => item.kind === kind)).filter((group) => group.length);
  if (maxCases < groups.length) throw new Error(`--max-cases must be at least ${groups.length} to include every routing kind`);
  const selected = [];
  for (let index = 0; selected.length < maxCases; index += 1) {
    for (const group of groups) {
      if (group[index]) selected.push(group[index]);
      if (selected.length === maxCases) break;
    }
  }
  return selected;
}

function sha256(value) { return crypto.createHash('sha256').update(value).digest('hex'); }

function validateCorpus(root, skillName, spawn = spawnSync) {
  const result = spawn(process.execPath, [path.join(root, 'scripts', 'validate-skill-evals.js'), '--root', root], {
    cwd: root, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024,
  });
  if (result.error || result.status !== 0) throw new Error(`Corpus validation failed: ${result.error?.message || result.stderr || result.stdout || 'unknown error'}`);
  const file = path.join(root, 'skills', skillName, 'evals', 'routing.json');
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) throw new Error(`Routing corpus not found: ${file}`);
  return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
}

function buildCodexArgs(options, prompt) {
  const args = ['exec', '--ephemeral', '--sandbox', 'read-only', '--json', '-C', options.root];
  if (options.model) args.push('--model', options.model);
  if (options.effort) args.push('--config', `model_reasoning_effort=${JSON.stringify(options.effort)}`);
  args.push(`${ROUTING_PROMPT}${prompt}`);
  return args;
}

function ratio(numerator, denominator) { return { numerator, denominator, rate: denominator ? numerator / denominator : null }; }

function summarize(cases, targetSkill) {
  const counts = { passed: 0, failed: 0, error: 0, not_run: 0 };
  let positiveTotal = 0; let positiveValid = 0; let positiveHits = 0;
  let excludedTotal = 0; let excludedValid = 0; let falsePositives = 0;
  let requiredTotal = 0; let requiredHits = 0; let selectedTotal = 0; let allowedHits = 0;
  for (const item of cases) {
    counts[item.status] += 1;
    if (item.status === 'not_run') continue;
    const valid = item.status !== 'error';
    if (item.kind === 'positive') {
      positiveTotal += 1;
      if (valid) { positiveValid += 1; if (item.selected_skills.includes(targetSkill)) positiveHits += 1; }
    }
    if (item.excluded_skills.includes(targetSkill)) {
      excludedTotal += 1;
      if (valid) { excludedValid += 1; if (item.selected_skills.includes(targetSkill)) falsePositives += 1; }
    }
    if (valid) {
      const allowed = new Set([...item.expected_skills, ...item.allowed_skills]);
      requiredTotal += item.expected_skills.length;
      requiredHits += item.expected_skills.filter((skill) => item.selected_skills.includes(skill)).length;
      selectedTotal += item.selected_skills.length;
      allowedHits += item.selected_skills.filter((skill) => allowed.has(skill)).length;
    }
  }
  const attempted = counts.passed + counts.failed + counts.error;
  const valid = counts.passed + counts.failed;
  return {
    total: cases.length, attempted, valid, ...counts,
    valid_coverage: ratio(valid, attempted), pass_per_attempt: ratio(counts.passed, attempted),
    target_recall_valid: ratio(positiveHits, positiveValid), positive_valid_coverage: ratio(positiveValid, positiveTotal),
    target_false_positive_rate_valid: ratio(falsePositives, excludedValid), exclusion_valid_coverage: ratio(excludedValid, excludedTotal),
    selection_precision_valid: ratio(allowedHits, selectedTotal), required_recall_valid: ratio(requiredHits, requiredTotal),
  };
}

function runEvaluation(options, corpus, knownSkills, metadata, dependencies = {}) {
  const spawn = dependencies.spawnSync || spawnSync;
  const now = dependencies.now || Date.now;
  const selectedCases = selectCases(corpus.cases, options.maxCases);
  const selectedIds = new Set(selectedCases.map((item) => item.id));
  const started = now();
  const report = {
    schema_version: 1, run_id: crypto.randomUUID(), evaluation_kind: 'routing_self_report',
    skill: options.skill, started_at: new Date(started).toISOString(), finished_at: null, wall_ms: null,
    model_requested: options.model, reasoning_effort_requested: options.effort,
    model_effective: null, reasoning_effort_effective: null, ...metadata,
    sample_strategy: selectedCases.length === corpus.cases.length ? 'all' : 'deterministic_round_robin_by_kind',
    selected_case_ids: selectedCases.map((item) => item.id),
    limitations: [
      'Self-reported selection only; no Skill activation or task outcome is observed.',
      'Repository catalog is recorded, but the host advertised/installed catalog and inherited settings are not controlled.',
      'Effective model/effort, toolset, cost and hidden context are unavailable; requested overrides are recorded separately.',
      'Trace retains visible response JSONL only; reasoning, tool payloads and stderr content are not persisted.',
      'Observed tool activity or unsupported item types invalidate a routing-only trial; this detection does not enforce host isolation.',
    ], cases: [],
  };
  for (const routingCase of corpus.cases) {
    const item = {
      case_id: routingCase.id, kind: routingCase.kind, prompt_sha256: sha256(routingCase.prompt),
      expected_skills: routingCase.expected_skills, allowed_skills: routingCase.allowed_skills || [], excluded_skills: routingCase.excluded_skills,
      status: 'not_run', reason: options.validateOnly ? 'validate_only' : 'sample_limit',
      selected_skills: null, score: null, error: null, wall_ms: null, usage: null, cost: null, trace: null,
    };
    if (!options.validateOnly && selectedIds.has(routingCase.id)) {
      const caseStart = now();
      try {
        const result = spawn('codex', buildCodexArgs(options, routingCase.prompt), {
          cwd: options.root, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, shell: false, timeout: 120000,
        });
        const stdout = result.stdout || '';
        item.trace = { stdout_sha256: sha256(stdout), stderr_sha256: sha256(result.stderr || ''), visible_response_jsonl: null, unexpected_activity_types: null };
        if (result.error || result.status !== 0) throw protocolError(result.error?.code || 'process_exit', `Codex process failed (exit ${result.status ?? 'unknown'})`);
        const transcript = parseTranscript(stdout);
        item.trace.visible_response_jsonl = transcript.visible_response_jsonl;
        item.trace.unexpected_activity_types = transcript.unexpected_activity_types;
        item.usage = transcript.usage;
        requireRoutingOnlyTurn(transcript);
        item.selected_skills = parseResponse(transcript.messages.at(-1), knownSkills);
        item.score = scoreRoutingCase(routingCase, item.selected_skills);
        item.status = item.score.passed ? 'passed' : 'failed'; item.reason = null;
      } catch (error) {
        item.status = 'error'; item.reason = null;
        item.error = { code: error.code || 'runner_error', message: error.message };
      }
      item.wall_ms = now() - caseStart;
    }
    report.cases.push(item);
  }
  const finished = now();
  report.finished_at = new Date(finished).toISOString(); report.wall_ms = finished - started;
  report.summary = summarize(report.cases, options.skill);
  return report;
}

function collectMetadata(root, corpus, validateOnly, spawn) {
  const skillSources = fs.readdirSync(path.join(root, 'skills'), { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && fs.existsSync(path.join(root, 'skills', entry.name, 'SKILL.md')))
    .map((entry) => ({ name: entry.name, sha256: sha256(fs.readFileSync(path.join(root, 'skills', entry.name, 'SKILL.md'))) }))
    .sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
  let version = null;
  if (!validateOnly) {
    const result = spawn('codex', ['--version'], { cwd: root, encoding: 'utf8', shell: false, timeout: 10000 });
    if (!result.error && result.status === 0) version = (result.stdout || '').trim() || null;
  }
  return {
    knownSkills: new Set(skillSources.map((item) => item.name)),
    metadata: {
      host: { name: 'codex', version }, harness_sha256: sha256(fs.readFileSync(__filename)),
      node_version: process.version, platform: process.platform,
      repository_catalog_sha256: sha256(JSON.stringify(skillSources)), skill_source_hashes: skillSources,
      corpus_sha256: sha256(JSON.stringify(corpus)), prompt_sha256: sha256(ROUTING_PROMPT), advertised_catalog_sha256: null,
    },
  };
}

function main(argv, dependencies = {}) {
  const options = parseArgs(argv);
  const spawn = dependencies.spawnSync || spawnSync;
  const log = dependencies.log || console.log;
  // Refuse accidental replacement before spending model quota.
  if (options.output && fs.existsSync(options.output)) throw new Error(`Output already exists: ${options.output}`);
  if (options.output && !fs.statSync(path.dirname(options.output)).isDirectory()) throw new Error('Output parent must be a directory');
  const corpus = validateCorpus(options.root, options.skill, spawn);
  selectCases(corpus.cases, options.maxCases);
  const { knownSkills, metadata } = collectMetadata(options.root, corpus, options.validateOnly, spawn);
  const report = runEvaluation(options, corpus, knownSkills, metadata, dependencies);
  if (options.output) fs.writeFileSync(options.output, `${JSON.stringify(report, null, 2)}\n`, { flag: 'wx' });
  if (options.validateOnly) log(`${options.skill}: ${report.selected_case_ids.length} routing cases validated; all ${corpus.cases.length} cases not_run (no model called)`);
  else {
    for (const item of report.cases) {
      const details = item.score ? ['missing', 'forbidden', 'unexpected']
        .filter((field) => item.score[field].length).map((field) => `${field}=${item.score[field].join(',')}`) : [];
      log(`${item.status.toUpperCase()} ${item.case_id}: ${item.error?.code || item.reason || `selected=${item.selected_skills.join(',') || 'none'}`}${details.length ? `; ${details.join('; ')}` : ''}`);
    }
    const summary = report.summary;
    log(`Routing self-report summary: ${summary.passed} passed, ${summary.failed} failed, ${summary.error} error, ${summary.not_run} not_run; valid coverage ${summary.valid}/${summary.attempted}; passes per attempt ${summary.passed}/${summary.attempted}`);
    const fraction = (metric) => `${metric.numerator}/${metric.denominator}${metric.rate === null ? ' (unavailable)' : ''}`;
    log(`Valid-response target recall ${fraction(summary.target_recall_valid)} (positive valid coverage ${fraction(summary.positive_valid_coverage)}); target false positives ${fraction(summary.target_false_positive_rate_valid)} (exclusion valid coverage ${fraction(summary.exclusion_valid_coverage)})`);
  }
  return options.validateOnly || (report.summary.attempted > 0 && report.summary.failed === 0 && report.summary.error === 0) ? 0 : 1;
}

if (require.main === module) {
  try { process.exitCode = main(process.argv.slice(2)); } catch (error) { console.error(error.message); process.exitCode = 2; }
}

module.exports = { parseArgs, parseSelectedSkills, scoreRoutingCase, selectCases, buildCodexArgs, runEvaluation, main };
