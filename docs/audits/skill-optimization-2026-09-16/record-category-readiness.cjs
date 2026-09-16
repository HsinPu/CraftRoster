'use strict';

// Historical author audit of the 16 declared category representatives. This
// packages supplied input only; it does not execute tasks, tools or models.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const ROOT = path.resolve(__dirname, '../../..');
const { buildBundle } = require(path.join(ROOT, 'scripts/prepare-skill-pilot'));
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const read = file => fs.readFileSync(path.join(ROOT, file));
// Human classifications based on the actual task prompts. Capabilities below
// are needed for the requested result, not evidence that a host provides them.
const SCOPE = {
  'workflow-planning': ['code-change-workflow', 'modify-artifact', ['isolated file writes', 'Node regression execution']],
  'software-engineering': ['python-development', 'create-artifact', ['isolated file writes', 'declared Python runtime', 'focused unittest execution']],
  'frontend-design': ['frontend-design', 'create-artifact', ['local HTML/CSS/JavaScript authoring', 'Three.js dependencies', 'browser and responsive verification']],
  'threejs-graphics': ['threejs-development', 'create-artifact', ['React Three Fiber build', 'GLB assets', 'browser/device/XR checks', 'visual regression', 'scoped CDN delivery capability']],
  'backend-data': ['api-contract-design', 'read-only-analysis', ['supplied contract inspection', 'manual compatibility rubric']],
  'ai-llm': ['prompt-engineering', 'text-deliverable', ['manual reusable-prompt rubric']],
  'mobile-desktop': ['app-store-release', 'read-only-analysis', ['supplied receipt inspection', 'manual evidence rubric']],
  'testing-quality': ['pipeline-review', 'text-premise-reasoning', ['manual findings/evidence separation rubric']],
  'security-governance': ['threat-modeling', 'text-deliverable', ['assumption-aware architecture analysis', 'manual threat-model rubric']],
  'cloud-devops': ['deployment-operations', 'read-only-analysis', ['supplied release-record inspection', 'manual scope and evidence rubric']],
  'agent-skill-tooling': ['mcp-creator-design', 'create-artifact', ['installed versioned SDK project', 'official-document retrieval stub', 'concrete server/tool contract', 'isolated TypeScript execution']],
  'browser-automation': ['agent-reach-ops', 'read-only-analysis', ['supplied platform-evidence inspection', 'manual provenance and injection rubric']],
  'media-creative': ['video-production-workflow', 'create-artifact', ['local editable creative artifacts', 'video renderer', 'frame/caption/render verification']],
  'writing-content': ['git-readme-writer', 'text-deliverable', ['supplied package inspection', 'manual factuality and scope rubric']],
  'research-product': ['solution-discovery', 'text-deliverable', ['manual options and decision-boundary rubric']],
  'documents-productivity': ['spreadsheet-ops', 'create-artifact', ['isolated workbook output', 'formula recalculation', 'workbook readback verification']],
};
function buildReadiness() {
  const registryBytes = read('docs/skill-review-registry.json'), registry = JSON.parse(registryBytes);
  assert.deepEqual(registry.category_representatives.map(item => item.category).sort(), Object.keys(SCOPE).sort());
  const cases = registry.category_representatives.map(representative => {
    const [skill, taskForm, requiredCapabilities] = SCOPE[representative.category];
    assert.equal(representative.skill, skill); assert.equal(representative.case_id, 1);
    const corpus = JSON.parse(read(`skills/${skill}/evals/evals.json`)), item = corpus.evals.find(value => value.id === 1);
    const record = { category: representative.category, case_id: `${skill}:1`, task_form: taskForm,
      corpus_case_sha256: sha(JSON.stringify(item)), input_status: null, preparation: null,
      required_capabilities: requiredCapabilities, task_outcome: 'not_run', model_effective: null,
      activation_observed: false, execution_readiness: 'requires_approved_host_and_grading', limitations: [] };
    if (skill === 'mcp-creator-design') {
      assert.equal(item.files?.length || 0, 0);
      record.input_status = 'missing_project_contract_and_versioned_evidence';
      record.execution_readiness = 'missing_inputs';
      record.limitations.push('The prompt refers to an installed SDK and a retrieval capability, but supplies no project/version, tool behavior contract or retrieval response. Do not treat a generic server plan as the requested implementation.');
      return record;
    }
    const hasFiles = !!item.files?.length;
    const bundle = buildBundle({ root: ROOT, skill, caseId: 1, ...(hasFiles ? {} : { textOnly: true }) });
    const prepared = bundle.privateRecord;
    assert.equal(prepared.status, 'not_run');
    const publicText = bundle.publicFiles.map(file => file.bytes.toString('utf8')).join('\n');
    assert(!publicText.includes(item.expected_output)); assert(item.assertions.every(text => !publicText.includes(text)));
    assert(bundle.publicFiles.every(file => !file.path.includes('/evals/')));
    record.input_status = hasFiles ? 'fixture_packaged' : 'self_contained_brief_packaged';
    record.preparation = { mode: prepared.mode, split: prepared.split, fixture_sha256: prepared.fixture_sha256,
      fixture_manifest: prepared.fixture_manifest, runtime_packages: prepared.skill_packages.length,
      runtime_catalog_sha256: prepared.runtime_catalog_sha256, public_files: prepared.public_manifest.length,
      public_bundle_sha256: prepared.public_bundle_sha256, private_oracle_excluded: true };
    if (!hasFiles && taskForm === 'create-artifact') record.limitations.push('Text-only is the input packaging mode. The task still requires created, verified artifacts; a plan or routed outline is not completion.');
    if (skill === 'pipeline-review') record.limitations.push('The prompt supplies the no-defect/missing-evidence premise. This is a text reasoning case, not independent defect discovery in a supplied repository.');
    if (skill === 'threat-modeling') record.limitations.push('The short architecture description supports an assumption-aware model, not validation of a complete real system.');
    if (['app-store-release','deployment-operations'].includes(skill)) record.limitations.push('Passed receipts are authored fictional records, not executed store/device/staging evidence.');
    return record;
  });
  return { schema_version: 1, evaluation_kind: 'offline_category_input_readiness', recorded_at: new Date().toISOString(),
    status: 'not_run', model_calls: 0, classification: 'human audit of task and material requirements; not a model grade',
    runtime: { node: process.version, platform: process.platform, arch: process.arch },
    sources: [
      { path: 'docs/skill-review-registry.json', sha256: sha(registryBytes) },
      { path: 'scripts/prepare-skill-pilot.js', sha256: sha(read('scripts/prepare-skill-pilot.js')) },
      { path: path.relative(ROOT, __filename).replaceAll('\\', '/'), sha256: sha(fs.readFileSync(__filename)) },
    ],
    summary: { categories: cases.length, fixture_packaged: cases.filter(c => c.input_status === 'fixture_packaged').length,
      brief_packaged: cases.filter(c => c.input_status === 'self_contained_brief_packaged').length,
      missing_inputs: cases.filter(c => c.execution_readiness === 'missing_inputs').length, model_task_outcomes: 0 },
    cases,
    limitations: ['Input preparation does not certify runtime availability, isolation, activation or task success.',
      'All cases are development data; no held-out trials ran.',
      'Required capabilities and text-versus-artifact distinctions preserve each original task; they are not execution grants.',
      'There is no new model authorization or separate paid API execution.'] };
}
if (require.main === module) {
  if (process.argv.length !== 2) throw new Error('No arguments supported; this author recorder writes a new historical report only.');
  const report = buildReadiness(), output = path.join(__dirname, 'm4-category-readiness.json');
  fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify({ output, ...report.summary, model_calls: 0 }));
}
module.exports = { buildReadiness };
