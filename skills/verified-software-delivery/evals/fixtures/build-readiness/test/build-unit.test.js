'use strict';
const assert = require('node:assert/strict');
const { greet } = require('../artifacts/build-A/handler');
assert.deepEqual(greet('Ada'), { status: 200, body: 'Hello Ada' });
assert.deepEqual(greet('  Ada  '), { status: 200, body: 'Hello Ada' });
assert.deepEqual(greet('   '), { status: 200, body: 'Hello Guest' });
assert.deepEqual(greet(undefined), { status: 200, body: 'Hello Guest' });
console.log('Build A local unit checks passed; no staging request was made.');
