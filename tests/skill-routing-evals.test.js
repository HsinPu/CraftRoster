#!/usr/bin/env node

'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const runner = require('../scripts/run-skill-routing-evals.js');

const root = path.resolve(__dirname, '..');
const known = new Set(['solution-discovery', 'spec-flow', 'stripe-payments']);
let passed = 0;
function test(name, fn) { fn(); passed += 1; console.log(`PASS ${name}`); }
function message(text) { return JSON.stringify({ type: 'item.completed', item: { type: 'agent_message', text } }); }
function output(text, usage) {
  return `${message(text)}\n${JSON.stringify({ type: 'turn.completed', ...(usage ? { usage } : {}) })}`;
}
function options(extra = {}) { return { root, skill: 'solution-discovery', model: null, effort: null, maxCases: null, validateOnly: false, ...extra }; }
function routingCase(id, kind, expected = [], excluded = []) {
  return { id, kind, prompt: `Request ${id}`, expected_skills: expected, excluded_skills: excluded };
}
function evaluate(cases, results, extra = {}) {
  let index = 0; let tick = 1000;
  const report = runner.runEvaluation(options(extra), { cases }, known, {}, {
    spawnSync(command, args, processOptions) {
      assert.strictEqual(command, 'codex');
      assert.strictEqual(args[0], 'exec');
      assert.strictEqual(processOptions.shell, false);
      if (index >= results.length) throw new Error('Unexpected model call');
      const result = results[index++];
      if (result instanceof Error) throw result;
      return result;
    },
    now: () => { tick += 10; return tick; },
  });
  assert.strictEqual(index, results.length);
  return report;
}

test('parses exact known names from the last response only', () => {
  const text = `${message('I will inspect solution-discovery.')}\n${output('spec-flow\nstripe-payments')}`;
  assert.deepStrictEqual(runner.parseSelectedSkills(text, known), ['spec-flow', 'stripe-payments']);
});

test('accepts explicit none but distinguishes missing and empty response', () => {
  assert.deepStrictEqual(runner.parseSelectedSkills(output('none'), known), []);
  assert.throws(() => runner.parseSelectedSkills('{"type":"turn.completed"}', known), { code: 'missing_response' });
  assert.throws(() => runner.parseSelectedSkills(output(''), known), { code: 'empty_response' });
});

for (const [name, text, code] of [
  ['negation', 'Do not select solution-discovery.', 'malformed_response'],
  ['unknown Skill', 'unknown-skill', 'unknown_skill'],
  ['bullets', '- solution-discovery', 'malformed_response'],
  ['fences', '```\nsolution-discovery\n```', 'malformed_response'],
  ['mixed none', 'solution-discovery\nnone', 'mixed_none'],
  ['duplicate names', 'solution-discovery\nsolution-discovery', 'duplicate_skill'],
  ['blank interior line', 'solution-discovery\n\nspec-flow', 'malformed_response'],
  ['prose after name', 'solution-discovery is suitable', 'malformed_response'],
]) {
  test(`rejects ${name}`, () => assert.throws(() => runner.parseSelectedSkills(output(text), known), { code }));
}

test('rejects broken JSONL and failed turns while permitting CLI warning lines', () => {
  assert.throws(() => runner.parseSelectedSkills(`{broken\n${output('none')}`, known), { code: 'malformed_jsonl' });
  assert.throws(() => runner.parseSelectedSkills(`${output('none')}\n{"type":"turn.failed"}`, known), { code: 'turn_failed' });
  assert.deepStrictEqual(runner.parseSelectedSkills(`WARNING: a CLI warning\n${output('none')}`, known), []);
});

test('fails unexpected selections and supports explicit optional allowed Skills', () => {
  const item = routingCase('test', 'positive', ['solution-discovery'], ['spec-flow']);
  assert.deepStrictEqual(runner.scoreRoutingCase(item, ['solution-discovery', 'stripe-payments']), {
    passed: false, missing: [], forbidden: [], unexpected: ['stripe-payments'],
  });
  assert.strictEqual(runner.scoreRoutingCase({ ...item, allowed_skills: ['stripe-payments'] }, ['solution-discovery', 'stripe-payments']).passed, true);
  assert.strictEqual(runner.scoreRoutingCase({ ...item, allowed_skills: ['stripe-payments'] }, ['solution-discovery']).passed, true);
  assert.deepStrictEqual(runner.scoreRoutingCase(item, ['spec-flow']), {
    passed: false, missing: ['solution-discovery'], forbidden: ['spec-flow'], unexpected: [],
  });
  assert.throws(() => runner.scoreRoutingCase({ ...item, allowed_skills: ['spec-flow'] }, []), /both allowed\/expected and excluded/);
});

