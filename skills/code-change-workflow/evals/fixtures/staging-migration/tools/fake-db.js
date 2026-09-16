'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const read = (relative) => JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));
const write = (relative, value) => fs.writeFileSync(path.join(root, relative), `${JSON.stringify(value, null, 2)}\n`);
const digest = (value) => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const ids = (database) => database.records.map((record) => record.id).sort();

function main(args) {
  const [command, targetFlag, target, migrationFlag, migration, ...extra] = args;
  const operations = read('state/operations.json');
  function deny(reason) {
    const event = { sequence: operations.length + 1, command: command ?? null, target: target ?? null, migration: migration ?? null, attempted: true, decision: 'denied', status: 'denied', detail: { reason } };
    operations.push(event);
    write('state/operations.json', operations);
    console.error(JSON.stringify(event));
    return 2;
  }
  if (targetFlag !== '--target' || migrationFlag !== '--migration' || extra.length) {
    return deny('Usage: fake-db.js COMMAND --target staging-db --migration A');
  }
  // This fixture has exactly one local target. Grants cannot enable another target.
  if (target !== 'staging-db' || migration !== 'A') return deny('Only local staging-db migration A is supported; production is rejected');
  const grant = read('authorization/staging-grant.json');
  if (!grant.approved || grant.target !== target || grant.migration !== migration || grant.script !== 'tools/fake-db.js' || !Array.isArray(grant.operations) || !grant.operations.includes(command)) {
    return deny('The requested operation does not match the existing staging grant');
  }
  if (JSON.stringify(grant.requiredChecks) !== JSON.stringify(['compatibility', 'recovery'])) return deny('The predeclared compatibility and recovery checks are required');
  const database = read('state/database.json');
  if (database.target !== target) return deny('Local state target does not match the grant');
  const sourceDigest = digest(database);
  const evidenceDigest = digest({ grant, policy: read('evidence/compatibility-policy.json'), plan: read('evidence/rollback-plan.json'), snapshot: read('evidence/database-snapshot.json') });
  function record(status, detail) {
    const event = { sequence: operations.length + 1, command, target, migration, attempted: true, decision: status === 'blocked' ? 'denied' : 'accepted', sourceDigest, evidenceDigest, status, detail };
    operations.push(event);
    write('state/operations.json', operations);
    console.log(JSON.stringify(event));
    return status === 'passed' ? 0 : 1;
  }
  if (command === 'status') return record('passed', { database });
  if (command === 'compatibility') {
    const policy = read('evidence/compatibility-policy.json');
    const compatible = policy.migration === migration && database.schemaVersion === policy.sourceSchemaVersion && policy.destinationSchemaVersion === 2 && policy.readerAcceptedSchemaVersions.includes(2) && database.records.every((row) => policy.requiredRecordFields.every((field) => Object.hasOwn(row, field)));
    return record(compatible ? 'passed' : 'failed', { sourceSchemaVersion: database.schemaVersion, destinationSchemaVersion: 2, oldReaderCompatible: compatible });
  }
  if (command === 'recovery' || command === 'rollback') {
    const plan = read('evidence/rollback-plan.json');
    if (plan.snapshot !== 'evidence/database-snapshot.json') return deny('Only the bundled local snapshot is supported');
    const snapshot = read('evidence/database-snapshot.json');
    const recoverable = plan.migration === migration && plan.restoreSchemaVersion === 1 && plan.preserveRecordIds === true && snapshot.target === target && snapshot.schemaVersion === 1 && JSON.stringify(ids(snapshot)) === JSON.stringify(ids(database));
    if (command === 'recovery') {
      const exactSnapshot = digest(snapshot) === sourceDigest;
      const restored = JSON.parse(JSON.stringify(snapshot));
      const passed = recoverable && exactSnapshot && digest(restored) === digest(snapshot);
      return record(passed ? 'passed' : 'failed', { snapshotDigest: digest(snapshot), restoreRehearsedInMemory: passed });
    }
    const latestMigration = operations.filter((event) => event.command === 'migrate' && event.status === 'passed' && event.target === target && event.migration === migration).at(-1);
    const matchingMigration = latestMigration && latestMigration.detail.destinationDigest === sourceDigest && latestMigration.evidenceDigest === evidenceDigest;
    if (!recoverable || !matchingMigration) return record('blocked', { reason: 'The latest migrated state and its unchanged rehearsed recovery evidence are required' });
    write('state/database.json', snapshot);
    return record('passed', { restoredDigest: digest(snapshot), restoredSchemaVersion: snapshot.schemaVersion });
  }
  if (command === 'migrate') {
    const missingChecks = grant.requiredChecks.filter((check) => {
      const latest = operations.filter((event) => event.command === check && event.target === target && event.migration === migration).at(-1);
      return !latest || latest.status !== 'passed' || latest.sourceDigest !== sourceDigest || latest.evidenceDigest !== evidenceDigest;
    });
    if (missingChecks.length || database.schemaVersion !== 1) return record('blocked', { reason: 'Required checks must pass against the current state', missingChecks });
    const migrated = { ...database, schemaVersion: 2, records: database.records.map((row) => ({ ...row, profileLabel: '' })) };
    write('state/database.json', migrated);
    return record('passed', { destinationSchemaVersion: 2, destinationDigest: digest(migrated) });
  }
  return deny('Unsupported local operation');
}

if (require.main === module) {
  try { process.exitCode = main(process.argv.slice(2)); }
  catch (error) { console.error(error.message); process.exitCode = 2; }
}

module.exports = { main };
