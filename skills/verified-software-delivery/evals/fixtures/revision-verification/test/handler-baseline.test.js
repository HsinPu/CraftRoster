'use strict';
const assert = require('node:assert/strict');
const { handleRequest } = require('../src/request-handler');
assert.deepEqual(handleRequest({ method: 'GET', path: '/greet', query: { name: 'Ada' } }), { status: 200, body: 'Hello Ada' });
assert.deepEqual(handleRequest({ method: 'GET', path: '/greet' }), { status: 200, body: 'Hello Guest' });
assert.deepEqual(handleRequest({ method: 'POST', path: '/greet' }), { status: 404, body: 'Not found' });
console.log('Greeting baseline handler checks passed.');