test('samples every available routing kind and refuses positive-only truncation', () => {
  const cases = [routingCase('p1', 'positive'), routingCase('p2', 'positive'), routingCase('p3', 'positive'), routingCase('m1', 'near_match'), routingCase('n1', 'negative')];
  assert.deepStrictEqual(runner.selectCases(cases, 3).map((item) => item.id), ['p1', 'm1', 'n1']);
  assert.deepStrictEqual(runner.selectCases(cases, 4).map((item) => item.id), ['p1', 'm1', 'n1', 'p2']);
  assert.throws(() => runner.selectCases(cases, 2), /at least 3/);
  assert.throws(() => runner.selectCases([routingCase('unknown', 'other')], 1), /known kinds/);
  assert.strictEqual(runner.selectCases(cases, null), cases);
});

test('preserves passed, failed and errors with explicit valid coverage', () => {
  const cases = [
    routingCase('p1', 'positive', ['solution-discovery']), routingCase('p2', 'positive', ['solution-discovery']),
    routingCase('m1', 'near_match', ['spec-flow'], ['solution-discovery']), routingCase('n1', 'negative', [], ['solution-discovery']),
    routingCase('n2', 'negative', [], ['solution-discovery']),
  ];
  const report = evaluate(cases, [
    { status: 0, stdout: output('solution-discovery', { input_tokens: 100, cached_input_tokens: 30, output_tokens: 5 }) },
    { status: null, error: { code: 'ETIMEDOUT' } },
    { status: 0, stdout: output('solution-discovery') },
    { status: 0, stdout: output('none') },
    { status: 0, stdout: '{"type":"turn.completed"}' },
  ]);
  assert.deepStrictEqual(report.cases.map((item) => item.status), ['passed', 'error', 'failed', 'passed', 'error']);
  assert.deepStrictEqual(report.summary.valid_coverage, { numerator: 3, denominator: 5, rate: 0.6 });
  assert.deepStrictEqual(report.summary.pass_per_attempt, { numerator: 2, denominator: 5, rate: 0.4 });
  assert.deepStrictEqual(report.summary.positive_valid_coverage, { numerator: 1, denominator: 2, rate: 0.5 });
  assert.deepStrictEqual(report.summary.target_recall_valid, { numerator: 1, denominator: 1, rate: 1 });
  assert.strictEqual(report.cases[1].error.code, 'ETIMEDOUT');
  assert.strictEqual(report.cases[4].error.code, 'missing_response');
  assert.deepStrictEqual(report.cases[0].usage, { input_tokens: 100, cached_input_tokens: 30, output_tokens: 5 });
  assert.strictEqual(report.cases[3].usage, null);
  assert.strictEqual(report.evaluation_kind, 'routing_self_report');
  assert.strictEqual(report.model_effective, null);
  assert.ok(report.wall_ms > 0);
});

test('does not accept a truncated turn or hide driver exceptions', () => {
  const cases = [routingCase('p1', 'positive'), routingCase('p2', 'positive')];
  const report = evaluate(cases, [{ status: 0, stdout: message('none') }, new Error('mock failure')]);
  assert.strictEqual(report.summary.error, 2);
  assert.strictEqual(report.cases[0].error.code, 'incomplete_turn');
  assert.strictEqual(report.cases[1].error.code, 'runner_error');
  assert.strictEqual(report.summary.target_recall_valid.rate, null);
});

test('keeps visible response evidence when strict response parsing fails', () => {
  const text = 'Do not select solution-discovery.';
  const report = evaluate([routingCase('n1', 'negative', [], ['solution-discovery'])], [{ status: 0, stdout: output(text) }]);
  assert.strictEqual(report.cases[0].status, 'error');
  assert.strictEqual(report.cases[0].error.code, 'malformed_response');
  assert.ok(report.cases[0].trace.visible_response_jsonl.includes(message(text)));
  assert.strictEqual(report.summary.valid, 0);
});

test('records sample exclusions as not_run instead of failures or passes', () => {
  const cases = [routingCase('p1', 'positive'), routingCase('p2', 'positive'), routingCase('m1', 'near_match'), routingCase('n1', 'negative')];
  const report = evaluate(cases, Array.from({ length: 3 }, () => ({ status: 0, stdout: output('none') })), { maxCases: 3 });
  assert.strictEqual(report.summary.attempted, 3);
  assert.strictEqual(report.summary.not_run, 1);
  assert.strictEqual(report.cases[1].reason, 'sample_limit');
});

