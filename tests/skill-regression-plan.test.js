'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
const assert = require('assert');
const { buildPlan, parseArgs, writePlan, main } = require('../scripts/plan-skill-regressions');

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'craftroster-regression-plan-'));
const root = path.join(temp, 'repo');
const names = ['alpha', 'consumer', 'conditional', 'grandconsumer', 'neighbor', 'distant', 'reference-owner', 'allowed-owner', 'unrelated', 'bare'];
let passed = 0;
function check(name, test) { test(); passed++; console.log(`PASS ${name}`); }
function write(relative, value) {
  const file = path.join(root, relative);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, typeof value === 'string' ? value : JSON.stringify(value));
}
function group(id, members) {
  return { id, title: id, decision: 'Select by requested artifact.', skills: members.map(name => ({ name, when: `The task needs ${name}.` })) };
}
const catalog = {
  skills: Object.fromEntries(names.map(name => [name, {}])),
  routingGroups: [group('direct', ['alpha', 'neighbor']), group('second-hop', ['neighbor', 'distant'])],
};
catalog.skills.consumer.dependencies = [{ name: 'alpha', kind: 'required' }];
catalog.skills.conditional.dependencies = [{ name: 'alpha', kind: 'conditional', when: 'The request needs integration.' }];
catalog.skills.grandconsumer.dependencies = [{ name: 'consumer', kind: 'required' }];
function output(owner) {
  return { skill_name: owner, evals: [{ id: 1, prompt: `Create a bounded ${owner} result.`, expected_output: 'Private outcome oracle.', assertions: ['The requested artifact works.'] }] };
}
function routing(owner, cases) {
  return { schema_version: 1, skill_name: owner, cases: cases || [
    { id: 'positive', kind: 'positive', prompt: `Use ${owner}.`, expected_skills: [owner], excluded_skills: [] },
    { id: 'negative', kind: 'negative', prompt: 'Reply with the result of two plus two.', expected_skills: [], excluded_skills: [owner] },
  ] };
}
const alphaOutput = output('alpha');
alphaOutput.evals[0].fixture_root = 'evals/fixtures/basic';
alphaOutput.evals[0].files = ['evals/fixtures/basic/input.txt'];
const options = { root, changed: ['alpha'] };
const skill = (plan, name) => plan.selected_skills.find(item => item.name === name);
const selectedCase = (plan, owner, id = 1, suite = 'output') => plan.cases.find(item => item.owner === owner && item.case_id === id && item.suite === suite);
const packageHash = (plan, name) => plan.sources.runtime_packages.find(item => item.name === name).sha256;

