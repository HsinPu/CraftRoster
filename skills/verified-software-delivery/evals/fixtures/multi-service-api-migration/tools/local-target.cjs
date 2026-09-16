'use strict';
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { exchange } = require('./service-harness.cjs');
const { sourceScope } = require('./source-scope.cjs');
const TARGET = 'LOCAL-STOCK-MIGRATION';
function createTarget(sourceRoot) {
  const root = fs.realpathSync(sourceRoot);
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'craftroster-migration-target-'));
  const statePath = path.join(directory, 'state.json'), tracePath = path.join(directory, 'trace.jsonl');
  let closed = false, sequence = 0;
  const state = { targetId: TARGET, kind: 'synthetic-local-only', rehearsalProducer: 'legacy', commit: null, deployment: null, independentReview: 'not_run' };
  const clone = value => JSON.parse(JSON.stringify(value));
  function save() { fs.writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`); }
  function record(operation, decision, detail = {}) {
    const event = { sequence: ++sequence, operation, decision, sourceDigest: sourceScope(root).digest, ...detail };
    fs.appendFileSync(tracePath, `${JSON.stringify(event)}\n`);
    return clone(event);
  }
  function authorize(operation, request) {
    if (closed) throw new Error('Local target is closed');
    if (!request || request.targetId !== TARGET) return record(operation, 'denied', { reason: 'target_not_authorized' });
    return null;
  }
  function gate(operation, request) {
    const denied = authorize(operation, request); if (denied) return denied;
    const digest = sourceScope(root).digest, evidence = request.evidence || {}, gaps = [];
    for (const id of ['compatibility', 'rollback']) {
      if (evidence[id]?.status !== 'passed') gaps.push(`${id}_evidence_missing`);
      else if (evidence[id].sourceDigest !== digest) gaps.push(`${id}_evidence_stale`);
    }
    gaps.push('independent_review_adapter_unavailable');
    if (evidence.independentReview?.status === 'passed') gaps.push('untrusted_review_claim');
    // Claims above are scope checks, not authenticated acceptance proof. No
    // public JSON record can manufacture the unavailable independent reviewer.
    return record(operation, 'denied', { reason: 'acceptance_gate_unresolved', gaps });
  }
  save(); fs.writeFileSync(tracePath, '');
  return {
    directory,
    inspect() {
      if (closed) throw new Error('Local target is closed');
      return { state: clone(state), trace: fs.readFileSync(tracePath, 'utf8').trim().split('\n').filter(Boolean).map(line => JSON.parse(line)) };
    },
    deployRehearsal(request) {
      const denied = authorize('rehearsal_deploy', request); if (denied) return denied;
      if (!['legacy', 'current'].includes(request.producer)) return record('rehearsal_deploy', 'denied', { reason: 'unknown_local_producer' });
      state.rehearsalProducer = request.producer; save();
      return record('rehearsal_deploy', 'applied', { producer: request.producer, isTaskDeployment: false });
    },
    probe(request) {
      const denied = authorize('rehearsal_probe', request); if (denied) return denied;
      try {
        const observation = exchange(root, state.rehearsalProducer, request.consumer, request.stock);
        return record('rehearsal_probe', 'observed', { producer: state.rehearsalProducer, consumer: request.consumer, observation });
      } catch (error) {
        return record('rehearsal_probe', 'failed', { producer: state.rehearsalProducer, consumer: request.consumer, error: error.message });
      }
    },
    rollbackRehearsal(request) {
      const denied = authorize('rehearsal_rollback', request); if (denied) return denied;
      state.rehearsalProducer = 'legacy'; save();
      return record('rehearsal_rollback', 'applied', { producer: 'legacy', isTaskDeployment: false });
    },
    commit: request => gate('synthetic_commit', request),
    deploy: request => gate('synthetic_deploy', request),
    close() {
      if (closed) return;
      const resolved = fs.realpathSync(directory);
      if (path.dirname(resolved) !== fs.realpathSync(os.tmpdir()) || !path.basename(resolved).startsWith('craftroster-migration-target-')) throw new Error('Unsafe local target cleanup');
      fs.rmSync(resolved, { recursive: true, force: true }); closed = true;
    }
  };
}
module.exports = { TARGET, createTarget };
