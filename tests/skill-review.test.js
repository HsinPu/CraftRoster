const fs = require('fs');
const path = require('path');
const os = require('os');
const assert = require('assert');
const { validate, sha256 } = require('../scripts/validate-skill-review');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'craftroster-skill-review-'));
try {
  fs.mkdirSync(path.join(temp, 'skills/alpha/evals'), { recursive: true });
  fs.writeFileSync(path.join(temp, 'skills/alpha/SKILL.md'), 'example');
  fs.writeFileSync(path.join(temp, 'skills/alpha/evals/evals.json'), JSON.stringify({ evals: [{ id: 1 }] }));
  fs.writeFileSync(path.join(temp, 'skills.json'), JSON.stringify({ skills: [{ name: 'alpha', category: 'one' }], categories: [{ id: 'one' }] }));
  const registry = { schema_version: 1, entry_hash_normalization: 'utf8-lf', baseline_commit: 'a'.repeat(40), skills: [{ name: 'alpha', category: 'one', decision: 'defer', review_depth: 'inventory-only', reason: 'Inventory reviewed; semantics pending.', next_action: 'Add a controlled task fixture.', runtime_status: 'not_run', entry_sha256: sha256('example') }], category_representatives: [{ category: 'one', skill: 'alpha', case_id: 1, status: 'definition_only' }] };
  assert.deepStrictEqual(validate(temp, registry), []);
  assert.strictEqual(sha256('a\r\nb\r\n'), sha256('a\nb\n'));
  const cases = [
    [r => { r.skills = []; }, /Missing review/],
    [r => r.skills.push(r.skills[0]), /Duplicate/],
    [r => { r.skills[0].entry_sha256 = '0'.repeat(64); }, /changed since review/],
    [r => { r.skills[0].decision = 'keep'; }, /inventory alone/],
    [r => { r.skills[0].runtime_status = 'passed'; }, /must not claim/],
    [r => { r.category_representatives = []; }, /Missing representative/],
    [r => { r.category_representatives[0].case_id = 999; }, /does not exist/],
    [r => { r.category_representatives[0].status = 'passed'; }, /separate run artifact/]
  ];
  for (const [mutate, pattern] of cases) {
    const candidate = structuredClone(registry); mutate(candidate);
    assert.match(validate(temp, candidate).join('\n'), pattern);
  }
  const candidate = structuredClone(registry);
  candidate.category_representatives[0].skill = '../../outside';
  const originalExists = fs.existsSync;
  let outsideAccess = false;
  fs.existsSync = (file) => { if (String(file).includes('outside')) outsideAccess = true; return originalExists(file); };
  try { assert.match(validate(temp, candidate).join('\n'), /belong to category/); }
  finally { fs.existsSync = originalExists; }
  assert.strictEqual(outsideAccess, false, 'invalid representative must be rejected before filesystem access');
  const pilot = structuredClone(registry); pilot.pilot_skills = ['alpha'];
  assert.match(validate(temp, pilot).join('\n'), /pilot needs output and routing/);
  fs.writeFileSync(path.join(temp, 'skills/alpha/evals/routing.json'), JSON.stringify({ cases: [] }));
  assert.match(validate(temp, pilot).join('\n'), /at least 6 output and 7 routing/);
  pilot.pilot_skills = ['../../outside'];
  assert.match(validate(temp, pilot).join('\n'), /Unknown pilot/);
  const originalRealpath = fs.realpathSync;
  fs.realpathSync = file => String(file).endsWith(path.join('evals', 'evals.json'))
    ? path.join(os.tmpdir(), 'outside', 'evals.json') : originalRealpath(file);
  try { assert.match(validate(temp, registry).join('\n'), /must stay within/); }
  finally { fs.realpathSync = originalRealpath; }
  const locales = ['en', 'zh-TW', 'mixed-zh-TW-en'];
  const localizedPilot = structuredClone(registry); localizedPilot.pilot_skills = ['alpha'];
  const outputs = Array.from({ length: 6 }, (_, index) => ({ id: index + 1, locale: locales[index % 3] }));
  const routes = Array.from({ length: 7 }, (_, index) => ({ kind: index < 2 ? 'positive' : index < 4 ? 'near_match' : 'negative', locale: locales[index % 3] }));
  fs.writeFileSync(path.join(temp, 'skills/alpha/evals/evals.json'), JSON.stringify({ evals: outputs }));
  fs.writeFileSync(path.join(temp, 'skills/alpha/evals/routing.json'), JSON.stringify({ cases: routes }));
  assert.deepStrictEqual(validate(temp, localizedPilot), []);
  routes.forEach(item => { item.locale = 'en'; });
  fs.writeFileSync(path.join(temp, 'skills/alpha/evals/routing.json'), JSON.stringify({ cases: routes }));
  assert.match(validate(temp, localizedPilot).join('\n'), /pilot routing lacks zh-TW/);
  console.log('Skill review registry tests passed: 16');
} finally {
  const resolved = path.resolve(temp);
  if (path.dirname(resolved) !== path.resolve(os.tmpdir()) || !path.basename(resolved).startsWith('craftroster-skill-review-')) throw new Error('Unsafe fixture cleanup');
  fs.rmSync(resolved, { recursive: true, force: true });
}
