'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

// These private checks validate planning-source consistency and example inputs.
// They are not an implementation of document sync or evidence that it was run.
const root = path.resolve(__dirname, '../skills/spec-flow/evals/fixtures/approved-offline-sync');
const read = (relative) => JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));
const originalFiles = {};
function inventory(directory, prefix = '') {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    assert.equal(entry.isSymbolicLink(), false);
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) inventory(path.join(directory, entry.name), relative);
    else originalFiles[relative] = crypto.createHash('sha256').update(fs.readFileSync(path.join(directory, entry.name))).digest('hex');
  }
}
inventory(root);
const data = {
  scenario: read('scenario.json'), open: read('open-decisions.json'),
  sync: read('contracts/sync-policy.json'), compatibility: read('contracts/schema-compatibility.json'),
  telemetry: read('contracts/telemetry-policy.json'), rollout: read('operations/rollout-recovery.json'),
  v1: read('samples/client-store-v1.json'), v2: read('samples/client-store-v2.json'),
  scenarios: read('samples/sync-scenarios.json'), event: read('samples/telemetry-event.json')
};
let passed = 0;
function test(name, fn) { fn(); passed += 1; console.log(`PASS ${name}`); }
function clone(value) { return JSON.parse(JSON.stringify(value)); }
function validateTelemetry(policy, event) {
  assert.deepEqual(Object.keys(event).sort(), [...policy.allowedFields].sort(), 'Telemetry event must contain only the allowed bounded fields');
  assert.equal(policy.additionalFieldsAllowed, false);
  assert.equal(event.eventName, policy.eventName);
  assert.equal(event.eventSchemaVersion, policy.eventSchemaVersion);
  assert.ok(policy.allowedClientMajors.includes(event.clientMajor));
  assert.ok(policy.outcomes.includes(event.outcome), 'Outcome is an enum, not a free-text channel');
  assert.ok(policy.durationBuckets.includes(event.durationBucket), 'Duration is a bucket, not a free-text channel');
}
function validateScenarioInputs(sync, sample) {
  assert.ok(Number.isSafeInteger(sample.server.revision) && sample.server.revision >= 0);
  const seen = new Map();
  for (const request of sample.requests) {
    assert.deepEqual(Object.keys(request).sort(), [...sync.operationFields].sort());
    assert.equal(request.schemaVersion, sync.schemaVersion);
    assert.equal(request.documentId, sample.server.documentId);
    assert.ok(Number.isSafeInteger(request.baseRevision) && request.baseRevision >= 0);
    assert.ok(typeof request.title === 'string' && typeof request.body === 'string');
    assert.ok(typeof request.clientMutationId === 'string' && request.clientMutationId.length > 0);
    if (seen.has(request.clientMutationId)) assert.deepEqual(request, seen.get(request.clientMutationId), 'A retry ID must not carry a different payload');
    else seen.set(request.clientMutationId, request);
  }
  if (sample.newerLocalDraft) {
    const draft = sample.newerLocalDraft;
    assert.ok(seen.has(draft.dependsOnMutationId));
    assert.ok(!seen.has(draft.clientMutationId), 'A newer draft needs an identity distinct from its predecessor');
    assert.notEqual(draft.body, seen.get(draft.dependsOnMutationId).body);
  }
}
function validateCrossReferences(input) {
  const { scenario, open, sync, compatibility, telemetry, rollout } = input;
  assert.equal(scenario.fictional, true);
  assert.equal(scenario.realWorldApproval, false);
  assert.equal(open.scenarioId, scenario.scenarioId);
  const decisions = new Set(scenario.settledDecisions.map((decision) => decision.id));
  assert.equal(decisions.size, scenario.settledDecisions.length);
  for (const contract of [sync, compatibility, telemetry, rollout]) {
    for (const decisionId of contract.decisionIds) assert.ok(decisions.has(decisionId), `Unknown decision ${decisionId}`);
  }
  const unresolved = new Map(open.items.map((item) => [item.id, item]));
  assert.equal(unresolved.size, open.items.length);
  for (const item of open.items) {
    assert.ok(scenario.ownerRoles.includes(item.ownerRole), `Unknown owner role ${item.ownerRole}`);
    assert.ok(item.requiredFor.length > 0);
    assert.ok(item.doesNotPrevent.length > 0);
  }
  for (const reference of telemetry.liveCollectionPrerequisites) assert.ok(unresolved.has(reference), `Unknown prerequisite ${reference}`);
  const retention = open.items.find((item) => item.optionsDays);
  assert.equal(retention.state, 'unresolved');
  assert.equal(retention.selectedDays, null);
  assert.equal(retention.assignedOwner, null);
  assert.equal(telemetry.retentionDays, retention.selectedDays, 'Do not silently turn an unresolved retention choice into a selected value');
  const stageIds = new Set(rollout.stages.map((stage) => stage.id));
  assert.equal(stageIds.size, rollout.stages.length);
  for (const stage of rollout.stages) {
    assert.ok(stage.publicExposurePercent >= 0 && stage.publicExposurePercent <= 100);
    for (const reference of stage.requires.filter((item) => item.startsWith('U-'))) assert.ok(unresolved.has(reference), `Unknown prerequisite ${reference}`);
  }
  const dependencies = new Map(rollout.stages.map((stage) => [stage.id, stage.requires.filter((item) => stageIds.has(item))]));
  function visit(id, active, visited) {
    assert.ok(!active.has(id), `Rollout stage cycle at ${id}`);
    if (visited.has(id)) return;
    active.add(id);
    for (const dependency of dependencies.get(id)) visit(dependency, active, visited);
    active.delete(id);
    visited.add(id);
  }
  const visited = new Set();
  for (const id of stageIds) visit(id, new Set(), visited);
  assert.deepEqual(compatibility.v2.documentFields, compatibility.v1.documentFields);
  assert.deepEqual(sync.documentFields, compatibility.v1.documentFields);
  assert.equal(compatibility.v2.storageNamespace, compatibility.v1.storageNamespace);
  assert.notEqual(compatibility.v2.outboxNamespace, compatibility.v1.storageNamespace);
  assert.equal(compatibility.v2.operationSchemaVersion, sync.schemaVersion);
  assert.equal(compatibility.v1.canReadV2Outbox, rollout.clientRollback.oldClientCanRecoverV2OutboxAlone);
  assert.equal(compatibility.v2OutboxDeletionOnClientDowngradeAllowed, false);
  assert.equal(rollout.clientRollback.preserveV2Namespace, true);
}

