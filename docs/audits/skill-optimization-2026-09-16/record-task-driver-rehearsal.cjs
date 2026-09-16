'use strict';

// Fixed first-party adapters only. This command never calls a model or executes
// returned code. The original component consumes only the returned JSON data.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../../..');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const relative = file => path.relative(root, file).replaceAll('\\', '/');
// Capture before loading the implementation and refuse to record another
// revision if a concurrent edit changes any of these sources during rehearsal.
const implementation = ['scripts/prepare-skill-pilot.js', 'scripts/lib/skill-eval-broker.js', 'scripts/lib/skill-task-driver.js', relative(__filename)]
  .map(file => ({ path: file, sha256: hash(fs.readFileSync(path.join(root, file))) }));
const { buildBundle } = require(path.join(root, 'scripts/prepare-skill-pilot'));
const { runTaskTrial } = require(path.join(root, 'scripts/lib/skill-task-driver'));
const read = location => ({ type: 'tool_call', request: { tool: 'read_file', arguments: { path: location } } });
const final = text => ({ type: 'final', text });

async function rehearse({ skill, caseId, policy, checks, steps }) {
  const bundle = buildBundle({ skill, caseId });
  let calls = 0;
  const requests = [];
  const { report, artifacts } = await runTaskTrial({ publicFiles: bundle.publicFiles, policy, checks,
    adapter: async ({ requestJson }) => {
      assert.equal(typeof requestJson, 'string');
      assert(!requestJson.includes('PRIVATE-REHEARSAL-ORACLE'));
      assert(!requestJson.includes(bundle.privateRecord.expected_output));
      requests.push({ sequence: calls + 1, bytes: Buffer.byteLength(requestJson), sha256: hash(requestJson) });
      assert(calls < steps.length, 'No extra adapter invocation is expected');
      return JSON.stringify(steps[calls++]);
    }
  });
  assert.equal(calls, steps.length);
  assert.equal(report.run_status, 'completed');
  assert.equal(report.status, 'not_run');
  assert.equal(report.artifact_grading.status, 'unverified');
  const current = buildBundle({ skill, caseId }).privateRecord;
  assert.equal(current.public_bundle_sha256, bundle.privateRecord.public_bundle_sha256);
  return { entry: {
    case_id: bundle.privateRecord.case_id, model_calls: 0, adapter_kind: 'fixed_first_party_script',
    fixture_sha256: bundle.privateRecord.fixture_sha256,
    corpus_case_sha256: bundle.privateRecord.corpus_case_sha256,
    public_bundle_sha256: bundle.privateRecord.public_bundle_sha256,
    runtime_catalog_sha256: bundle.privateRecord.runtime_catalog_sha256,
    skill_packages: bundle.privateRecord.skill_packages,
    adapter_requests: requests, canonical_inputs_unchanged: true, driver_report: report
  }, artifacts, before: bundle.publicFiles };
}

