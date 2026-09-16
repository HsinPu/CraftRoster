'use strict';

// Four-call, explicitly authorized text-only smoke. This does not observe Skill activation.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '../../..');
const codex = process.argv[2];
if (!codex) throw new Error('Usage: node run-pipeline-response-smoke.cjs <codex executable>');
const outputPath = path.join(__dirname, 'pipeline-response-smoke.json');
if (fs.existsSync(outputPath)) throw new Error('Result already exists; refusing to overwrite or repeat paid runs');
const baselineCommit = '7acca1fb8865903dc67ee4c76c147d0881cb9e1b';
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8').replace(/\r\n/g, '\n');
const old = spawnSync('git', ['show', `${baselineCommit}:skills/pipeline-review/SKILL.md`], {
  cwd: root, encoding: 'utf8', shell: false, timeout: 10000,
});
if (old.status !== 0) throw new Error('Cannot read the baseline; no model calls made');
const variants = [
  { id: 'baseline', skill: old.stdout.replace(/\r\n/g, '\n') },
  { id: 'candidate', skill: read('skills/pipeline-review/SKILL.md') },
];
const sharedSkill = read('skills/code-review/SKILL.md');
const fixtures = [
  {
    id: 'missing-required-evidence',
    packet: 'Review scope: this complete fictional packet only; baseline fixture-A. The change adds a nullable optional column. Inspection of the supplied change and existing callers has found no supported defect. The predeclared release acceptance checklist requires a staging migration rehearsal. Unit tests passed; the staging rehearsal was not run. No decision owner has granted an exception. Review the gate now; do not invent a code failure.',
    expected: { confirmedDefectCount: 0, requiredEvidenceStatus: 'missing', gate: 'blocked' },
  },
  {
    id: 'confirmed-defect-with-checks-satisfied',
    packet: 'Review scope: this complete fictional snippet and packet only; baseline fixture-B. Required behavior: withdraw(balance, amount) rejects an amount greater than the current balance. This is the full newly introduced function, with no caller or middleware guard: function withdraw(balance, amount) { return balance - amount; }. Reproduction: withdraw(3, 5) returns -2 without rejecting. The predeclared acceptance evidence consists of a build and the existing normal-path unit suite; both have supplied passing records. There is no separate required boundary-test, specialist, staging, or rehearsal gate in this packet. The suite omitted the insufficient-balance case. No risk exception was granted. Count root causes once.',
    expected: { confirmedDefectCount: 1, requiredEvidenceStatus: 'satisfied', gate: 'blocked' },
  },
];
const schema = {
  type: 'object', additionalProperties: false,
  properties: {
    confirmedDefectCount: { type: 'integer', minimum: 0 },
    requiredEvidenceStatus: { type: 'string', enum: ['missing', 'satisfied'] },
    gate: { type: 'string', enum: ['blocked', 'passed'] },
    reason: { type: 'string' },
  },
  required: ['confirmedDefectCount', 'requiredEvidenceStatus', 'gate', 'reason'],
};
const host = spawnSync(codex, ['--version'], { encoding: 'utf8', shell: false, timeout: 10000 });
if (host.status !== 0) throw new Error('Codex version probe failed; no model calls made');
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'craftroster-model-smoke-'));
const schemaPath = path.join(scratch, 'response.schema.json');
fs.writeFileSync(schemaPath, JSON.stringify(schema));
const report = {
  schema_version: 1,
  evaluation_kind: 'inline_skill_text_outcome_smoke',
  started_at: new Date().toISOString(), finished_at: null,
  baseline_commit: baselineCommit,
  harness_sha256: hash(fs.readFileSync(__filename)),
  host: { cli: host.stdout.trim(), node: process.version, platform: process.platform, arch: process.arch },
  model_requested: null, model_effective: null, effort_effective: null,
  activation_observed: false, host_catalog_controlled: false, user_config_ignored: true,
  authorization: 'User explicitly approved these four calls and transmission of the two pipeline-review versions, shared code-review entry, and fixed fixtures on 2026-09-16.',
  limitations: [
    'Inline Skill text conditioning; not installed-Skill discovery or activation.',
    'One trial per variant and fixture; no statistical improvement claim.',
    'Host/system instructions and effective model are not fully controlled or observed.',
    'Tools are prohibited in the prompt; read-only sandbox also applies. Observed tool use invalidates the trial.',
    'Only visible final response and aggregate usage retained; no hidden reasoning or raw tool payloads.',
  ],
  cases: fixtures.flatMap(fixture => variants.map(variant => ({
    case_id: fixture.id, variant: variant.id, trial: 1,
    status: 'not_run', expected: fixture.expected, actual: null, visible_response: null,
    skill_sha256: hash(variant.skill), shared_skill_sha256: hash(sharedSkill),
    fixture_sha256: hash(fixture.packet), prompt_sha256: null,
    wall_ms: null, exit_code: null, usage: null, cost: null, error: null,
    unexpected_tool_types: [],
  }))),
};