test('fixture sources are fictional planning inputs with resolvable decision, owner, and prerequisite references', () => {
  validateCrossReferences(data);
  assert.equal(data.scenario.actualRequestAuthority.localPlanning, true);
  for (const [operation, authorized] of Object.entries(data.scenario.actualRequestAuthority)) if (operation !== 'localPlanning') assert.equal(authorized, false);
  assert.deepEqual(data.scenario.executionsPerformed, []);
  assert.equal(data.rollout.observedResults, null);
  assert.equal(data.rollout.executionAuthorized, false);
  assert.equal(data.scenarios.executionPerformed, false);
  assert.equal(data.telemetry.liveCollectionPerformed, false);
  assert.ok(fs.statSync(path.join(root, 'decision.md')).isFile());
  assert.ok(fs.statSync(path.join(root, 'CONTRACT.md')).isFile());
});

test('planning inputs distinguish valid upload, retry, conflict, and post-send edit situations', () => {
  const cases = new Map(data.scenarios.cases.map((item) => [item.id, item]));
  assert.equal(cases.size, data.scenarios.cases.length);
  for (const item of cases.values()) validateScenarioInputs(data.sync, item);
  const first = cases.get('first-upload');
  assert.equal(first.requests[0].baseRevision, first.server.revision);
  const retry = cases.get('response-lost-and-retry');
  assert.equal(retry.requests.length, 2);
  assert.deepEqual(retry.requests[0], retry.requests[1]);
  const conflict = cases.get('concurrent-server-edit');
  assert.ok(conflict.requests[0].baseRevision < conflict.server.revision);
  assert.notEqual(conflict.requests[0].body, conflict.server.body);
  assert.equal(data.sync.conflict.serverDocumentChanges, false);
  assert.equal(data.sync.conflict.preserveLocalDraft, true);
  assert.equal(data.sync.conflict.preserveServerSnapshot, true);
  assert.equal(data.sync.conflict.automaticMerge, false);
  assert.equal(data.sync.postSendEdits.predecessorReceiptAcknowledgesNewDraft, false);
});

