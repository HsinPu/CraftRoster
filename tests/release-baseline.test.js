'use strict';
const assert = require('node:assert/strict');
const { buildBaseline, renderBlock, updateDocument } = require('../scripts/generate-release-baseline');
const { validateRoutingDocument } = require('../scripts/validate-skill-evals');
const root = require('node:path').resolve(__dirname, '..');
const rows = buildBaseline(root);
assert.equal(rows.find(([k]) => k === 'Skills')[1], require('../skills.json').skills.length);
const start = '<!-- CRAFTROSTER_RELEASE_BASELINE_START -->', end = '<!-- CRAFTROSTER_RELEASE_BASELINE_END -->';
const source = `prefix\n${start}\nold values\n${end}\nsuffix\n`;
const changed = updateDocument(source, renderBlock([['Skills', 1]]));
assert.ok(changed.startsWith('prefix\n'));
assert.ok(changed.endsWith('\nsuffix\n'));
assert.ok(changed.includes('| Skills | 1 |'));
assert.equal(updateDocument(changed, renderBlock([['Skills', 1]])), changed);
assert.throws(() => updateDocument('no markers', 'x'), /exactly one/);
assert.throws(() => updateDocument(`${source}${start}`, 'x'), /exactly one/);
function validate(allowed) {
  const errors = [], refs = [];
  validateRoutingDocument('alpha', {schema_version:1,skill_name:'alpha',cases:[{id:'test-case',kind:'positive',prompt:'task',expected_skills:['alpha'],excluded_skills:['beta'],allowed_skills:allowed}]}, errors, refs);
  return {errors,refs};
}
assert.deepEqual(validate(['gamma']).errors, []);
assert.equal(validate(['gamma']).refs.find(r => r.field === 'allowed_skills').skillName, 'gamma');
assert.ok(validate(['beta']).errors.some(e => e.includes('both allowed_skills')));
assert.ok(validate(['gamma','gamma']).errors.some(e => e.includes('duplicate')));
assert.ok(validate('gamma').errors.some(e => e.includes('must be an array')));
assert.ok(validate(['../gamma']).errors.some(e => e.includes('normalized')));
console.log('Release baseline and routing allow-list validation tests passed');
