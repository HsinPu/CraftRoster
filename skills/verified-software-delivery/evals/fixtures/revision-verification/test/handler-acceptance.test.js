'use strict';
const assert = require('node:assert/strict');
const { handleRequest } = require('../src/request-handler');
assert.deepEqual(handleRequest({ method: 'GET', path: '/greet', query: { name: '  Ada  ' } }), { status: 200, body: 'Hello Ada' });
assert.deepEqual(handleRequest({ method: 'GET', path: '/greet', query: { name: '   ' } }), { status: 200, body: 'Hello Guest' });
console.log('R2 normalized-name handler acceptance passed.');