test('does not persist reasoning, tool payloads or stderr text', () => {
  const transcript = [
    JSON.stringify({ type: 'item.completed', item: { type: 'reasoning', text: 'private reasoning marker' } }),
    JSON.stringify({ type: 'item.completed', item: { type: 'command_execution', aggregated_output: 'tool secret marker' } }),
    output('none'),
  ].join('\n');
  const report = evaluate([routingCase('n1', 'negative')], [{ status: 0, stdout: transcript, stderr: 'stderr secret marker' }]);
  const serialized = JSON.stringify(report);
  assert.ok(!serialized.includes('private reasoning marker'));
  assert.ok(!serialized.includes('tool secret marker'));
  assert.ok(!serialized.includes('stderr secret marker'));
  assert.ok(report.cases[0].trace.visible_response_jsonl.includes(message('none')));
  assert.match(report.cases[0].trace.stdout_sha256, /^[a-f0-9]{64}$/);
  assert.strictEqual(report.cases[0].status, 'error');
  assert.strictEqual(report.cases[0].error.code, 'unexpected_task_activity');
  assert.deepStrictEqual(report.cases[0].trace.unexpected_activity_types, ['command_execution']);
});

test('started, updated and completed task activity cannot earn a routing pass', () => {
  for (const phase of ['item.started', 'item.updated', 'item.completed']) {
    for (const type of ['command_execution', 'mcp_tool_call', 'web_search', 'file_change', 'future_host_action']) {
      const activity = JSON.stringify({ type: phase, item: { type, arguments: 'private tool arguments', output: 'private tool output' } });
      const transcript = `${activity}\n${output('none', { input_tokens: 30, output_tokens: 2 })}`;
      assert.throws(() => runner.parseSelectedSkills(transcript, known), { code: 'unexpected_task_activity' });
      const report = evaluate([routingCase('n1', 'negative')], [{ status: 0, stdout: transcript }]);
      assert.strictEqual(report.summary.passed, 0);
      assert.strictEqual(report.summary.error, 1);
      assert.strictEqual(report.summary.attempted, 1);
      assert.strictEqual(report.summary.valid, 0);
      assert.deepStrictEqual(report.cases[0].trace.unexpected_activity_types, [type]);
      assert.strictEqual(report.cases[0].usage.input_tokens, 30);
      assert.ok(!JSON.stringify(report).includes('private tool'));
    }
  }
});

test('response, plan and reasoning events remain valid without persisting hidden text', () => {
  const transcript = [
    JSON.stringify({ type: 'item.started', item: { type: 'reasoning', text: 'private reasoning' } }),
    JSON.stringify({ type: 'item.updated', item: { type: 'plan', text: 'private plan' } }),
    output('none'),
  ].join('\n');
  const report = evaluate([routingCase('n1', 'negative')], [{ status: 0, stdout: transcript }]);
  assert.strictEqual(report.summary.passed, 1);
  assert.deepStrictEqual(report.cases[0].trace.unexpected_activity_types, []);
  assert.ok(!JSON.stringify(report).includes('private reasoning'));
  assert.ok(!JSON.stringify(report).includes('private plan'));
});

test('standalone parser rejects incomplete turns and malformed item envelopes', () => {
  assert.throws(() => runner.parseSelectedSkills(message('none'), known), { code: 'incomplete_turn' });
  for (const item of [null, {}, { type: '' }, { type: 'unsafe type\nprivate payload' }, { type: 'x'.repeat(65) }]) {
    assert.throws(() => runner.parseSelectedSkills(`${JSON.stringify({ type: 'item.started', item })}\n${output('none')}`, known), { code: 'malformed_item' });
  }
});