try {
  for (const item of report.cases) {
    const fixture = fixtures.find(value => value.id === item.case_id);
    const variant = variants.find(value => value.id === item.variant);
    const prompt = [
      'Perform a text-only evaluation of the complete fictional review packet below, applying the provided Skill instructions within this explicitly limited task.',
      'Do not call any tools, inspect the filesystem, delegate, or modify anything. All authorized review inputs are inline. Supporting references are not supplied; disclose limitations in the reason if material, without inventing additional predeclared release requirements.',
      'Return only the schema-conforming JSON object. confirmedDefectCount counts supported implementation defects; requiredEvidenceStatus describes the packet\'s predeclared required evidence; gate is the review decision. Explain briefly in reason. Do not treat the output schema as evidence that the review passed.',
      '<shared-code-review>', sharedSkill, '</shared-code-review>',
      '<pipeline-review>', variant.skill, '</pipeline-review>',
      '<review-packet>', fixture.packet, '</review-packet>',
    ].join('\n\n');
    item.prompt_sha256 = hash(prompt);
    const start = Date.now();
    const result = spawnSync(codex, [
      'exec', '--ignore-user-config', '--ephemeral', '--sandbox', 'read-only',
      '--skip-git-repo-check', '--json', '--output-schema', schemaPath, '-C', scratch, '-',
    ], { cwd: scratch, input: prompt, encoding: 'utf8', shell: false, timeout: 90000, maxBuffer: 8 * 1024 * 1024, windowsHide: true });
    item.wall_ms = Date.now() - start;
    item.exit_code = result.status;
    item.stdout_sha256 = hash(result.stdout || '');
    item.stderr_sha256 = hash(result.stderr || '');
    let completed = false;
    let failed = false;
    for (const line of (result.stdout || '').split(/\r?\n/)) {
      let event;
      try { event = JSON.parse(line); } catch { continue; }
      if (event.type === 'item.completed' && event.item?.type === 'agent_message') item.visible_response = event.item.text;
      if (event.type === 'turn.completed') {
        completed = true;
        if (event.usage && typeof event.usage === 'object') {
          item.usage = Object.fromEntries(['input_tokens', 'cached_input_tokens', 'output_tokens'].map(key => [key, Number.isSafeInteger(event.usage[key]) && event.usage[key] >= 0 ? event.usage[key] : null]));
        }
      }
      if (event.type === 'turn.failed' || event.type === 'error') failed = true;
      if (event.type === 'item.completed' && event.item?.type && !['agent_message', 'reasoning', 'plan'].includes(event.item.type)) {
        item.unexpected_tool_types.push(event.item.type);
      }
    }
    if (result.error || result.status !== 0 || failed || !completed || !item.visible_response) {
      item.status = 'error';
      item.error = result.error?.code || (failed ? 'host_error' : !completed ? 'incomplete_turn' : !item.visible_response ? 'missing_response' : 'nonzero_exit');
    } else if (item.unexpected_tool_types.length) {
      item.status = 'error'; item.error = 'unexpected_tool_use';
    } else {
      try {
        const actual = JSON.parse(item.visible_response);
        const keys = Object.keys(actual).sort().join(',');
        if (keys !== schema.required.slice().sort().join(',') || !Number.isSafeInteger(actual.confirmedDefectCount) || actual.confirmedDefectCount < 0 || !schema.properties.requiredEvidenceStatus.enum.includes(actual.requiredEvidenceStatus) || !schema.properties.gate.enum.includes(actual.gate) || typeof actual.reason !== 'string' || !actual.reason.trim()) throw new Error('invalid_schema');
        item.actual = actual;
        item.status = Object.entries(item.expected).every(([key, value]) => actual[key] === value) ? 'passed' : 'failed';
      } catch {
        item.status = 'error'; item.error = 'invalid_response_schema';
      }
    }
    console.log(`${item.variant}/${item.case_id}: ${item.status} (${item.wall_ms} ms)`);
    if (item.status === 'error') break; // Avoid repeated cost after a host/protocol failure.
  }
} finally {
  report.finished_at = new Date().toISOString();
  report.summary = Object.fromEntries(['passed', 'failed', 'error', 'not_run'].map(status => [status, report.cases.filter(item => item.status === status).length]));
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
  // Only this process's two temporary paths; no recursive directory removal.
  fs.unlinkSync(schemaPath);
  fs.rmdirSync(scratch);
}
console.log(`Recorded ${path.relative(root, outputPath)}`);