test('changed retry contents and reused post-send identities are detected as inconsistent planning examples', () => {
  const changedRetry = clone(data.scenarios.cases.find((item) => item.id === 'response-lost-and-retry'));
  changedRetry.requests[1].body = 'Different synthetic contents under the same ID';
  assert.throws(() => validateScenarioInputs(data.sync, changedRetry), /retry ID/);
  const changedDraft = clone(data.scenarios.cases.find((item) => item.id === 'edited-after-send'));
  changedDraft.newerLocalDraft.clientMutationId = changedDraft.requests[0].clientMutationId;
  assert.throws(() => validateScenarioInputs(data.sync, changedDraft), /identity distinct/);
});

test('v1/v2 persisted samples preserve old fields and exhibit the unreadable pending-outbox recovery boundary', () => {
  const contract = data.compatibility;
  const oldDocuments = data.v1.namespaces[contract.v1.storageNamespace];
  const currentDocuments = data.v2.namespaces[contract.v2.storageNamespace];
  assert.deepEqual(currentDocuments, oldDocuments);
  for (const document of currentDocuments) {
    assert.deepEqual(Object.keys(document).sort(), [...contract.v1.documentFields].sort());
    assert.ok(Buffer.byteLength(document.title + document.body, 'utf8') <= data.scenario.limits.maxDocumentUtf8Bytes);
  }
  assert.ok(currentDocuments.length <= data.scenario.limits.maxCachedDocuments);
  const pending = data.v2.namespaces[contract.v2.outboxNamespace];
  assert.ok(pending.length > 0);
  assert.equal(data.v1.namespaces[contract.v2.outboxNamespace], undefined);
  for (const request of pending) {
    assert.equal(request.schemaVersion, contract.v2.operationSchemaVersion);
    assert.ok(currentDocuments.some((document) => document.documentId === request.documentId && document.revision === request.baseRevision));
  }
  assert.equal(contract.v1.canReadV2Outbox, false);
  assert.equal(data.rollout.clientRollback.backupBeforeDestructiveRepair, true);
  assert.equal(data.rollout.draftRecovery.inspectCopyBeforeOriginal, true);
  assert.equal(data.rollout.draftRecovery.replayRequiresCurrentPermissionAndRevisionCheck, true);
});

test('proposed telemetry event uses bounded fields and rejects identifier or free-text leakage', () => {
  validateTelemetry(data.telemetry, data.event);
  assert.throws(() => validateTelemetry(data.telemetry, { ...data.event, documentId: 'synthetic-doc-1' }), /allowed bounded fields/);
  assert.throws(() => validateTelemetry(data.telemetry, { ...data.event, body: 'Synthetic private document contents' }), /allowed bounded fields/);
  assert.throws(() => validateTelemetry(data.telemetry, { ...data.event, outcome: 'User document content placed in a string field' }), /not a free-text channel/);
  assert.equal(data.telemetry.localSyntheticValidationRequiresLiveCollection, false);
  assert.equal(data.rollout.draftRecovery.telemetryMayContainRecoveredText, false);
});