test('builds host model and effort overrides without shell interpolation', () => {
  const args = runner.buildCodexArgs(options({ model: 'fixture-model', effort: 'high' }), 'request');
  assert.strictEqual(args[args.indexOf('--model') + 1], 'fixture-model');
  assert.strictEqual(args[args.indexOf('--config') + 1], 'model_reasoning_effort="high"');
  assert.ok(args.at(-1).endsWith('Actual user request:\nrequest'));
  assert.throws(() => runner.parseArgs(['--skill', 'solution-discovery', '--effort', 'bogus']), /Invalid --effort/);
  assert.throws(() => runner.parseArgs(['--skill', 'solution-discovery', '--max-cases', '0']), /positive integer/);
  assert.throws(() => runner.parseArgs(['--skill', 'solution-discovery', '--skill', 'spec-flow']), /Duplicate/);
});

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'craftroster-routing-evals-'));
try {
  test('validate-only writes not_run records and hashes without calling Codex', () => {
    const target = path.join(tempRoot, 'validation.json');
    const logs = []; let validations = 0;
    const exitCode = runner.main(['--skill', 'solution-discovery', '--validate-only', '--output', target], {
      log: (value) => logs.push(value),
      spawnSync(command) { assert.strictEqual(command, process.execPath); validations += 1; return { status: 0 }; },
    });
    assert.strictEqual(exitCode, 0);
    assert.strictEqual(validations, 1);
    const report = JSON.parse(fs.readFileSync(target, 'utf8'));
    assert.strictEqual(report.summary.not_run, 10);
    assert.strictEqual(report.summary.passed, 0);
    assert.strictEqual(report.summary.valid_coverage.rate, null);
    assert.strictEqual(report.host.version, null);
    assert.strictEqual(report.advertised_catalog_sha256, null);
    for (const key of ['harness_sha256', 'repository_catalog_sha256', 'corpus_sha256', 'prompt_sha256']) assert.match(report[key], /^[a-f0-9]{64}$/);
    assert.match(logs[0], /no model called/);
    assert.throws(() => runner.main(['--skill', 'solution-discovery', '--output', target], { spawnSync() { throw new Error('must not call'); } }), /already exists/);
  });

  test('mocked live driver records host version, requested parameters and nonzero failure status', () => {
    const target = path.join(tempRoot, 'mocked-run.json');
    let executions = 0;
    const exitCode = runner.main(['--skill', 'solution-discovery', '--model', 'fixture-model', '--effort', 'low', '--max-cases', '3', '--output', target], {
      log() {},
      spawnSync(command, args) {
        if (command === process.execPath) return { status: 0 };
        assert.strictEqual(command, 'codex');
        if (args[0] === '--version') return { status: 0, stdout: 'codex-cli fixture-version\n' };
        executions += 1;
        return { status: 0, stdout: output('none') };
      },
    });
    assert.strictEqual(exitCode, 1);
    assert.strictEqual(executions, 3);
    const report = JSON.parse(fs.readFileSync(target, 'utf8'));
    assert.strictEqual(report.host.version, 'codex-cli fixture-version');
    assert.strictEqual(report.model_requested, 'fixture-model');
    assert.strictEqual(report.reasoning_effort_requested, 'low');
    assert.strictEqual(report.summary.not_run, 7);
    assert.strictEqual(report.summary.failed, 3);
  });

  test('successful mocked self-report exits zero and insufficient sampling never calls Codex', () => {
    const corpus = JSON.parse(fs.readFileSync(path.join(root, 'skills/solution-discovery/evals/routing.json'), 'utf8'));
    const dependencies = {
      log() {},
      spawnSync(command, args) {
        if (command === process.execPath) return { status: 0 };
        if (args[0] === '--version') return { status: 0, stdout: 'fixture-version' };
        const item = corpus.cases.find((entry) => args.at(-1).endsWith(entry.prompt));
        assert.ok(item);
        return { status: 0, stdout: output(item.expected_skills.join('\n') || 'none') };
      },
    };
    assert.strictEqual(runner.main(['--skill', 'solution-discovery'], dependencies), 0);
    assert.throws(() => runner.main(['--skill', 'solution-discovery', '--max-cases', '1'], {
      log() {},
      spawnSync(command) { assert.strictEqual(command, process.execPath); return { status: 0 }; },
    }), /at least 3/);
  });
} finally {
  const relative = path.relative(path.resolve(os.tmpdir()), path.resolve(tempRoot));
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative) || !path.basename(tempRoot).startsWith('craftroster-routing-evals-')) throw new Error('Unsafe cleanup path');
  fs.rmSync(tempRoot, { recursive: true, force: true });
}

test('validates the actual repository corpus without calling Codex', () => {
  const result = spawnSync(process.execPath, [path.join(root, 'scripts', 'run-skill-routing-evals.js'), '--skill', 'solution-discovery', '--validate-only'], { cwd: root, encoding: 'utf8' });
  assert.strictEqual(result.status, 0, `${result.stdout || ''}${result.stderr || ''}${result.error || ''}`);
  assert.match(result.stdout, /solution-discovery: 10 routing cases validated/);
  assert.match(result.stdout, /all 10 cases not_run/);
});

console.log(`Skill routing eval tests passed: ${passed}`);
