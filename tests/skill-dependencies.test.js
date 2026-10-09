const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { validateDependencies, validateRoutes, siblingLinks, validateSiblingLinks } = require('../scripts/lib/skill-dependencies');
const { buildRows, render } = require('../scripts/generate-install-skill-dependencies');
const required = (name) => ({ name, kind: 'required' });
const conditional = (name) => ({ name, kind: 'conditional', when: 'This task needs the specialist.' });
const optional = (name) => ({ name, kind: 'optional' });
const entries = { alpha: { dependencies: [required('beta'), conditional('gamma')] }, beta: { dependencies: [required('gamma')] }, gamma: {} };
let passed = 0;
function test(name, fn) { fn(); passed++; console.log(`PASS ${name}`); }
test('chain and conditional back-edge remain valid', () => validateDependencies({ ...entries, gamma: { dependencies: [conditional('alpha')] } }));
test('optional back-edge does not turn a required chain into a cycle', () => validateDependencies({ ...entries, gamma: { dependencies: [optional('alpha')] } }));
test('required cycle reports chain', () => assert.throws(() => validateDependencies({ ...entries, gamma: { dependencies: [required('alpha')] } }), /alpha -> beta -> gamma -> alpha/));
for (const [name, dependencies, pattern] of [
  ['unknown target', [required('missing')], /unknown/],
  ['self edge', [required('alpha')], /self/],
  ['duplicate edge', [required('beta'), conditional('beta')], /duplicate/],
  ['unknown kind', [{ name: 'beta', kind: 'recommended' }], /kind/],
  ['optional unknown target', [optional('missing')], /unknown/],
  ['optional self edge', [optional('alpha')], /self/],
  ['optional duplicate edge', [required('beta'), optional('beta')], /duplicate/],
  ['optional condition', [{ ...optional('beta'), when: 'sometimes' }], /omit/],
  ['optional null condition', [{ ...optional('beta'), when: null }], /omit/],
  ['missing condition', [{ name: 'beta', kind: 'conditional' }], /when/],
  ['multiline condition', [{ name: 'beta', kind: 'conditional', when: 'a\nb' }], /when/],
  ['NUL condition', [{ name: 'beta', kind: 'conditional', when: 'a\0b' }], /when/],
  ['required condition', [{ ...required('beta'), when: 'sometimes' }], /omit/],
  ['unknown field', [{ ...required('beta'), execute: true }], /field/],
  ['unknown usage', [{ ...required('beta'), usage: 'activate-all' }], /usage/],
  ['non-array', {}, /array/]
]) test(`reject ${name}`, () => assert.throws(() => validateDependencies({ ...entries, alpha: { dependencies } }), pattern));