test('unresolved dependencies remain specific while independent local resources and excluded later scope remain visible', () => {
  assert.ok(data.scenario.availablePlanningResources.length > 0);
  assert.equal(data.scenario.scenarioLocalWorkAuthority.syntheticImplementationAndTests, true);
  assert.equal(data.scenario.scenarioLocalWorkAuthority.externalOperations, false);
  const environment = data.open.items.find((item) => item.environmentId);
  assert.equal(environment.available, false);
  assert.ok(data.rollout.stages.some((stage) => stage.environment === environment.environmentId && stage.requires.includes(environment.id)));
  const releaseOwner = data.open.items.find((item) => item.ownerRole === 'release commander');
  assert.equal(releaseOwner.assignedOwner, null);
  assert.ok(data.rollout.stages.filter((stage) => stage.publicExposurePercent > 0).some((stage) => stage.requires.includes(releaseOwner.id)));
  for (const future of data.scenario.laterPhaseCandidates) assert.ok(data.scenario.nonGoals.includes(future));
  assert.ok(data.open.items.every((item) => item.doesNotPrevent.length > 0));
});

test('rollout gates require actual observations and preserve compatibility and recovery instead of only waiting seven days', () => {
  const criteria = data.rollout.advanceCriteria;
  assert.ok(criteria.minimumObservationHours > 0 && criteria.minimumObservedSyncAttempts > 0);
  assert.ok(criteria.maxNonConflictErrorRate >= 0 && criteria.maxNonConflictErrorRate < 1);
  assert.equal(criteria.draftLossEvents, 0);
  assert.equal(criteria.duplicateApplyEvents, 0);
  assert.equal(criteria.incorrectAcknowledgementEvents, 0);
  assert.equal(criteria.recoveryRehearsalMustPass, true);
  assert.ok(data.compatibility.minimumRollbackWindowDays > 0);
  assert.ok(data.compatibility.contractionPrerequisites.length > 1);
  assert.equal(data.rollout.schemaContractionRequiresSeparateDecision, true);
  assert.equal(data.rollout.containment.rejectNewUploadsFromAffectedClientVersion, true);
  assert.equal(data.rollout.containment.deletePendingLocalData, false);
  assert.equal(data.rollout.containment.resumeRequiresFixedBuildEvidence, true);
});

test('unknown prerequisites, contradictory recovery claims, guessed retention, and rollout cycles fail consistency checks', () => {
  const unknown = clone(data);
  unknown.rollout.stages[1].requires.push('U-NOT-DEFINED');
  assert.throws(() => validateCrossReferences(unknown), /Unknown prerequisite/);
  const contradictory = clone(data);
  contradictory.rollout.clientRollback.oldClientCanRecoverV2OutboxAlone = true;
  assert.throws(() => validateCrossReferences(contradictory));
  const guessed = clone(data);
  guessed.telemetry.retentionDays = 30;
  assert.throws(() => validateCrossReferences(guessed), /unresolved retention/);
  const cyclic = clone(data);
  cyclic.rollout.stages[0].requires.push(cyclic.rollout.stages.at(-1).id);
  assert.throws(() => validateCrossReferences(cyclic), /Rollout stage cycle/);
});

test('planning-source verification leaves canonical files unchanged', () => {
  for (const [relative, expected] of Object.entries(originalFiles)) {
    assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root, relative))).digest('hex'), expected);
  }
});

test('the declared planning case bundles all public sources and excludes private author checks', () => {
  const { buildBundle } = require('../scripts/prepare-skill-pilot');
  const bundle = buildBundle({ root: path.resolve(__dirname, '..'), skill: 'spec-flow', caseId: 1 });
  assert.deepEqual(bundle.publicFiles.filter(file => file.path.startsWith('workspace/')).map(file => file.path.slice('workspace/'.length)).sort(), Object.keys(originalFiles).sort());
  for (const file of bundle.publicFiles.filter(file => file.path.startsWith('workspace/'))) {
    assert.equal(crypto.createHash('sha256').update(file.bytes).digest('hex'), originalFiles[file.path.slice('workspace/'.length)]);
  }
  assert.ok(bundle.publicFiles.every(file => !file.path.startsWith('tests/') && !file.path.includes('/evals/')));
  assert.equal(bundle.privateRecord.status, 'not_run');
});
console.log(`${passed} planning-fixture consistency checks passed; no product implementation, model execution, or real approval was validated.`);
