'use strict';
const assert = require('node:assert/strict');
const { selectExpiredRecords } = require('../src/retention');
const records = require('../data/records.json');
const before = JSON.stringify(records);
assert.deepEqual(selectExpiredRecords(records, { retentionDays: 90 }, '2026-09-16T00:00:00.000Z'), ['synthetic-old']);
assert.equal(JSON.stringify(records), before);
console.log('Explicit-duration read-only selection passed.');