test('shared-resource dependency keeps its install kind and excludes alternatives from TSV', () => {
  const catalog = { skills: [{ name: 'alpha', dependencies: [{ ...required('beta'), usage: 'resource' }],
    routes: [{ name: 'gamma', kind: 'alternative', when: 'The output is a different artifact.' }] },
  { name: 'beta', dependencies: [conditional('gamma')] }, { name: 'gamma' }] };
  assert.deepStrictEqual(buildRows(catalog), [
    { skill: 'alpha', dependency: 'beta', kind: 'required', when: '-' },
    { skill: 'beta', dependency: 'gamma', kind: 'conditional', when: 'This task needs the specialist.' }
  ]);
});
test('alternative back-edges do not create an install cycle', () => validateRoutes({
  ...entries, gamma: { routes: [{ name: 'alpha', kind: 'alternative', when: 'Use the other output owner.' }] }
}));
for (const [label, route, pattern] of [
  ['unknown target', { name: 'missing', kind: 'alternative', when: 'Other output.' }, /unknown/],
  ['self route', { name: 'alpha', kind: 'alternative', when: 'Other output.' }, /self/],
  ['install kind', { name: 'beta', kind: 'required', when: 'Other output.' }, /kind/],
  ['missing condition', { name: 'beta', kind: 'related' }, /when/],
  ['multiline condition', { name: 'beta', kind: 'related', when: 'a\nb' }, /when/],
  ['execution field', { name: 'beta', kind: 'related', when: 'Other output.', execute: true }, /field/]
]) test(`reject route ${label}`, () => assert.throws(() => validateRoutes({ ...entries, alpha: { routes: [route] } }), pattern));
test('duplicate alternatives are rejected', () => {
  const route = { name: 'beta', kind: 'alternative', when: 'Other output.' };
  assert.throws(() => validateRoutes({ ...entries, alpha: { routes: [route, route] } }), /duplicate/);
});
test('deterministic TSV preserves conditional explanation', () => {
  const rows = buildRows({ skills: Object.entries(entries).reverse().map(([name, entry]) => ({ name, ...entry })) });
  assert.strictEqual(render(rows), 'skill\tdependency\tkind\twhen\nalpha\tbeta\trequired\t-\nalpha\tgamma\tconditional\tThis task needs the specialist.\nbeta\tgamma\trequired\t-\n');
  assert.strictEqual(render([]), 'skill\tdependency\tkind\twhen\n');
});
test('optional declaration survives JSON and deterministic TSV without inventing a condition', () => {
  const catalog = JSON.parse(JSON.stringify({ skills: Object.entries({ ...entries, gamma: { dependencies: [optional('alpha')] } })
    .reverse().map(([name, entry]) => ({ name, ...entry })) }));
  const rows = buildRows(catalog);
  assert.deepStrictEqual(rows.find(row => row.skill === 'gamma'), { skill: 'gamma', dependency: 'alpha', kind: 'optional', when: '-' });
  assert(render(rows).endsWith('gamma\talpha\toptional\t-\n'));
  assert.deepStrictEqual(catalog.skills.find(skill => skill.name === 'gamma').dependencies, [optional('alpha')]);
});
test('entrypoint link scan excludes fenced examples', () => assert.deepStrictEqual(siblingLinks('```md\n[x](../../README.md)\n```\n[x](../beta/SKILL.md#intro)'), ['../beta/SKILL.md']));
test('all supported Markdown destination forms are checked', () => {
  assert.deepStrictEqual(siblingLinks('[x](../beta/SKILL.md "Guide")\n[x](<../beta/SKILL.md>)\n[x][guide]\n[guide]: <../beta/SKILL.md> "Guide"'), Array(3).fill('../beta/SKILL.md'));
  assert.throws(() => siblingLinks('[x](../beta/SKILL.md unquoted-title)'), /Unsupported/);
  assert.deepStrictEqual(siblingLinks('[x][g]\n[g]:\n  ../beta/SKILL.md\n[y][h]\n[h]:\n <../beta/SKILL.md>'), Array(2).fill('../beta/SKILL.md'));
  assert.throws(() => siblingLinks('[x](<../../README.md)'), /Unsupported/);
  assert.throws(() => siblingLinks('[g]:\n <../../README.md'), /Unsupported/);
});
test('catalog name type is checked before object-key coercion', () => {
  for (const name of [123, null, ['alpha'], undefined]) assert.throws(() => buildRows({ skills: [{ name }] }), /string names/);
});
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'craftroster-dependency-links-'));
try {
  for (const name of Object.keys(entries)) {
    fs.mkdirSync(path.join(temp, 'skills', name), { recursive: true });
    fs.writeFileSync(path.join(temp, 'skills', name, 'SKILL.md'), '# Fixture\n');
  }
  const alpha = path.join(temp, 'skills/alpha/SKILL.md');
  test('sibling package directory resolves to SKILL.md', () => {
    fs.writeFileSync(alpha, '[read](../beta/)'); validateSiblingLinks(temp, entries);
  });
  test('undeclared sibling rejected', () => {
    fs.writeFileSync(alpha, '[read](../beta/SKILL.md)');
    assert.throws(() => validateSiblingLinks(temp, { ...entries, alpha: {} }), /declared dependency/);
  });
  test('resource usage is tied to a real bundled sibling file', () => {
    const resourceEntries = { ...entries, alpha: { dependencies: [{ ...required('beta'), usage: 'resource' }] } };
    fs.writeFileSync(alpha, '[read](../beta/SKILL.md)'); validateSiblingLinks(temp, resourceEntries);
    fs.writeFileSync(alpha, '# No resource reference');
    assert.throws(() => validateSiblingLinks(temp, resourceEntries), /resource dependency needs a sibling resource link/);
  });
  test('missing bundled reference rejected', () => {
    fs.writeFileSync(alpha, '[read](../beta/reference/absent.md)');
    assert.throws(() => validateSiblingLinks(temp, entries), /regular file/);
  });
  for (const relative of ['../../README.md', '../beta/../gamma/SKILL.md', '../beta/reference/../../gamma/SKILL.md']) {
    test(`reject resource escape ${relative}`, () => {
      fs.writeFileSync(alpha, `[read](${relative})`);
      assert.throws(() => validateSiblingLinks(temp, entries), /escapes|invalid/);
    });
  }
  test('titles, angle links, and reference definitions cannot conceal escapes', () => {
    for (const text of ['[x](../../README.md "Guide")', '[x](<../../README.md>)', '[x][guide]\n[guide]: ../../README.md', '[x][g]\n[g]:\n  ../../README.md', '[x][g]\n[g]:\n  <../../README.md>']) {
      fs.writeFileSync(alpha, text);
      assert.throws(() => validateSiblingLinks(temp, entries), /escapes/);
    }
  });
} finally {
  const resolved = path.resolve(temp);
  if (path.dirname(resolved) !== path.resolve(os.tmpdir()) || !path.basename(resolved).startsWith('craftroster-dependency-links-')) throw new Error('Unsafe fixture cleanup');
  fs.rmSync(resolved, { recursive: true, force: true });
}
const repository = Object.fromEntries(require('../skills.json').skills.map(skill => [skill.name, skill]));
function requiredPackages(seeds) {
  const selected = new Set();
  function visit(name) {
    if (selected.has(name)) return;
    selected.add(name);
    for (const dependency of repository[name].dependencies || []) if (dependency.kind === 'required') visit(dependency.name);
  }
  seeds.forEach(visit);
  return [...selected].sort();
}
for (const [source, packages] of [
  ['document-to-markdown', ['document-to-markdown', 'markdown-writer']],
  ['image-to-code-assets', ['image-to-code-assets', 'image-utils']],
  ['threejs-capture-recording', ['threejs-capture-recording', 'threejs-development']],
  ['threejs-webxr-accessibility', ['threejs-accessibility', 'threejs-development', 'threejs-webxr-accessibility']],
  ['frontend-code-review', ['frontend-code-review']],
  ['security-code-review', ['security-code-review']],
  ['python-packaging-release', ['python-packaging-release']],
  ['animation-best-practices', ['animation-best-practices', 'frontend-design']],
  ['responsive-design', ['frontend-design', 'responsive-design']],
  ['ui-styling', ['frontend-design', 'ui-styling']],
  ['tailwind-patterns', ['frontend-design', 'tailwind-patterns']]
]) test(`repository minimal package plan for ${source}`, () => assert.deepStrictEqual(requiredPackages([source]), packages.sort()));
test('shared Three.js resources do not expand the base router specialist inventory', () => {
  assert.strictEqual(repository['threejs-capture-recording'].dependencies.find(dep => dep.name === 'threejs-development').usage, 'resource');
  assert.deepStrictEqual(requiredPackages(['threejs-capture-recording', 'threejs-webxr-accessibility']),
    ['threejs-accessibility', 'threejs-capture-recording', 'threejs-development', 'threejs-webxr-accessibility']);
});
test('complete page and redesign packages retain their required delivery owners', () => {
  assert(requiredPackages(['web-page-design-to-code']).includes('webapp-testing'));
  assert(requiredPackages(['web-page-design-to-code']).includes('frontend-design'));
  const redesign = requiredPackages(['website-redesign-to-code']);
  for (const required of ['frontend-stack-inference', 'frontend-design', 'webapp-testing',
    'visual-regression-testing', 'frontend-testing', 'accessibility-testing']) assert(redesign.includes(required), required);
});
test('migration completion retains a required verification owner', () => {
  assert(requiredPackages(['database-migration-workflow']).includes('verification-before-completion'));
});
console.log(`${passed} dependency tests passed`);