async function main() {
  if (process.argv.slice(2).join(' ') !== '--record-author-driver') throw Error('Explicit --record-author-driver required');
  const output = path.join(__dirname, 'task-driver-rehearsal.json');
  if (fs.existsSync(output)) throw Error('Preserve the historical report; use a new version after source changes');
  const locale = await rehearse({ skill: 'code-change-workflow', caseId: 4,
    policy: { writable_paths: ['workspace/locales/en.json'] },
    checks: [
      { id: 'label', type: 'json_value', path: 'workspace/locales/en.json', keys: ['auth', 'signIn'], equals: 'Log in' },
      { id: 'component', type: 'file_unchanged', path: 'workspace/src/sign-in.js' },
      { id: 'original-test', type: 'file_unchanged', path: 'workspace/test/sign-in.test.js' },
      { id: 'PRIVATE-REHEARSAL-ORACLE', type: 'manual' }
    ],
    steps: [read('skills/code-change-workflow/SKILL.md'), read('workspace/CONTRACT.md'),
      read('workspace/src/sign-in.js'), read('workspace/locales/en.json'),
      { type: 'tool_call', request: { tool: 'write_file', arguments: { path: 'workspace/locales/en.json', content: '{ "auth": { "signIn": "Log in" } }\n' } } },
      final('Authored harness example: locale updated; no browser or model execution is claimed.')]
  });
  const originalFiles = new Map(locale.before.map(file => [file.path, file.bytes]));
  for (const file of locale.artifacts) if (file.path !== 'workspace/locales/en.json') assert(file.bytes.equals(originalFiles.get(file.path)));
  const localeBytes = locale.artifacts.find(file => file.path === 'workspace/locales/en.json').bytes;
  const data = JSON.parse(localeBytes.toString('utf8'));
  assert.deepEqual(data, { auth: { signIn: 'Log in' } });
  // Only load the unchanged first-party implementation, never a returned program.
  const componentPath = path.join(root, 'skills/code-change-workflow/evals/fixtures/locale-label/src/sign-in.js');
  assert(fs.readFileSync(componentPath).equals(originalFiles.get('workspace/src/sign-in.js')));
  const { createSignInButton } = require(componentPath);
  let clicks = 0;
  const document = { createElement(tag) {
    const attributes = {}, listeners = {};
    return { tag, attributes, setAttribute(key, value) { attributes[key] = value; },
      addEventListener(type, fn) { listeners[type] = fn; }, click() { listeners.click(); } };
  } };
  const button = createSignInButton(document, data, () => clicks++);
  assert.equal(button.tag, 'button'); assert.equal(button.type, 'button');
  assert.equal(button.textContent, 'Log in'); assert.equal(button.attributes['aria-label'], 'Log in');
  button.click(); assert.equal(clicks, 1);
  locale.entry.author_component_check = { status: 'passed', scope: 'Unchanged trusted component with returned JSON data and local document stub',
    visible_text: button.textContent, accessible_name: button.attributes['aria-label'], clicks,
    component_sha256: hash(fs.readFileSync(componentPath)), locale_sha256: hash(localeBytes),
    browser_executed: false, model_execution: false };

  const readiness = await rehearse({ skill: 'verified-software-delivery', caseId: 5, policy: {},
    checks: [{ id: 'smoke-still-not-run', type: 'json_value', path: 'workspace/evidence/staging-B-smoke.json', keys: ['status'], equals: 'not_run' },
      { id: 'target-unchanged', type: 'file_unchanged', path: 'workspace/staging/B.json' },
      { id: 'PRIVATE-REHEARSAL-ORACLE', type: 'manual' }],
    steps: [read('skills/verified-software-delivery/SKILL.md'), read('workspace/CONTRACT.md'),
      read('workspace/staging/B.json'), read('workspace/evidence/staging-B-smoke.json'),
      final('Authored harness example: required staging B smoke for build A is not_run; readiness remains incomplete. No deployment was attempted.')]
  });
  const readinessBefore = new Map(readiness.before.map(file => [file.path, file.bytes]));
  assert.equal(readiness.artifacts.length, readiness.before.length);
  for (const file of readiness.artifacts) assert(file.bytes.equals(readinessBefore.get(file.path)));
  readiness.entry.read_only_snapshot_unchanged = true;

  for (const source of implementation) assert.equal(hash(fs.readFileSync(path.join(root, source.path))), source.sha256,
    'Implementation changed during rehearsal; no report may be recorded');
  for (const trial of [locale, readiness]) for (const [key, file] of [
    ['driver', 'scripts/lib/skill-task-driver.js'], ['broker', 'scripts/lib/skill-eval-broker.js']
  ]) assert.equal(trial.entry.driver_report.implementation_sha256[key], implementation.find(source => source.path === file).sha256,
    'Driver report does not match the frozen implementation');
  const report = { schema_version: 1, kind: 'scripted_task_driver_integration_rehearsal', recorded_at: new Date().toISOString(),
    node: process.version, platform: process.platform, status: 'not_run', model_calls: 0,
    implementation, cases: [locale.entry, readiness.entry],
    limitations: ['Both adapters return prewritten author actions. They are not independent model subjects, routing evidence or Skill improvements.',
      'Private manual checks remain unverified even when the driver completes and deterministic artifact checks pass.',
      'Only a fixed trusted component consumes JSON data; no returned code, shell, browser, network or external service was executed.',
      'The callback interface is not a process sandbox. Model transport, host isolation, authorization, usage and budgets still need separate integration.'] };
  fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify({ report: relative(output), cases: report.cases.length,
    adapter_calls: report.cases.map(entry => entry.adapter_requests.length), status: 'not_run', model_calls: 0 }));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
