'use strict';
const assert = require('node:assert/strict');
const { createDatabase, migrate } = require('../shared/lab.cjs');
const v2 = require('../shared/app-v2.cjs');
function runOrdinaryChecks(variant) {
  const db = createDatabase();
  try {
    assert.deepEqual(migrate(db, variant), { changed: true });
    assert.deepEqual(v2.get(db, 1), { id: 1, email: 'ada@example.invalid', displayName: 'Ada' });
    v2.rename(db, 2, 'Lin Updated');
    assert.equal(v2.get(db, 2).displayName, 'Lin Updated');
    v2.create(db, 3, 'new@example.invalid', 'New');
    assert.equal(v2.get(db, 3).displayName, 'New');
    assert.deepEqual(migrate(db, variant), { changed: false });
    return { variant, checks: 5, sqlite: db.prepare('SELECT sqlite_version() AS version').get().version };
  } finally { db.close(); }
}
if (require.main === module) console.log(JSON.stringify(runOrdinaryChecks(process.argv[2])));
module.exports = { runOrdinaryChecks };