try {
  write('scripts/data/skill-catalog.json', catalog);
  for (const name of names) write(`skills/${name}/SKILL.md`, `${name} runtime entry.\n`);
  write('skills/alpha/references/guide.md', 'The original runtime reference.');
  write('skills/alpha/evals/fixtures/basic/input.txt', 'Original fixture input.');
  for (const name of ['alpha', 'consumer', 'neighbor', 'reference-owner', 'unrelated']) {
    write(`skills/${name}/evals/evals.json`, name === 'alpha' ? alphaOutput : output(name));
    write(`skills/${name}/evals/routing.json`, routing(name));
  }
  write('skills/reference-owner/evals/routing.json', routing('reference-owner', [
    { id: 'changed-excluded', kind: 'negative', prompt: 'No specialist is needed.', expected_skills: [], excluded_skills: ['reference-owner', 'alpha'] },
    { id: 'changed-expected', kind: 'near_match', prompt: 'The alpha owner should act.', expected_skills: ['alpha'], excluded_skills: ['reference-owner'] },
    { id: 'unrelated-positive', kind: 'positive', prompt: 'Only this owner is needed.', expected_skills: ['reference-owner'], excluded_skills: [] },
  ]));
  write('skills/allowed-owner/evals/routing.json', routing('allowed-owner', [
    { id: 'optional-alpha', kind: 'positive', prompt: 'Use this owner with optional support.', expected_skills: ['allowed-owner'], allowed_skills: ['alpha'], excluded_skills: [] },
  ]));
  let initial;
  check('direct changes select output tasks and all routing kinds, including no-skill negatives', () => {
    initial = buildPlan(options);
    assert(selectedCase(initial, 'alpha'));
    assert(selectedCase(initial, 'alpha', 'negative', 'routing'));
    assert.strictEqual(skill(initial, 'alpha').suites.output.selection, 'all');
    assert(skill(initial, 'alpha').reasons.some(reason => reason.type === 'direct_change'));
  });
  check('required and conditional direct reverse consumers retain auditable conditions', () => {
    assert(selectedCase(initial, 'consumer'));
    assert.strictEqual(skill(initial, 'consumer').reasons[0].kind, 'required');
    const conditional = skill(initial, 'conditional');
    assert(conditional.reasons.some(reason => reason.kind === 'conditional' && reason.when === 'The request needs integration.'));
    assert.deepStrictEqual(conditional.suites.output, { selection: 'all', definition_status: 'missing', available_cases: 0, selected_cases: 0, reason: 'owner_impact' });
    assert(initial.summary.missing_requested_suites.some(item => item.owner === 'conditional' && item.suite === 'routing'));
  });
  check('routing adjacency is one step and cannot turn into a transitive graph walk', () => {
    assert(skill(initial, 'neighbor'));
    assert(selectedCase(initial, 'neighbor', 'positive', 'routing'));
    assert(!selectedCase(initial, 'neighbor'));
    assert.strictEqual(skill(initial, 'neighbor').suites.output.definition_status, 'present');
    assert.strictEqual(skill(initial, 'neighbor').suites.output.selection, 'not_selected');
    assert(!skill(initial, 'distant'));
    assert(!skill(initial, 'grandconsumer'));
    assert(!skill(initial, 'unrelated'));
  });
  check('optional edges are auditable advisories and cannot select output or routing suites', () => {
    const changed = structuredClone(catalog);
    changed.skills.unrelated.dependencies = [{ name: 'alpha', kind: 'optional' }];
    changed.skills.alpha.dependencies = [{ name: 'bare', kind: 'optional' }];
    write('scripts/data/skill-catalog.json', changed);
    try {
      const plan = buildPlan(options);
      assert.deepStrictEqual(plan.selected_skills, initial.selected_skills);
      assert.deepStrictEqual(plan.cases, initial.cases);
      assert.deepStrictEqual(plan.optional_dependency_advisories.map(item => [item.owner, item.dependency, item.selection_effect]),
        [['alpha', 'bare', 'none'], ['unrelated', 'alpha', 'none']]);
      assert(plan.optional_dependency_advisories.every(item => item.changed_endpoints.length === 1 && item.changed_endpoints[0] === 'alpha'));
      assert.strictEqual(plan.selection_algorithm.optional_dependencies, 'advisory_only_no_expansion');
      assert(plan.selection_algorithm.version.endsWith('-v2'));
      const explicit = buildPlan({ root, changed: ['alpha', 'unrelated'] });
      assert(selectedCase(explicit, 'unrelated'));
      assert(skill(explicit, 'unrelated').reasons.some(reason => reason.type === 'direct_change'));
    } finally { write('scripts/data/skill-catalog.json', catalog); }
  });
  check('foreign owners contribute expected, excluded and allowed references without unrelated tasks', () => {
    const owner = skill(initial, 'reference-owner');
    assert.strictEqual(owner.suites.routing.selection, 'referencing_cases_only');
    assert.strictEqual(owner.suites.routing.selected_cases, 2);
    assert(!selectedCase(initial, 'reference-owner'));
    assert(!selectedCase(initial, 'reference-owner', 'unrelated-positive', 'routing'));
    assert(owner.reasons.some(reason => reason.field === 'excluded_skills'));
    assert(owner.reasons.some(reason => reason.field === 'expected_skills'));
    assert(skill(initial, 'allowed-owner').reasons.some(reason => reason.field === 'allowed_skills'));
  });
  check('changing a reference invalidates the complete runtime package, not the unchanged corpus', () => {
    write('skills/alpha/references/guide.md', 'An updated runtime requirement.');
    const after = buildPlan(options);
    assert.notStrictEqual(packageHash(after, 'alpha'), packageHash(initial, 'alpha'));
    assert.notStrictEqual(after.sources.runtime_snapshot_sha256, initial.sources.runtime_snapshot_sha256);
    assert.strictEqual(after.sources.corpus_inventory_sha256, initial.sources.corpus_inventory_sha256);
    write('skills/alpha/references/guide.md', 'The original runtime reference.');
  });
  check('fixture changes invalidate case inputs independently of prompt and runtime hashes', () => {
    write('skills/alpha/evals/fixtures/basic/input.txt', 'Changed input.');
    const after = buildPlan(options);
    assert.notStrictEqual(selectedCase(after, 'alpha').input_sha256, selectedCase(initial, 'alpha').input_sha256);
    assert.strictEqual(selectedCase(after, 'alpha').case_sha256, selectedCase(initial, 'alpha').case_sha256);
    assert.strictEqual(packageHash(after, 'alpha'), packageHash(initial, 'alpha'));
    write('skills/alpha/evals/fixtures/basic/input.txt', 'Original fixture input.');
  });
  check('oracle-only edits invalidate corpus and case hashes without contaminating runtime or input hashes', () => {
    const changed = structuredClone(alphaOutput); changed.evals[0].expected_output = 'Changed private oracle.';
    write('skills/alpha/evals/evals.json', changed);
    const after = buildPlan(options);
    assert.notStrictEqual(after.sources.corpus_inventory_sha256, initial.sources.corpus_inventory_sha256);
    assert.notStrictEqual(selectedCase(after, 'alpha').case_sha256, selectedCase(initial, 'alpha').case_sha256);
    assert.strictEqual(selectedCase(after, 'alpha').input_sha256, selectedCase(initial, 'alpha').input_sha256);
    assert.strictEqual(after.sources.runtime_snapshot_sha256, initial.sources.runtime_snapshot_sha256);
    assert(!JSON.stringify(after).includes('Changed private oracle.'));
    write('skills/alpha/evals/evals.json', alphaOutput);
  });
  check('a changed Skill without evals remains visible with two missing requested suites', () => {
    const plan = buildPlan({ root, changed: ['bare'] });
    assert.deepStrictEqual(plan.selected_skills.map(item => item.name), ['bare']);
    assert.strictEqual(plan.cases.length, 0);
    assert.strictEqual(plan.summary.missing_requested_suites.length, 2);
    assert.strictEqual(plan.status, 'not_run');
  });
  check('plans are deterministic across repeated and reordered changed inputs', () => {
    assert.deepStrictEqual(buildPlan({ root, changed: ['bare', 'alpha', 'alpha'] }), buildPlan({ root, changed: ['alpha', 'bare'] }));
    assert.deepStrictEqual(buildPlan(options), initial);
    assert.deepStrictEqual(initial.selected_skills.map(item => item.name), initial.selected_skills.map(item => item.name).sort());
    assert.deepStrictEqual(initial.cases.map(item => item.id), initial.cases.map(item => item.id).sort());
  });
  check('unknown names, traversal and unsupported execution flags fail closed', () => {
    for (const changed of ['not-in-catalog', '../alpha', 'alpha/other', 'Alpha', 'alpha\\other']) assert.throws(() => buildPlan({ root, changed: [changed] }), /Unknown changed|normalized/);
    assert.throws(() => buildPlan({ root, changed: [] }), /At least one/);
    assert.throws(() => parseArgs(['--execute']), /Unknown option/);
    assert.throws(() => parseArgs(['--model', 'model']), /Unknown option/);
    assert.throws(() => parseArgs(['--changed', 'alpha', '--output', 'a', '--output', 'b']), /Duplicate/);
    assert.throws(() => parseArgs(['--changed']), /Missing value/);
    assert.deepStrictEqual(parseArgs(['--changed', 'alpha', '--changed', 'bare', '--output', 'new.json']).changed, ['alpha', 'bare']);
  });
  check('malformed unselected corpus, unknown routing references and duplicate case IDs cannot disappear', () => {
    write('skills/unrelated/evals/evals.json', '{ broken');
    assert.throws(() => buildPlan(options), /Invalid JSON.*unrelated/);
    const bad = output('unrelated'); bad.evals.push(structuredClone(bad.evals[0]));
    write('skills/unrelated/evals/evals.json', bad);
    assert.throws(() => buildPlan(options), /duplicate output case/);
    write('skills/unrelated/evals/evals.json', output('unrelated'));
    const badRouting = routing('unrelated'); badRouting.cases[0].allowed_skills = ['missing'];
    write('skills/unrelated/evals/routing.json', badRouting);
    assert.throws(() => buildPlan(options), /Unknown routed Skill/);
    write('skills/unrelated/evals/routing.json', routing('unrelated'));
  });
  check('invalid dependency and routing metadata is rejected at its canonical source', () => {
    const bad = structuredClone(catalog); bad.skills.consumer.dependencies[0].name = 'missing';
    write('scripts/data/skill-catalog.json', bad);
    assert.throws(() => buildPlan(options), /unknown or invalid dependency/);
    bad.skills.consumer.dependencies = catalog.skills.consumer.dependencies;
    bad.routingGroups[0].skills[0].name = 'missing';
    write('scripts/data/skill-catalog.json', bad);
    assert.throws(() => buildPlan(options), /Invalid or duplicate route/);
    write('scripts/data/skill-catalog.json', catalog);
  });
  check('numeric routing group identifiers cannot be accepted through regular-expression coercion', () => {
    const bad = structuredClone(catalog); bad.routingGroups[0].id = 7;
    write('scripts/data/skill-catalog.json', bad);
    try { assert.throws(() => buildPlan(options), /Invalid or duplicate routing group/); }
    finally { write('scripts/data/skill-catalog.json', catalog); }
  });
  check('array routing names cannot pass catalog membership and silently lose routing neighbors', () => {
    const bad = structuredClone(catalog); bad.routingGroups[0].skills[0].name = ['alpha'];
    write('scripts/data/skill-catalog.json', bad);
    try { assert.throws(() => buildPlan(options), /Invalid or duplicate route/); }
    finally { write('scripts/data/skill-catalog.json', catalog); }
  });
  check('string and array aliases cannot bypass duplicate routing-member rejection', () => {
    const bad = structuredClone(catalog); bad.routingGroups[0].skills[1].name = ['alpha'];
    write('scripts/data/skill-catalog.json', bad);
    try { assert.throws(() => buildPlan(options), /Invalid or duplicate route/); }
    finally { write('scripts/data/skill-catalog.json', catalog); }
  });
  check('fixture traversal and missing files are errors, not absent evidence', () => {
    const bad = structuredClone(alphaOutput); delete bad.evals[0].fixture_root;
    for (const file of ['../outside.txt', '/outside.txt', 'C:/outside.txt', 'references\\guide.md', 'references/NUL.txt']) {
      bad.evals[0].files = [file]; write('skills/alpha/evals/evals.json', bad);
      assert.throws(() => buildPlan(options), /Normalized relative/);
    }
    bad.evals[0].files = ['evals/fixtures/missing.txt']; write('skills/alpha/evals/evals.json', bad);
    assert.throws(() => buildPlan(options), /ENOENT/);
    write('skills/alpha/evals/evals.json', alphaOutput);
  });
  check('real directory symlinks cannot escape through runtime resources or fixture inputs', () => {
    const outside = path.join(temp, 'outside'); fs.mkdirSync(outside); fs.writeFileSync(path.join(outside, 'secret.txt'), 'must-not-be-read');
    const runtimeLink = path.join(root, 'skills/alpha/external');
    fs.symlinkSync(outside, runtimeLink, process.platform === 'win32' ? 'junction' : 'dir');
    try { assert.throws(() => buildPlan(options), /Symbolic links/); } finally { fs.unlinkSync(runtimeLink); }
    const fixtureLink = path.join(root, 'skills/alpha/evals/fixtures/external');
    fs.symlinkSync(outside, fixtureLink, process.platform === 'win32' ? 'junction' : 'dir');
    const bad = structuredClone(alphaOutput); bad.evals[0].fixture_root = 'evals/fixtures/external'; bad.evals[0].files = ['evals/fixtures/external/secret.txt'];
    write('skills/alpha/evals/evals.json', bad);
    try { assert.throws(() => buildPlan(options), /Symbolic links/); }
    finally { fs.unlinkSync(fixtureLink); write('skills/alpha/evals/evals.json', alphaOutput); }
  });
  check('a missing corpus behind a directory symlink fails instead of being called missing', () => {
    const link = path.join(root, 'skills/bare/evals');
    fs.symlinkSync(path.join(temp, 'outside'), link, process.platform === 'win32' ? 'junction' : 'dir');
    try { assert.throws(() => buildPlan(options), /Symbolic links/); } finally { fs.unlinkSync(link); }
  });
  check('new JSON output is reviewable and overwrite cannot alter the previous record', () => {
    const destination = path.join(temp, 'plan.json');
    writePlan(initial, destination);
    const before = fs.readFileSync(destination, 'utf8');
    assert.strictEqual(JSON.parse(before).status, 'not_run');
    assert.throws(() => writePlan({ status: 'passed' }, destination), /already exists/);
    assert.strictEqual(fs.readFileSync(destination, 'utf8'), before);
    assert.throws(() => writePlan(initial, path.join(temp, 'plan.json:stream')), /Normalized relative/);
    const link = path.join(temp, 'linked-output');
    fs.symlinkSync(path.join(temp, 'outside'), link, process.platform === 'win32' ? 'junction' : 'dir');
    try { assert.throws(() => writePlan(initial, path.join(link, 'plan.json')), /real directory/); } finally { fs.unlinkSync(link); }
  });
  check('CLI entry uses only local planning and leaves execution, budgets and grades unconfigured', () => {
    const logs = [];
    const result = main(['--root', root, '--changed', 'alpha', '--output', path.join(temp, 'cli-plan.json')], text => logs.push(text));
    assert.strictEqual(result.status, 'not_run');
    assert.strictEqual(result.summary.executed_cases, 0);
    for (const key of ['host', 'model', 'toolset', 'grader', 'variants', 'trials', 'run_budget', 'cost', 'usage']) assert.strictEqual(result.execution[key], null);
    assert.strictEqual(result.execution.activation_observed, false);
    assert(result.cases.every(item => item.status === 'not_run' && item.grading === null && item.result === null));
    assert(logs[0].includes('status not_run'));
    assert.throws(() => main(['--root', path.join(temp, 'missing-root'), '--changed', 'alpha', '--output', path.join(temp, 'cli-plan.json')]), /already exists/);
  });
  console.log(`Skill regression plan tests passed: ${passed}`);
} finally {
  const resolved = path.resolve(temp);
  if (path.dirname(resolved) !== path.resolve(os.tmpdir()) || !path.basename(resolved).startsWith('craftroster-regression-plan-')) throw new Error('Unsafe cleanup');
  fs.rmSync(resolved, { recursive: true, force: true });
}
