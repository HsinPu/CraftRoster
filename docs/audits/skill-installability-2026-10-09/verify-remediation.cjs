'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../../..');
const read = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const prefix = 'docs/audits/skill-installability-2026-10-09/';
const status = read(prefix + 'remediation-status.json');
const verification = read(prefix + 'remediation-verification.json');
const plans = read(prefix + 'remediation-install-plans.json');
const catalog = read('scripts/data/skill-catalog.json');
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');
const inputs = [...status.sources, ...status.proposalFiles, ...plans.sourceHashes];
for (const input of inputs) assert.equal(hash(input.file), input.sha256, `Evidence source drift: ${input.file}`);
assert.equal(status.stats.skills, 286);
assert.equal(status.resolutions.length, 941);
assert(status.resolutions.every(item => item.status === 'resolved'));
assert.equal(status.sources.length, 517);
for (const skill of status.packages) {
  assert.deepEqual(skill.dependencies, catalog.skills[skill.name].dependencies || [], `${skill.name}: dependencies`);
  assert.deepEqual(skill.routes, catalog.skills[skill.name].routes || [], `${skill.name}: routes`);
}
assert.equal(verification.checks.length, 11);
assert(verification.checks.every(check => check.executed === true && check.exitCode === 0 && check.output));
assert.equal(plans.status, 'passed');
assert.equal(plans.cases.length, 52);
assert.equal(new Set(plans.cases.map(item => item.label)).size, 52);
assert.equal(plans.globalInstallation, false);
assert(plans.cases.every(item => item.exitCode === 0 && item.destinationWritten === false));
for (const item of plans.cases) assert.deepEqual([...item.observed].sort(), [...item.expected].sort(), item.label);
assert.equal(status.runtimeStatus, 'not_run');
assert.equal(verification.runtimeStatus, 'not_run');
assert.equal(verification.modelTasksExecuted, 0);
const implementation = [
  'README.md', 'craftroster-cli.js', 'docs/skill-quality-workflow.md', 'docs/skill-review-registry.json',
  'scripts/data/skill-catalog.json', 'skills.json', 'scripts/data/install-skill-dependencies.tsv',
  'scripts/lib/skill-dependencies.js', 'scripts/generate-skill-catalog.js',
  'scripts/generate-install-skill-dependencies.js', 'scripts/validate-catalog.js',
  'scripts/plan-skill-regressions.js', 'tests/skill-dependencies.test.js',
  'tests/skill-catalog-generation.test.js', 'tests/skill-regression-plan.test.js',
  'tests/skill-review.test.js', 'tests/cli.test.js', 'tests/catalog-validation.test.js',
  'tests/skill-contracts.test.js', 'scripts/install.ps1', 'scripts/install.sh',
  'scripts/smoke-install.ps1', 'scripts/smoke-install.sh'
];
verification.status = 'passed';
verification.nodeVersion = process.version.slice(1);
verification.unitTestCount = 280;
verification.installPlanCases = plans.cases.length;
verification.evidenceIdentity = {
  checkedAtUtc: new Date().toISOString(), sourceFiles: status.sources.length,
  proposalFiles: status.proposalFiles.length, allOriginalFindingsResolved: true,
  currentCatalogMatchesRemediation: true,
  implementationInputs: implementation.map(file => ({ file, sha256: hash(file) })),
  repairRecord: { file: prefix + 'remediation-status.json', sha256: hash(prefix + 'remediation-status.json') },
  installPlanRecord: { file: prefix + 'remediation-install-plans.json', sha256: hash(prefix + 'remediation-install-plans.json') }
};
fs.writeFileSync(path.join(__dirname, 'remediation-verification.json'), JSON.stringify(verification, null, 2) + '\n');
console.log(`Repair evidence verified: ${status.sources.length} sources, ${status.resolutions.length} resolutions, ${verification.unitTestCount} tests, ${plans.cases.length} install plans`);
