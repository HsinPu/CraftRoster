'use strict';
const assert = require('node:assert/strict');
const { greeting } = require('../src/greeting');
assert.equal(greeting({ firstName: ' Ada ', lastName: ' Lovelace ' }), 'Hello, Ada Lovelace!');
assert.equal(greeting({ firstName: ' ', lastName: 12 }), 'Hello, Guest!');
assert.equal(greeting(), 'Hello, Guest!');
console.log('Greeting caller behavior tests passed.');
